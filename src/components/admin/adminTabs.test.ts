import { describe, expect, it } from "vitest";
import { adminTabHref, parseAdminTab } from "./adminTabs";

describe("parseAdminTab", () => {
  it("defaults to users", () => {
    expect(parseAdminTab(null)).toBe("users");
    expect(parseAdminTab("nope")).toBe("users");
  });

  it("accepts known tabs", () => {
    expect(parseAdminTab("ops")).toBe("ops");
    expect(parseAdminTab("queue")).toBe("queue");
    expect(parseAdminTab("search")).toBe("search");
  });
});

describe("adminTabHref", () => {
  it("omits the default users tab from the query", () => {
    expect(adminTabHref("users")).toBe("/admin");
  });

  it("includes other tabs and extra filters", () => {
    expect(adminTabHref("queue")).toBe("/admin?tab=queue");
    expect(adminTabHref("queue", { status: "Requested" })).toBe(
      "/admin?tab=queue&status=Requested",
    );
  });
});
