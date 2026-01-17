import { useEffect, useRef, useState, useCallback } from 'react';
import { FaceDetection } from '@mediapipe/face_detection';
import { Pose } from '@mediapipe/pose';
import * as tf from '@tensorflow/tfjs';

export interface FaceData {
  faceIndex: number;
  emotionLabel: string;
  emotionConfidence: number;
  headPoseX?: number;
  headPoseY?: number;
  headPoseZ?: number;
  isYawning: boolean;
  isLookingDown: boolean;
  engagementScore: number;
}

export interface EngagementMetrics {
  totalFaces: number;
  boredCount: number;
  engagedCount: number;
  neutralCount: number;
  boredomPercentage: number;
  averageEngagementScore: number;
  faces: FaceData[];
}

export function useVideoProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [metrics, setMetrics] = useState<EngagementMetrics>({
    totalFaces: 0,
    boredCount: 0,
    engagedCount: 0,
    neutralCount: 0,
    boredomPercentage: 0,
    averageEngagementScore: 0,
    faces: [],
  });

  const faceDetectionRef = useRef<FaceDetection | null>(null);
  const poseRef = useRef<Pose | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize MediaPipe models
  useEffect(() => {
    const initModels = async () => {
      try {
        // Initialize Face Detection
        const faceDetection = new FaceDetection({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
          },
        });

        faceDetection.setOptions({
          model: 'short',
          minDetectionConfidence: 0.5,
        });

        await faceDetection.initialize();
        faceDetectionRef.current = faceDetection;

        // Initialize Pose Detection
        const pose = new Pose({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          },
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        await pose.initialize();
        poseRef.current = pose;

        console.log('MediaPipe models initialized');
      } catch (error) {
        console.error('Failed to initialize MediaPipe models:', error);
      }
    };

    initModels();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      faceDetectionRef.current?.close();
      poseRef.current?.close();
    };
  }, []);

  // Analyze engagement from face and pose data
  const analyzeEngagement = useCallback((faceResults: any, poseResults: any): FaceData[] => {
    const faces: FaceData[] = [];

    if (!faceResults?.detections) return faces;

    faceResults.detections.forEach((detection: any, index: number) => {
      // Simple heuristic-based emotion detection
      const bbox = detection.boundingBox;
      const landmarks = detection.landmarks;

      // Calculate head pose from landmarks (simplified)
      let headPoseY = 0;
      let isLookingDown = false;
      
      if (landmarks && landmarks.length >= 6) {
        // Check if head is tilted down (nose below eyes)
        const noseY = landmarks[2]?.y || 0;
        const eyeY = (landmarks[0]?.y + landmarks[1]?.y) / 2 || 0;
        headPoseY = (noseY - eyeY) * 100;
        isLookingDown = headPoseY > 15; // Threshold for looking down
      }

      // Detect yawning (simplified - checking mouth aspect ratio)
      const isYawning = false; // Would need more sophisticated detection

      // Calculate engagement score based on multiple factors
      let engagementScore = 50; // Base score

      // Penalize for looking down
      if (isLookingDown) {
        engagementScore -= 30;
      }

      // Penalize for yawning
      if (isYawning) {
        engagementScore -= 20;
      }

      // Check pose for slumped posture
      if (poseResults?.poseLandmarks) {
        const shoulders = poseResults.poseLandmarks.slice(11, 13);
        const nose = poseResults.poseLandmarks[0];
        
        if (shoulders.length === 2 && nose) {
          const shoulderMidY = (shoulders[0].y + shoulders[1].y) / 2;
          const posture = nose.y - shoulderMidY;
          
          // If head is significantly below shoulders, person is slumped
          if (posture > 0.1) {
            engagementScore -= 20;
          }
        }
      }

      // Clamp score between 0 and 100
      engagementScore = Math.max(0, Math.min(100, engagementScore));

      // Determine emotion label based on engagement score
      let emotionLabel = 'neutral';
      if (engagementScore >= 70) {
        emotionLabel = 'engaged';
      } else if (engagementScore < 40) {
        emotionLabel = 'bored';
      }

      faces.push({
        faceIndex: index,
        emotionLabel,
        emotionConfidence: detection.score[0] || 0.5,
        headPoseY,
        isYawning,
        isLookingDown,
        engagementScore,
      });
    });

    return faces;
  }, []);

  // Process video frame
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Draw video frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Run face detection
      const faceResults: any = faceDetectionRef.current 
        ? await faceDetectionRef.current.send({ image: canvas })
        : null;

      // Run pose detection
      const poseResults: any = poseRef.current
        ? await poseRef.current.send({ image: canvas })
        : null;

      // Analyze engagement
      const faces = analyzeEngagement(faceResults, poseResults);

      // Calculate aggregate metrics
      const totalFaces = faces.length;
      const boredCount = faces.filter(f => f.emotionLabel === 'bored').length;
      const engagedCount = faces.filter(f => f.emotionLabel === 'engaged').length;
      const neutralCount = faces.filter(f => f.emotionLabel === 'neutral').length;
      const boredomPercentage = totalFaces > 0 ? (boredCount / totalFaces) * 100 : 0;
      const averageEngagementScore = totalFaces > 0
        ? faces.reduce((sum, f) => sum + f.engagementScore, 0) / totalFaces
        : 0;

      setMetrics({
        totalFaces,
        boredCount,
        engagedCount,
        neutralCount,
        boredomPercentage,
        averageEngagementScore,
        faces,
      });

      // Draw face boxes and indicators
      faces.forEach((face) => {
        if (faceResults?.detections[face.faceIndex]) {
          const bbox = faceResults.detections[face.faceIndex].boundingBox;
          
          // Choose color based on engagement
          let color = '#FFA500'; // neutral - orange
          if (face.emotionLabel === 'engaged') color = '#00FF00'; // green
          if (face.emotionLabel === 'bored') color = '#FF0000'; // red

          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.strokeRect(
            bbox.xCenter * canvas.width - (bbox.width * canvas.width) / 2,
            bbox.yCenter * canvas.height - (bbox.height * canvas.height) / 2,
            bbox.width * canvas.width,
            bbox.height * canvas.height
          );

          // Draw engagement score
          ctx.fillStyle = color;
          ctx.font = '16px Arial';
          ctx.fillText(
            `${Math.round(face.engagementScore)}%`,
            bbox.xCenter * canvas.width - (bbox.width * canvas.width) / 2,
            bbox.yCenter * canvas.height - (bbox.height * canvas.height) / 2 - 10
          );
        }
      });
    } catch (error) {
      console.error('Error processing frame:', error);
    }

    // Continue processing
    if (isProcessing) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, [isProcessing, analyzeEngagement]);

  // Start processing
  const startProcessing = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    videoRef.current = video;
    canvasRef.current = canvas;
    setIsProcessing(true);
  }, []);

  // Stop processing
  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  // Process frames when processing is active
  useEffect(() => {
    if (isProcessing) {
      processFrame();
    }
  }, [isProcessing, processFrame]);

  return {
    metrics,
    isProcessing,
    startProcessing,
    stopProcessing,
  };
}
