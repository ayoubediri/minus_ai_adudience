import * as faceapi from 'face-api.js';

export interface FaceData {
  id: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  expressions: {
    neutral: number;
    happy: number;
    sad: number;
    angry: number;
    fearful: number;
    disgusted: number;
    surprised: number;
  };
  engagement: number;
  emotionLabel: 'engaged' | 'neutral' | 'bored';
  isYawning: boolean;
  isLookingDown: boolean;
  landmarks?: faceapi.FaceLandmarks68;
}

export class FaceDetector {
  private isReady = false;
  private isLoading = false;

  async initialize(): Promise<boolean> {
    if (this.isReady) return true;
    if (this.isLoading) return false;

    this.isLoading = true;

    try {
      const MODEL_URL = '/models';

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);

      this.isReady = true;
      this.isLoading = false;
      console.log('[FaceDetector] Models loaded successfully');
      return true;
    } catch (error) {
      console.error('[FaceDetector] Failed to load models:', error);
      this.isLoading = false;
      return false;
    }
  }

  getIsReady(): boolean {
    return this.isReady;
  }

  async detectFaces(videoElement: HTMLVideoElement): Promise<FaceData[]> {
    if (!this.isReady) return [];

    try {
      const detections = await faceapi
        .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.5,
        }))
        .withFaceLandmarks()
        .withFaceExpressions();

      return detections.map((detection, index) => {
        const { expressions, landmarks } = detection;
        const box = detection.detection.box;

        // Calculate yawning using Mouth Aspect Ratio (MAR)
        const isYawning = this.detectYawning(landmarks);

        // Calculate head pitch for looking down detection
        const isLookingDown = this.detectLookingDown(landmarks);

        // Calculate engagement score
        const engagement = this.calculateEngagement(expressions, isYawning, isLookingDown);

        // Determine emotion label
        const emotionLabel = this.getEmotionLabel(engagement);

        return {
          id: index,
          box: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          },
          expressions: {
            neutral: expressions.neutral,
            happy: expressions.happy,
            sad: expressions.sad,
            angry: expressions.angry,
            fearful: expressions.fearful,
            disgusted: expressions.disgusted,
            surprised: expressions.surprised,
          },
          engagement,
          emotionLabel,
          isYawning,
          isLookingDown,
          landmarks,
        };
      });
    } catch (error) {
      console.error('[FaceDetector] Detection error:', error);
      return [];
    }
  }

  private detectYawning(landmarks: faceapi.FaceLandmarks68): boolean {
    const mouth = landmarks.getMouth();
    
    // Calculate Mouth Aspect Ratio (MAR)
    // Vertical distance (top lip to bottom lip)
    const verticalDist = this.distance(mouth[3], mouth[9]);
    // Horizontal distance (left corner to right corner)
    const horizontalDist = this.distance(mouth[0], mouth[6]);
    
    const mar = horizontalDist > 0 ? verticalDist / horizontalDist : 0;
    
    // MAR > 0.6 indicates yawning
    return mar > 0.6;
  }

  private detectLookingDown(landmarks: faceapi.FaceLandmarks68): boolean {
    const nose = landmarks.getNose();
    const jawOutline = landmarks.getJawOutline();
    
    // Get nose tip and chin
    const noseTip = nose[3]; // Nose tip
    const chin = jawOutline[8]; // Bottom of chin
    const noseTop = nose[0]; // Top of nose
    
    // Calculate head pitch angle
    const faceHeight = chin.y - noseTop.y;
    const noseToChingRatio = (chin.y - noseTip.y) / faceHeight;
    
    // If the ratio is small, the person is looking down
    // Normal ratio is around 0.35-0.45, looking down is < 0.3
    return noseToChingRatio < 0.28;
  }

  private calculateEngagement(
    expressions: faceapi.FaceExpressions,
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

  private getEmotionLabel(engagement: number): 'engaged' | 'neutral' | 'bored' {
    if (engagement >= 70) return 'engaged';
    if (engagement < 50) return 'bored';
    return 'neutral';
  }

  private distance(p1: faceapi.Point, p2: faceapi.Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }
}

// Singleton instance
export const faceDetector = new FaceDetector();
