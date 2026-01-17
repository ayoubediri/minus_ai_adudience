import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, float } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Presentation sessions - each session represents a live presentation or meeting
 */
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  speakerId: int("speakerId").notNull(), // References users.id
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["scheduled", "live", "completed", "cancelled"]).default("scheduled").notNull(),
  alertThreshold: float("alertThreshold").default(40).notNull(), // Percentage (0-100)
  startTime: timestamp("startTime"),
  endTime: timestamp("endTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Session assistants - team members who receive alerts for a session
 */
export const sessionAssistants = mysqlTable("sessionAssistants", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(), // References sessions.id
  userId: int("userId").notNull(), // References users.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SessionAssistant = typeof sessionAssistants.$inferSelect;
export type InsertSessionAssistant = typeof sessionAssistants.$inferInsert;

/**
 * User notification preferences
 */
export const notificationPreferences = mysqlTable("notificationPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // References users.id
  enableVibration: boolean("enableVibration").default(true).notNull(),
  enableSound: boolean("enableSound").default(true).notNull(),
  enableVisual: boolean("enableVisual").default(true).notNull(),
  enableEmail: boolean("enableEmail").default(false).notNull(),
  enablePush: boolean("enablePush").default(true).notNull(),
  soundType: varchar("soundType", { length: 50 }).default("default"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

/**
 * Real-time engagement data captured during sessions
 */
export const engagementData = mysqlTable("engagementData", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(), // References sessions.id
  timestamp: timestamp("timestamp").notNull(),
  totalFaces: int("totalFaces").default(0).notNull(),
  boredCount: int("boredCount").default(0).notNull(),
  engagedCount: int("engagedCount").default(0).notNull(),
  neutralCount: int("neutralCount").default(0).notNull(),
  boredomPercentage: float("boredomPercentage").default(0).notNull(),
  averageEngagementScore: float("averageEngagementScore").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EngagementData = typeof engagementData.$inferSelect;
export type InsertEngagementData = typeof engagementData.$inferInsert;

/**
 * Individual face detection and emotion analysis
 */
export const faceAnalysis = mysqlTable("faceAnalysis", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(), // References sessions.id
  timestamp: timestamp("timestamp").notNull(),
  faceIndex: int("faceIndex").notNull(), // Index of face in frame
  emotionLabel: varchar("emotionLabel", { length: 50 }), // happy, sad, bored, neutral, etc.
  emotionConfidence: float("emotionConfidence").default(0).notNull(),
  headPoseX: float("headPoseX"), // Head rotation angles
  headPoseY: float("headPoseY"),
  headPoseZ: float("headPoseZ"),
  isYawning: boolean("isYawning").default(false),
  isLookingDown: boolean("isLookingDown").default(false),
  engagementScore: float("engagementScore").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FaceAnalysis = typeof faceAnalysis.$inferSelect;
export type InsertFaceAnalysis = typeof faceAnalysis.$inferInsert;

/**
 * Alert history - logs when alerts were triggered
 */
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(), // References sessions.id
  userId: int("userId").notNull(), // References users.id (recipient)
  alertType: mysqlEnum("alertType", ["threshold_breach", "system", "manual"]).notNull(),
  boredomPercentage: float("boredomPercentage"),
  message: text("message"),
  delivered: boolean("delivered").default(false).notNull(),
  deliveryChannels: text("deliveryChannels"), // JSON array of channels used
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

/**
 * AI-generated post-session reports
 */
export const sessionReports = mysqlTable("sessionReports", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().unique(), // References sessions.id
  overallEngagement: float("overallEngagement"),
  peakEngagementTime: timestamp("peakEngagementTime"),
  lowestEngagementTime: timestamp("lowestEngagementTime"),
  insights: text("insights"), // AI-generated insights
  recommendations: text("recommendations"), // AI-generated recommendations
  successfulMoments: text("successfulMoments"), // JSON array
  improvementAreas: text("improvementAreas"), // JSON array
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SessionReport = typeof sessionReports.$inferSelect;
export type InsertSessionReport = typeof sessionReports.$inferInsert;
