import { getMessaging } from "firebase-admin/messaging";
import { getFirebaseAdminApp } from "@/lib/firebase/admin";
import {
  isInvalidFcmTokenError,
  listPushTokensForUser,
  pruneInvalidPushTokens,
  type PushTokenStore,
} from "@/lib/push/tokens";
import type { PushMessage, PushProvider } from "./PushProvider";

export type FcmPushProviderDeps = {
  /** Injected for tests — defaults to Admin SDK messaging. */
  sendMulticast?: (args: {
    tokens: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
  }) => Promise<{
    responses: Array<{ success: boolean; error?: { code?: string } }>;
  }>;
  listTokens?: (userId: string) => Promise<string[]>;
  pruneTokens?: (tokens: string[]) => Promise<number>;
  /** When false, provider no-ops (Admin messaging unavailable). */
  messagingAvailable?: boolean;
  db?: PushTokenStore;
};

function resolveTokens(message: PushMessage): string[] {
  if (message.tokens && message.tokens.length > 0) {
    return [...new Set(message.tokens.filter(Boolean))];
  }
  if (message.token) {
    return [message.token];
  }
  return [];
}

/**
 * Real FCM web-push sender via Admin SDK `sendEachForMulticast`.
 * No-ops when messaging is unavailable or the user has no tokens.
 * Prunes invalid/unregistered tokens after failed sends.
 */
export class FcmPushProvider implements PushProvider {
  constructor(private readonly deps: FcmPushProviderDeps = {}) {}

  async send(message: PushMessage): Promise<void> {
    const messagingAvailable = this.deps.messagingAvailable ?? true;
    if (!messagingAvailable) {
      return;
    }

    let tokens = resolveTokens(message);

    if (tokens.length === 0 && message.userId) {
      const list =
        this.deps.listTokens ??
        ((userId: string) => listPushTokensForUser(userId, this.deps.db));
      tokens = await list(message.userId);
    }

    if (tokens.length === 0) {
      return;
    }

    const sendMulticast =
      this.deps.sendMulticast ?? defaultSendMulticast;

    const invalid: string[] = [];

    // FCM multicast limit is 500 tokens per call.
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      try {
        const result = await sendMulticast({
          tokens: batch,
          title: message.title,
          body: message.body,
          data: message.data,
        });

        result.responses.forEach((response, index) => {
          if (!response.success && isInvalidFcmTokenError(response.error?.code)) {
            const bad = batch[index];
            if (bad) invalid.push(bad);
          }
        });
      } catch {
        // Batch failed — continue remaining batches; do not crash the tick.
      }
    }

    if (invalid.length > 0) {
      const prune =
        this.deps.pruneTokens ??
        ((list: string[]) => pruneInvalidPushTokens(list, this.deps.db));
      await prune(invalid);
    }
  }
}

async function defaultSendMulticast(args: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  const messaging = getMessaging(getFirebaseAdminApp());
  return messaging.sendEachForMulticast({
    tokens: args.tokens,
    notification: {
      title: args.title,
      body: args.body,
    },
    data: args.data,
    webpush: {
      notification: {
        title: args.title,
        body: args.body,
        icon: "/icons/icon-192.png",
      },
      fcmOptions: {
        link: "/",
      },
    },
  });
}

/** Factory — returns FCM provider, or no-op-capable instance when Admin init fails later. */
export function createFcmPushProvider(
  deps?: FcmPushProviderDeps,
): FcmPushProvider {
  return new FcmPushProvider(deps);
}
