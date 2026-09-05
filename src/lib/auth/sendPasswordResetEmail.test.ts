import { describe, expect, it, vi } from "vitest";
import { MockEmailProvider } from "@/lib/notifications/MockEmailProvider";
import { EmailDeliveryNotConfiguredError } from "@/lib/auth/transactionalEmail";
import { sendPasswordResetEmail } from "@/lib/auth/sendPasswordResetEmail";

describe("sendPasswordResetEmail", () => {
  it("rewrites the Firebase link and emails it without returning the URL", async () => {
    const send = vi.fn(async () => {});
    await sendPasswordResetEmail({
      email: "alex@example.com",
      appOrigin: "https://regi-90502049802.us-central1.run.app",
      emailProvider: { send },
      generateLink: async (email, continueUrl) => {
        expect(email).toBe("alex@example.com");
        expect(continueUrl).toBe(
          "https://regi-90502049802.us-central1.run.app/login",
        );
        return "https://regi-app-v1.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=secret-oob&apiKey=dead";
      },
    });

    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0];
    expect(message.to).toBe("alex@example.com");
    expect(message.subject).toMatch(/reset your regi password/i);
    expect(message.text).toContain(
      "https://regi-90502049802.us-central1.run.app/auth/action?mode=resetPassword&oobCode=secret-oob&apiKey=dead",
    );
    expect(message.html).toContain(
      "/auth/action?mode=resetPassword&oobCode=secret-oob",
    );
    expect(JSON.stringify(message)).not.toContain("firebaseapp.com/__/auth/action");
  });

  it("does not send when Firebase has no user for that email", async () => {
    const send = vi.fn(async () => {});
    await sendPasswordResetEmail({
      email: "nobody@example.com",
      appOrigin: "https://regi-90502049802.us-central1.run.app",
      emailProvider: { send },
      generateLink: async () => {
        const err = new Error("There is no user record corresponding to this identifier.");
        (err as Error & { code: string }).code = "auth/user-not-found";
        throw err;
      },
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("does not send when Firebase omits the oob link for unknown emails", async () => {
    const send = vi.fn(async () => {});
    await sendPasswordResetEmail({
      email: "nobody@example.com",
      appOrigin: "https://regi-90502049802.us-central1.run.app",
      emailProvider: { send },
      generateLink: async () => {
        const err = new Error(
          "INTERNAL ASSERT FAILED: Unable to create the email action link",
        );
        (err as Error & { code: string }).code = "auth/internal-error";
        throw err;
      },
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses mock delivery in production", async () => {
    await expect(
      sendPasswordResetEmail({
        email: "alex@example.com",
        appOrigin: "https://regi-90502049802.us-central1.run.app",
        emailProvider: new MockEmailProvider(),
        nodeEnv: "production",
        generateLink: async () => {
          throw new Error("should not generate a link");
        },
      }),
    ).rejects.toBeInstanceOf(EmailDeliveryNotConfiguredError);
  });
});
