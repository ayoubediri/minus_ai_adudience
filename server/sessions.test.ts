import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Session Management", () => {
  it("creates a new session with valid input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sessions.create({
      title: "Test Presentation",
      description: "A test session",
      alertThreshold: 40,
    });

    expect(result).toHaveProperty("sessionId");
    expect(typeof result.sessionId).toBe("number");
  });

  it("lists sessions for the authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a session first
    await caller.sessions.create({
      title: "Test Session",
      alertThreshold: 50,
    });

    const sessions = await caller.sessions.list();
    expect(Array.isArray(sessions)).toBe(true);
  });

  it("updates session status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const { sessionId } = await caller.sessions.create({
      title: "Status Test Session",
      alertThreshold: 40,
    });

    const result = await caller.sessions.updateStatus({
      sessionId,
      status: "live",
    });

    expect(result.success).toBe(true);
  });

  it("updates alert threshold", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const { sessionId } = await caller.sessions.create({
      title: "Threshold Test Session",
      alertThreshold: 40,
    });

    const result = await caller.sessions.updateThreshold({
      sessionId,
      threshold: 60,
    });

    expect(result.success).toBe(true);
  });
});

describe("Notification Preferences", () => {
  it("retrieves default notification preferences", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const prefs = await caller.notifications.getPreferences();

    expect(prefs).toHaveProperty("enableVibration");
    expect(prefs).toHaveProperty("enableSound");
    expect(prefs).toHaveProperty("enableVisual");
  });

  it("updates notification preferences", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.updatePreferences({
      enableVibration: false,
      enableSound: true,
      soundType: "gentle",
    });

    expect(result.success).toBe(true);
  });
});

describe("Engagement Data", () => {
  it("records engagement data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const { sessionId } = await caller.sessions.create({
      title: "Engagement Test",
      alertThreshold: 40,
    });

    const result = await caller.engagement.record({
      sessionId,
      timestamp: new Date(),
      totalFaces: 10,
      boredCount: 2,
      engagedCount: 7,
      neutralCount: 1,
      boredomPercentage: 20,
      averageEngagementScore: 75,
    });

    expect(result.success).toBe(true);
  });

  it("retrieves engagement data by session", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const { sessionId } = await caller.sessions.create({
      title: "Retrieval Test",
      alertThreshold: 40,
    });

    await caller.engagement.record({
      sessionId,
      timestamp: new Date(),
      totalFaces: 5,
      boredCount: 1,
      engagedCount: 4,
      neutralCount: 0,
      boredomPercentage: 20,
      averageEngagementScore: 80,
    });

    const data = await caller.engagement.getBySession({ sessionId });
    expect(Array.isArray(data)).toBe(true);
  });
});
