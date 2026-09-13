import { describe, expect, it } from "vitest";
import { metadata as login } from "@/app/(auth)/login/page";
import { metadata as signup } from "@/app/(auth)/signup/page";
import { metadata as forgotPassword } from "@/app/(auth)/forgot-password/page";
import { metadata as dashboard } from "@/app/(app)/dashboard/page";
import { metadata as garage } from "@/app/(app)/garage/page";
import { metadata as renewals } from "@/app/(app)/renewals/page";
import { metadata as settings } from "@/app/(app)/settings/page";
import { metadata as documents } from "@/app/(app)/documents/page";
import { metadata as admin } from "@/app/admin/page";
import { metadata as adminQueue } from "@/app/admin/renewals/page";
import { metadata as emailAction } from "@/app/auth/action/page";
import { metadata as privacy } from "@/app/privacy/page";
import { metadata as support } from "@/app/support/page";
import { metadata as terms } from "@/app/terms/page";

function absoluteTitle(metadata: { title?: unknown }): string {
  const title = metadata.title;
  if (
    title &&
    typeof title === "object" &&
    "absolute" in title &&
    typeof title.absolute === "string"
  ) {
    return title.absolute;
  }
  throw new Error(`expected absolute title, got ${JSON.stringify(title)}`);
}

describe("route document titles", () => {
  it("gives each key public and app route a distinct Page · REGI title", () => {
    expect(absoluteTitle(login)).toBe("Login · REGI");
    expect(absoluteTitle(signup)).toBe("Sign up · REGI");
    expect(absoluteTitle(forgotPassword)).toBe("Forgot password · REGI");
    expect(absoluteTitle(dashboard)).toBe("Dashboard · REGI");
    expect(absoluteTitle(garage)).toBe("Garage · REGI");
    expect(absoluteTitle(renewals)).toBe("Renewals · REGI");
    expect(absoluteTitle(settings)).toBe("Settings · REGI");
    expect(absoluteTitle(documents)).toBe("Documents · REGI");
    expect(absoluteTitle(admin)).toBe("Admin · REGI");
    expect(absoluteTitle(adminQueue)).toBe("Admin queue · REGI");
    expect(absoluteTitle(emailAction)).toBe("Email confirmation · REGI");
    expect(absoluteTitle(privacy)).toBe("Privacy Policy · REGI");
    expect(absoluteTitle(support)).toBe("Support · REGI");
    expect(absoluteTitle(terms)).toBe("Terms of Use · REGI");
  });
});
