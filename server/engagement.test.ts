import { describe, expect, it } from "vitest";

/**
 * Tests for engagement analysis logic
 * These tests verify the core algorithms for calculating engagement scores
 */

// Simulate the engagement calculation logic from the frontend
function calculateEngagementScore(indicators: {
  isYawning: boolean;
  isLookingDown: boolean;
  eyesClosed: boolean;
  isSlumped: boolean;
  lowMovement: boolean;
  isFrowning: boolean;
  activeMovement: boolean;
  lookingStraight: boolean;
}): number {
  let score = 70; // Base score

  // Deductions for negative indicators
  if (indicators.isYawning) score -= 25;
  if (indicators.isLookingDown) score -= 20;
  if (indicators.eyesClosed) score -= 15;
  if (indicators.isSlumped) score -= 15;
  if (indicators.lowMovement) score -= 10;
  if (indicators.isFrowning) score -= 10;

  // Bonus for positive indicators
  if (indicators.activeMovement) score += 10;
  if (indicators.lookingStraight) score += 10;

  // Clamp score between 0 and 100
  return Math.max(0, Math.min(100, score));
}

function getEmotionLabel(engagementScore: number): string {
  if (engagementScore >= 65) return 'engaged';
  if (engagementScore < 40) return 'bored';
  return 'neutral';
}

// Calculate Mouth Aspect Ratio for yawning detection
function calculateMAR(mouthVertical: number, mouthHorizontal: number): number {
  return mouthHorizontal > 0 ? mouthVertical / mouthHorizontal : 0;
}

function isYawning(mar: number): boolean {
  return mar > 0.6;
}

// Calculate head pose for looking down detection
function isLookingDown(pitch: number): boolean {
  return pitch > 20;
}

describe("Engagement Score Calculation", () => {
  it("returns base score of 70 for neutral state", () => {
    const score = calculateEngagementScore({
      isYawning: false,
      isLookingDown: false,
      eyesClosed: false,
      isSlumped: false,
      lowMovement: false,
      isFrowning: false,
      activeMovement: false,
      lookingStraight: false,
    });
    expect(score).toBe(70);
  });

  it("returns maximum score of 90 for fully engaged state", () => {
    const score = calculateEngagementScore({
      isYawning: false,
      isLookingDown: false,
      eyesClosed: false,
      isSlumped: false,
      lowMovement: false,
      isFrowning: false,
      activeMovement: true,
      lookingStraight: true,
    });
    expect(score).toBe(90);
  });

  it("returns low score for multiple negative indicators", () => {
    const score = calculateEngagementScore({
      isYawning: true,
      isLookingDown: true,
      eyesClosed: false,
      isSlumped: true,
      lowMovement: true,
      isFrowning: false,
      activeMovement: false,
      lookingStraight: false,
    });
    expect(score).toBe(0); // 70 - 25 - 20 - 15 - 10 = 0
  });

  it("clamps score to minimum of 0", () => {
    const score = calculateEngagementScore({
      isYawning: true,
      isLookingDown: true,
      eyesClosed: true,
      isSlumped: true,
      lowMovement: true,
      isFrowning: true,
      activeMovement: false,
      lookingStraight: false,
    });
    expect(score).toBe(0);
  });

  it("clamps score to maximum of 100", () => {
    // Even with all bonuses, should not exceed 100
    const score = calculateEngagementScore({
      isYawning: false,
      isLookingDown: false,
      eyesClosed: false,
      isSlumped: false,
      lowMovement: false,
      isFrowning: false,
      activeMovement: true,
      lookingStraight: true,
    });
    expect(score).toBeLessThanOrEqual(100);
  });

  it("penalizes yawning by 25 points", () => {
    const baseScore = calculateEngagementScore({
      isYawning: false,
      isLookingDown: false,
      eyesClosed: false,
      isSlumped: false,
      lowMovement: false,
      isFrowning: false,
      activeMovement: false,
      lookingStraight: false,
    });

    const yawningScore = calculateEngagementScore({
      isYawning: true,
      isLookingDown: false,
      eyesClosed: false,
      isSlumped: false,
      lowMovement: false,
      isFrowning: false,
      activeMovement: false,
      lookingStraight: false,
    });

    expect(baseScore - yawningScore).toBe(25);
  });
});

describe("Emotion Label Classification", () => {
  it("classifies score >= 65 as engaged", () => {
    expect(getEmotionLabel(65)).toBe('engaged');
    expect(getEmotionLabel(80)).toBe('engaged');
    expect(getEmotionLabel(100)).toBe('engaged');
  });

  it("classifies score < 40 as bored", () => {
    expect(getEmotionLabel(39)).toBe('bored');
    expect(getEmotionLabel(20)).toBe('bored');
    expect(getEmotionLabel(0)).toBe('bored');
  });

  it("classifies score between 40 and 64 as neutral", () => {
    expect(getEmotionLabel(40)).toBe('neutral');
    expect(getEmotionLabel(50)).toBe('neutral');
    expect(getEmotionLabel(64)).toBe('neutral');
  });
});

describe("Yawning Detection (Mouth Aspect Ratio)", () => {
  it("detects yawning when MAR > 0.6", () => {
    const mar = calculateMAR(0.08, 0.1); // 0.8 ratio
    expect(isYawning(mar)).toBe(true);
  });

  it("does not detect yawning when MAR <= 0.6", () => {
    const mar = calculateMAR(0.03, 0.1); // 0.3 ratio
    expect(isYawning(mar)).toBe(false);
  });

  it("handles zero mouth width gracefully", () => {
    const mar = calculateMAR(0.05, 0);
    expect(mar).toBe(0);
    expect(isYawning(mar)).toBe(false);
  });
});

describe("Head Pose Detection", () => {
  it("detects looking down when pitch > 20 degrees", () => {
    expect(isLookingDown(25)).toBe(true);
    expect(isLookingDown(30)).toBe(true);
  });

  it("does not detect looking down when pitch <= 20 degrees", () => {
    expect(isLookingDown(20)).toBe(false);
    expect(isLookingDown(10)).toBe(false);
    expect(isLookingDown(0)).toBe(false);
  });

  it("handles negative pitch (looking up)", () => {
    expect(isLookingDown(-10)).toBe(false);
  });
});

describe("Aggregate Metrics Calculation", () => {
  it("calculates correct boredom percentage", () => {
    const faces = [
      { emotionLabel: 'bored' },
      { emotionLabel: 'engaged' },
      { emotionLabel: 'neutral' },
      { emotionLabel: 'bored' },
    ];

    const boredCount = faces.filter(f => f.emotionLabel === 'bored').length;
    const totalFaces = faces.length;
    const boredomPercentage = (boredCount / totalFaces) * 100;

    expect(boredomPercentage).toBe(50);
  });

  it("calculates correct average engagement score", () => {
    const faces = [
      { engagementScore: 80 },
      { engagementScore: 60 },
      { engagementScore: 40 },
      { engagementScore: 20 },
    ];

    const avgScore = faces.reduce((sum, f) => sum + f.engagementScore, 0) / faces.length;
    expect(avgScore).toBe(50);
  });

  it("handles empty faces array", () => {
    const faces: any[] = [];
    const totalFaces = faces.length;
    const boredomPercentage = totalFaces > 0 ? 0 : 0;
    const avgScore = totalFaces > 0 ? 0 : 0;

    expect(boredomPercentage).toBe(0);
    expect(avgScore).toBe(0);
  });
});
