import type { PushProvider } from "./PushProvider";

/**
 * Explicit no-op push sender (set NOTIFICATION_PUSH_PROVIDER=noop).
 * Production uses FcmPushProvider; this keeps reminder dispatch unblocked in tests.
 */
export class NoOpPushProvider implements PushProvider {
  async send(): Promise<void> {
    // Intentionally no-op.
  }
}
