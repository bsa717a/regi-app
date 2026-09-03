import { describe, expect, it, vi } from "vitest";
import { MockEmailProvider } from "@/lib/notifications/MockEmailProvider";
import {
  EmailDeliveryNotConfiguredError,
  sendVerificationEmail,
} from "@/lib/auth/sendVerificationEmail";

describe("sendVerificationEmail", () => {
  it("rewrites the Firebase link and emails it without returning the URL", async () => {
    const send = vi.fn(async () => {});
    await sendVerificationEmail({
      email: "alex@example.com",
      appOrigin: "https://regi-90502049802.us-central1.run.app",
      emailProvider: { send },
      generateLink: async (email, continueUrl) => {
        expect(email).toBe("alex@example.com");
        expect(continueUrl).toBe(
          "https://regi-90502049802.us-central1.run.app/garage",
        );
        return "https://regi-app-v1.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=secret-oob&apiKey=dead";
      },
    });

    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0];
    expect(message.to).toBe("alex@example.com");
    expect(message.subject).toMatch(/confirm your email/i);
    expect(message.text).toContain(
      "https://regi-90502049802.us-central1.run.app/auth/action?mode=verifyEmail&oobCode=secret-oob&apiKey=dead",
    );
    expect(message.html).toContain("/auth/action?mode=verifyEmail&oobCode=secret-oob");
    expect(JSON.stringify(message)).not.toContain("firebaseapp.com/__/auth/action");
  });

  it("refuses mock delivery in production", async () => {
    await expect(
      sendVerificationEmail({
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
