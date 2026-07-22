import { describe, expect, it, vi } from "vitest";
import { FcmPushProvider } from "./FcmPushProvider";

describe("FcmPushProvider", () => {
  it("no-ops when messaging is unavailable", async () => {
    const sendMulticast = vi.fn();
    const provider = new FcmPushProvider({
      messagingAvailable: false,
      sendMulticast,
    });

    await provider.send({
      userId: "u1",
      title: "Hi",
      body: "Body",
      tokens: ["tok-1"],
    });

    expect(sendMulticast).not.toHaveBeenCalled();
  });

  it("no-ops when there are no tokens", async () => {
    const sendMulticast = vi.fn();
    const provider = new FcmPushProvider({
      sendMulticast,
      listTokens: async () => [],
    });

    await provider.send({
      userId: "u1",
      title: "Hi",
      body: "Body",
    });

    expect(sendMulticast).not.toHaveBeenCalled();
  });

  it("sends multicast and prunes invalid tokens", async () => {
    const pruneTokens = vi.fn(async () => 1);
    const sendMulticast = vi.fn(async () => ({
      responses: [
        { success: true },
        {
          success: false,
          error: { code: "messaging/registration-token-not-registered" },
        },
      ],
    }));

    const provider = new FcmPushProvider({
      sendMulticast,
      pruneTokens,
    });

    await provider.send({
      title: "Sticker check",
      body: "43 days left",
      tokens: ["good", "bad"],
    });

    expect(sendMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ["good", "bad"],
        title: "Sticker check",
      }),
    );
    expect(pruneTokens).toHaveBeenCalledWith(["bad"]);
  });

  it("loads tokens by userId when none are provided", async () => {
    const listTokens = vi.fn(async () => ["tok-a"]);
    const sendMulticast = vi.fn(async () => ({
      responses: [{ success: true }],
    }));

    const provider = new FcmPushProvider({ listTokens, sendMulticast });
    await provider.send({
      userId: "user-9",
      title: "T",
      body: "B",
    });

    expect(listTokens).toHaveBeenCalledWith("user-9");
    expect(sendMulticast).toHaveBeenCalledWith(
      expect.objectContaining({ tokens: ["tok-a"] }),
    );
  });
});
