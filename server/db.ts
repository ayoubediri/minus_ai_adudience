import { eq, desc, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  sessions,
  Session,
  InsertSession,
  sessionAssistants,
  SessionAssistant,
  InsertSessionAssistant,
  notificationPreferences,
  NotificationPreference,
  InsertNotificationPreference,
  engagementData,
  EngagementData,
  InsertEngagementData,
  faceAnalysis,
  FaceAnalysis,
  InsertFaceAnalysis,
  alerts,
  Alert,
  InsertAlert,
  sessionReports,
  SessionReport,
  InsertSessionReport
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ========== User Management ==========

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ========== Session Management ==========

export async function createSession(session: InsertSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(sessions).values(session);
  return result[0].insertId;
}

export async function getSessionById(sessionId: number): Promise<Session | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSessionsBySpeaker(speakerId: number): Promise<Session[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(sessions)
    .where(eq(sessions.speakerId, speakerId))
    .orderBy(desc(sessions.createdAt));
}

export async function updateSessionStatus(sessionId: number, status: "scheduled" | "live" | "completed" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(sessions)
    .set({ status, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

export async function updateSessionTimes(sessionId: number, startTime?: Date, endTime?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updates: Partial<Session> = { updatedAt: new Date() };
  if (startTime) updates.startTime = startTime;
  if (endTime) updates.endTime = endTime;
  
  await db.update(sessions).set(updates).where(eq(sessions.id, sessionId));
}

export async function updateAlertThreshold(sessionId: number, threshold: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(sessions)
    .set({ alertThreshold: threshold, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

// ========== Session Assistants ==========

export async function addSessionAssistant(sessionId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(sessionAssistants).values({ sessionId, userId });
}

export async function removeSessionAssistant(sessionId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(sessionAssistants)
    .where(and(
      eq(sessionAssistants.sessionId, sessionId),
      eq(sessionAssistants.userId, userId)
    ));
}

export async function getSessionAssistants(sessionId: number): Promise<SessionAssistant[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(sessionAssistants)
    .where(eq(sessionAssistants.sessionId, sessionId));
}

// ========== Notification Preferences ==========

export async function getNotificationPreferences(userId: number): Promise<NotificationPreference | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertNotificationPreferences(prefs: InsertNotificationPreference) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(notificationPreferences).values(prefs)
    .onDuplicateKeyUpdate({ set: prefs });
}

// ========== Engagement Data ==========

export async function insertEngagementData(data: InsertEngagementData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(engagementData).values(data);
}

export async function getEngagementDataBySession(sessionId: number): Promise<EngagementData[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(engagementData)
    .where(eq(engagementData.sessionId, sessionId))
    .orderBy(engagementData.timestamp);
}

export async function getEngagementDataInRange(
  sessionId: number, 
  startTime: Date, 
  endTime: Date
): Promise<EngagementData[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(engagementData)
    .where(and(
      eq(engagementData.sessionId, sessionId),
      gte(engagementData.timestamp, startTime),
      lte(engagementData.timestamp, endTime)
    ))
    .orderBy(engagementData.timestamp);
}

// ========== Face Analysis ==========

export async function insertFaceAnalysis(data: InsertFaceAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(faceAnalysis).values(data);
}

export async function getFaceAnalysisBySession(sessionId: number): Promise<FaceAnalysis[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(faceAnalysis)
    .where(eq(faceAnalysis.sessionId, sessionId))
    .orderBy(faceAnalysis.timestamp);
}

// ========== Alerts ==========

export async function createAlert(alert: InsertAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(alerts).values(alert);
  return result[0].insertId;
}

export async function markAlertDelivered(alertId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(alerts)
    .set({ delivered: true })
    .where(eq(alerts.id, alertId));
}

export async function getAlertsBySession(sessionId: number): Promise<Alert[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(alerts)
    .where(eq(alerts.sessionId, sessionId))
    .orderBy(desc(alerts.createdAt));
}

export async function getAlertsByUser(userId: number): Promise<Alert[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(alerts)
    .where(eq(alerts.userId, userId))
    .orderBy(desc(alerts.createdAt));
}

// ========== Session Reports ==========

export async function createSessionReport(report: InsertSessionReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(sessionReports).values(report);
}

export async function getSessionReport(sessionId: number): Promise<SessionReport | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(sessionReports)
    .where(eq(sessionReports.sessionId, sessionId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}
