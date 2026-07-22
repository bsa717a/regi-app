export type PushMessage = {
  /** App user id — used to look up registered device tokens when `tokens`/`token` omitted. */
  userId?: string;
  /** Single FCM device token override. */
  token?: string;
  /** Explicit multicast token list (preferred when known). */
  tokens?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
};

export interface PushProvider {
  send(message: PushMessage): Promise<void>;
}
