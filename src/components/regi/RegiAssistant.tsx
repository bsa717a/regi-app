"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ApiError,
  bootstrapRegiChat,
  getRegiChat,
  sendRegiChatMessage,
} from "@/lib/api/client";
import {
  REGI_AVATAR_CYCLE_MS,
  REGI_AVATAR_IMAGES,
} from "@/lib/regi/constants";
import type { RegiChatMessageDto } from "@/lib/regi/types";
import { RegiAvatar } from "@/components/regi/RegiAvatar";

export function RegiAssistant() {
  const { idToken, getIdToken, user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [messages, setMessages] = useState<RegiChatMessageDto[]>([]);
  const [quickActions, setQuickActions] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAvatarIndex((index) => (index + 1) % REGI_AVATAR_IMAGES.length);
    }, REGI_AVATAR_CYCLE_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [open, messages, sending]);

  const loadChat = useCallback(async () => {
    const token = idToken ?? (await getIdToken());
    if (!token) return;

    setLoadingChat(true);
    setError(null);
    try {
      const data = await getRegiChat(token);
      setMessages(data.messages);
      setQuickActions(data.quickActions);

      if (data.messages.length === 0 && !bootstrappedRef.current) {
        bootstrappedRef.current = true;
        const boot = await bootstrapRegiChat(token);
        setMessages(boot.messages);
        setQuickActions(boot.quickActions);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load chat with Regi.",
      );
    } finally {
      setLoadingChat(false);
    }
  }, [getIdToken, idToken]);

  useEffect(() => {
    if (!open || loading || !user) return;
    void loadChat();
  }, [open, loading, user, loadChat]);

  async function submitMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const token = idToken ?? (await getIdToken());
    if (!token) {
      setError("Please sign in again.");
      return;
    }

    setSending(true);
    setError(null);
    setDraft("");

    const optimistic: RegiChatMessageDto = {
      id: `pending-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const data = await sendRegiChatMessage(token, trimmed);
      setMessages(data.messages);
      setQuickActions(data.quickActions);
    } catch (err) {
      setMessages((prev) => prev.filter((msg) => msg.id !== optimistic.id));
      setDraft(trimmed);
      setError(
        err instanceof ApiError ? err.message : "Regi couldn't send that.",
      );
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitMessage(draft);
  }

  if (loading || !user) return null;

  const avatarSrc = REGI_AVATAR_IMAGES[avatarIndex];

  return (
    <>
      {!open ? (
        <button
          type="button"
          aria-label="Chat with Regi"
          onClick={() => setOpen(true)}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:right-6"
        >
          <RegiAvatar src={avatarSrc} size="float" />
        </button>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="regi-chat-title"
          onClick={(event) => {
            if (event.target === event.currentTarget && !sending) setOpen(false);
          }}
        >
          <div className="flex h-[min(860px,94vh)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <RegiChatHeader
              avatarSrc={avatarSrc}
              onClose={() => setOpen(false)}
              disabled={sending}
            />

            <div
              ref={scrollRef}
              className="min-h-[28rem] flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4"
            >
              {loadingChat ? (
                <p className="text-sm text-slate-500">Loading your garage…</p>
              ) : null}

              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} />
              ))}

              {sending ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200/80">
                    Regi is typing…
                  </div>
                </div>
              ) : null}

              {error ? (
                <p className="text-sm text-rose-700" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            {quickActions.length > 0 ? (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-4 py-3">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    disabled={sending || loadingChat}
                    onClick={() => void submitMessage(action)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
                  >
                    {action}
                  </button>
                ))}
              </div>
            ) : null}

            <form
              onSubmit={handleSubmit}
              className="border-t border-slate-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <div className="flex items-end gap-2">
                <label htmlFor="regi-chat-input" className="sr-only">
                  Message Regi
                </label>
                <textarea
                  id="regi-chat-input"
                  rows={1}
                  value={draft}
                  disabled={sending || loadingChat}
                  placeholder="Message Regi…"
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submitMessage(draft);
                    }
                  }}
                  className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                />
                <button
                  type="submit"
                  disabled={sending || loadingChat || !draft.trim()}
                  aria-label="Send message"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
                >
                  <SendIcon />
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RegiChatHeader({
  avatarSrc,
  onClose,
  disabled,
}: {
  avatarSrc: string;
  onClose: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4">
      <RegiAvatar src={avatarSrc} size="sm" />
      <div className="min-w-0 flex-1">
        <h2
          id="regi-chat-title"
          className="text-base font-semibold tracking-tight text-slate-900"
        >
          Regi
        </h2>
        <p className="text-sm text-slate-500">Ask about your garage</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        aria-label="Close chat"
        className="rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
      >
        Close
      </button>
    </div>
  );
}

function ChatBubble({ message }: { message: RegiChatMessageDto }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap px-4 py-3 text-[0.95rem] leading-relaxed shadow-sm ${
          isUser
            ? "rounded-2xl rounded-br-md bg-teal-700 text-white"
            : "rounded-2xl rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200/80"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="stroke-current"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </svg>
  );
}
