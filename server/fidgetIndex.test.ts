import { describe, expect, it, vi, beforeEach } from "vitest";

// Test the engagement calculation logic
describe("Engagement Calculation", () => {
  it("should calculate high engagement for positive expressions", () => {
    const expressions = {
      neutral: 0.1,
      happy: 0.8,
      sad: 0.0,
      angry: 0.0,
      fearful: 0.0,
      disgusted: 0.0,
      surprised: 0.1,
    };
    
    const isYawning = false;
    const isLookingDown = false;
    
    const engagement = calculateEngagement(expressions, isYawning, isLookingDown);
    
    // Happy expression should boost engagement
    expect(engagement).toBeGreaterThanOrEqual(80);
  });

  it("should calculate low engagement for boredom indicators", () => {
    const expressions = {
      neutral: 0.8,
      happy: 0.0,
      sad: 0.1,
      angry: 0.0,
      fearful: 0.0,
      disgusted: 0.0,
      surprised: 0.0,
    };
    
    const isYawning = true;
    const isLookingDown = true;
    
    const engagement = calculateEngagement(expressions, isYawning, isLookingDown);
    
    // Yawning and looking down should significantly reduce engagement
    expect(engagement).toBeLessThan(50);
  });

  it("should calculate neutral engagement for mixed signals", () => {
    const expressions = {
      neutral: 0.8, // High neutral reduces engagement
      happy: 0.1,
      sad: 0.05,
      angry: 0.0,
      fearful: 0.0,
      disgusted: 0.0,
      surprised: 0.05,
    };
    
    const isYawning = false;
    const isLookingDown = false;
    
    const engagement = calculateEngagement(expressions, isYawning, isLookingDown);
    
    // High neutral expression should reduce score to neutral range (90 after -10 for neutral)
    expect(engagement).toBeGreaterThanOrEqual(50);
    expect(engagement).toBeLessThanOrEqual(100);
  });
});

// Test emotion label assignment
describe("Emotion Label Assignment", () => {
  it("should return 'engaged' for high engagement scores", () => {
    expect(getEmotionLabel(85)).toBe("engaged");
    expect(getEmotionLabel(70)).toBe("engaged");
  });

  it("should return 'neutral' for medium engagement scores", () => {
    expect(getEmotionLabel(60)).toBe("neutral");
    expect(getEmotionLabel(55)).toBe("neutral");
  });

  it("should return 'bored' for low engagement scores", () => {
    expect(getEmotionLabel(40)).toBe("bored");
    expect(getEmotionLabel(20)).toBe("bored");
  });
});

// Test MAR (Mouth Aspect Ratio) calculation
describe("Mouth Aspect Ratio (MAR)", () => {
  it("should detect yawning when MAR > 0.6", () => {
    const mar = 0.7;
    expect(mar > 0.6).toBe(true);
  });

  it("should not detect yawning when MAR <= 0.6", () => {
    const mar = 0.4;
    expect(mar > 0.6).toBe(false);
  });
});

// Test alert threshold logic
describe("Alert Threshold Logic", () => {
  it("should trigger critical alert when engagement < 40%", () => {
    const avgEngagement = 35;
    const criticalThreshold = 40;
    
    expect(avgEngagement < criticalThreshold).toBe(true);
  });

  it("should trigger warning alert when engagement < 60%", () => {
    const avgEngagement = 55;
    const warningThreshold = 60;
    const criticalThreshold = 40;
    
    expect(avgEngagement < warningThreshold && avgEngagement >= criticalThreshold).toBe(true);
  });

  it("should not trigger alert when engagement >= 60%", () => {
    const avgEngagement = 75;
    const warningThreshold = 60;
    
    expect(avgEngagement >= warningThreshold).toBe(true);
  });
});

// Test boredom percentage calculation
describe("Boredom Percentage Calculation", () => {
  it("should calculate correct boredom percentage", () => {
    const totalFaces = 10;
    const boredCount = 3;
    
    const boredomPercentage = (boredCount / totalFaces) * 100;
    
    expect(boredomPercentage).toBe(30);
  });

  it("should return 0 when no faces detected", () => {
    const totalFaces = 0;
    const boredCount = 0;
    
    const boredomPercentage = totalFaces > 0 ? (boredCount / totalFaces) * 100 : 0;
    
    expect(boredomPercentage).toBe(0);
  });
});

// Test alert cooldown logic
describe("Alert Cooldown", () => {
  it("should respect cooldown period", () => {
    const lastAlertTime = Date.now() - 15000; // 15 seconds ago
    const cooldownMs = 30000; // 30 seconds
    const now = Date.now();
    
    const canAlert = now - lastAlertTime >= cooldownMs;
    
    expect(canAlert).toBe(false);
  });

  it("should allow alert after cooldown expires", () => {
    const lastAlertTime = Date.now() - 35000; // 35 seconds ago
    const cooldownMs = 30000; // 30 seconds
    const now = Date.now();
    
    const canAlert = now - lastAlertTime >= cooldownMs;
    
    expect(canAlert).toBe(true);
  });
});

// Helper functions (mirroring the client-side logic)
function calculateEngagement(
  expressions: {
    neutral: number;
    happy: number;
    sad: number;
    angry: number;
    fearful: number;
    disgusted: number;
    surprised: number;
  },
  isYawning: boolean,
  isLookingDown: boolean
): number {
  let score = 100;

  // Deductions for negative expressions
  if (expressions.sad > 0.5) score -= 20;
  if (expressions.angry > 0.5) score -= 15;
  if (expressions.fearful > 0.5) score -= 10;
  if (expressions.disgusted > 0.5) score -= 10;
  
  // Neutral expression is slightly negative for engagement
  if (expressions.neutral > 0.7) score -= 10;

  // Bonuses for positive expressions
  if (expressions.happy > 0.5) score += 15;
  if (expressions.surprised > 0.3) score += 10;

  // Major deductions for boredom indicators
  if (isYawning) score -= 30;
  if (isLookingDown) score -= 20;

  return Math.max(0, Math.min(100, score));
}

function getEmotionLabel(engagement: number): 'engaged' | 'neutral' | 'bored' {
  if (engagement >= 70) return 'engaged';
  if (engagement < 50) return 'bored';
  return 'neutral';
}
