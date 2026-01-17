import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { generateSessionReport } from "./aiReports";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Session Management
  sessions: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        alertThreshold: z.number().min(0).max(100).default(40),
      }))
      .mutation(async ({ ctx, input }) => {
        const sessionId = await db.createSession({
          speakerId: ctx.user.id,
          title: input.title,
          description: input.description,
          alertThreshold: input.alertThreshold,
        });
        return { sessionId };
      }),

    list: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getSessionsBySpeaker(ctx.user.id);
      }),

    getById: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSessionById(input.sessionId);
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        status: z.enum(["scheduled", "live", "completed", "cancelled"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateSessionStatus(input.sessionId, input.status);
        return { success: true };
      }),

    updateThreshold: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        threshold: z.number().min(0).max(100),
      }))
      .mutation(async ({ input }) => {
        await db.updateAlertThreshold(input.sessionId, input.threshold);
        return { success: true };
      }),

    startSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateSessionStatus(input.sessionId, "live");
        await db.updateSessionTimes(input.sessionId, new Date());
        return { success: true };
      }),

    endSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateSessionStatus(input.sessionId, "completed");
        await db.updateSessionTimes(input.sessionId, undefined, new Date());
        return { success: true };
      }),
  }),

  // Assistant Management
  assistants: router({
    add: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.addSessionAssistant(input.sessionId, input.userId);
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.removeSessionAssistant(input.sessionId, input.userId);
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSessionAssistants(input.sessionId);
      }),
  }),

  // Notification Preferences
  notifications: router({
    getPreferences: protectedProcedure
      .query(async ({ ctx }) => {
        const prefs = await db.getNotificationPreferences(ctx.user.id);
        // Return defaults if not set
        return prefs || {
          userId: ctx.user.id,
          enableVibration: true,
          enableSound: true,
          enableVisual: true,
          enableEmail: false,
          enablePush: true,
          soundType: "default",
        };
      }),

    updatePreferences: protectedProcedure
      .input(z.object({
        enableVibration: z.boolean().optional(),
        enableSound: z.boolean().optional(),
        enableVisual: z.boolean().optional(),
        enableEmail: z.boolean().optional(),
        enablePush: z.boolean().optional(),
        soundType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertNotificationPreferences({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),
  }),

  // Engagement Data
  engagement: router({
    record: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        timestamp: z.date(),
        totalFaces: z.number(),
        boredCount: z.number(),
        engagedCount: z.number(),
        neutralCount: z.number(),
        boredomPercentage: z.number(),
        averageEngagementScore: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.insertEngagementData(input);
        return { success: true };
      }),

    getBySession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEngagementDataBySession(input.sessionId);
      }),

    getInRange: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        startTime: z.date(),
        endTime: z.date(),
      }))
      .query(async ({ input }) => {
        return await db.getEngagementDataInRange(
          input.sessionId,
          input.startTime,
          input.endTime
        );
      }),
  }),

  // Face Analysis
  faces: router({
    record: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        timestamp: z.date(),
        faceIndex: z.number(),
        emotionLabel: z.string().optional(),
        emotionConfidence: z.number(),
        headPoseX: z.number().optional(),
        headPoseY: z.number().optional(),
        headPoseZ: z.number().optional(),
        isYawning: z.boolean().optional(),
        isLookingDown: z.boolean().optional(),
        engagementScore: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.insertFaceAnalysis(input);
        return { success: true };
      }),

    getBySession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getFaceAnalysisBySession(input.sessionId);
      }),
  }),

  // Alerts
  alerts: router({
    create: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        userId: z.number(),
        alertType: z.enum(["threshold_breach", "system", "manual"]),
        boredomPercentage: z.number().optional(),
        message: z.string().optional(),
        deliveryChannels: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const alertId = await db.createAlert(input);
        return { alertId };
      }),

    markDelivered: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ input }) => {
        await db.markAlertDelivered(input.alertId);
        return { success: true };
      }),

    getBySession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAlertsBySession(input.sessionId);
      }),

    getMyAlerts: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getAlertsByUser(ctx.user.id);
      }),
  }),

  // Session Reports
  reports: router({
    generate: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input }) => {
        const insights = await generateSessionReport(input.sessionId);
        await db.createSessionReport({
          sessionId: input.sessionId,
          overallEngagement: insights.overallEngagement,
          peakEngagementTime: insights.peakEngagementTime,
          lowestEngagementTime: insights.lowestEngagementTime,
          insights: insights.insights,
          recommendations: insights.recommendations,
          successfulMoments: JSON.stringify(insights.successfulMoments),
          improvementAreas: JSON.stringify(insights.improvementAreas),
        });
        return { success: true };
      }),

    getBySession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSessionReport(input.sessionId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
