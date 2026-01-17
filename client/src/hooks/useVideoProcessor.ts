import { useState, useRef, useCallback, useEffect } from 'react';
import { faceDetector, FaceData } from '@/lib/faceDetector';

export interface EngagementMetrics {
  totalFaces: number;
  engagedCount: number;
  neutralCount: number;
  boredCount: number;
  boredomPercentage: number;
  averageEngagementScore: number;
  faces: FaceData[];
}

// Re-export FaceData for backward compatibility
export type { FaceData };

const initialMetrics: EngagementMetrics = {
  totalFaces: 0,
  engagedCount: 0,
  neutralCount: 0,
  boredCount: 0,
  boredomPercentage: 0,
  averageEngagementScore: 0,
  faces: [],
};

export function useVideoProcessor() {
  const [metrics, setMetrics] = useState<EngagementMetrics>(initialMetrics);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const lastProcessTimeRef = useRef<number>(0);

  // Initialize face detector on mount
  useEffect(() => {
    const initDetector = async () => {
      const success = await faceDetector.initialize();
      setIsModelLoaded(success);
    };
    initDetector();
  }, []);

  // Draw faces on canvas
  const drawFaces = useCallback((
    ctx: CanvasRenderingContext2D,
    faces: FaceData[],
    videoWidth: number,
    videoHeight: number,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    // Calculate scale factors
    const scaleX = canvasWidth / videoWidth;
    const scaleY = canvasHeight / videoHeight;

    faces.forEach((face) => {
      const { box, engagement, emotionLabel, isYawning, isLookingDown } = face;

      // Scale box coordinates
      const x = box.x * scaleX;
      const y = box.y * scaleY;
      const width = box.width * scaleX;
      const height = box.height * scaleY;

      // Determine color based on emotion
      let color: string;
      let bgColor: string;
      if (emotionLabel === 'engaged') {
        color = '#51cf66'; // Green
        bgColor = 'rgba(81, 207, 102, 0.15)';
      } else if (emotionLabel === 'bored') {
        color = '#ff6b6b'; // Red
        bgColor = 'rgba(255, 107, 107, 0.15)';
      } else {
        color = '#ffd43b'; // Yellow
        bgColor = 'rgba(255, 212, 59, 0.15)';
      }

      // Draw face rectangle with fill
      ctx.fillStyle = bgColor;
      ctx.fillRect(x, y, width, height);

      // Draw border
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      // Draw engagement percentage label
      const labelY = y - 8;
      const labelText = `${Math.round(engagement)}%`;
      
      // Label background
      ctx.font = 'bold 16px Inter, system-ui, sans-serif';
      const textWidth = ctx.measureText(labelText).width;
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, labelY - 20, textWidth + 16, 24, 6);
      ctx.fill();

      // Label text
      ctx.fillStyle = '#000';
      ctx.fillText(labelText, x + 8, labelY - 3);

      // Draw emoji based on emotion at bottom
      const emoji = emotionLabel === 'engaged' ? '😊' : emotionLabel === 'bored' ? '😴' : '😐';
      ctx.font = '28px sans-serif';
      ctx.fillText(emoji, x + width / 2 - 14, y + height + 32);

      // Draw indicators for yawning and looking down on the right side
      const indicators: string[] = [];
      if (isYawning) indicators.push('🥱');
      if (isLookingDown) indicators.push('👇');

      if (indicators.length > 0) {
        ctx.font = '24px sans-serif';
        indicators.forEach((indicator, idx) => {
          ctx.fillText(indicator, x + width + 8, y + 30 + idx * 30);
        });
      }
    });
  }, []);

  // Process video frame
  const processFrame = useCallback(async () => {
    if (!isRunningRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== 4) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Limit processing to ~10 FPS to reduce CPU load
    const now = Date.now();
    if (now - lastProcessTimeRef.current < 100) {
      // Still draw the video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    lastProcessTimeRef.current = now;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Detect faces
    const faces = await faceDetector.detectFaces(video);

    // Draw faces on canvas
    if (faces.length > 0) {
      drawFaces(ctx, faces, video.videoWidth, video.videoHeight, canvas.width, canvas.height);
    }

    // Calculate metrics
    const totalFaces = faces.length;
    const engagedCount = faces.filter(f => f.emotionLabel === 'engaged').length;
    const neutralCount = faces.filter(f => f.emotionLabel === 'neutral').length;
    const boredCount = faces.filter(f => f.emotionLabel === 'bored').length;
    const boredomPercentage = totalFaces > 0 ? (boredCount / totalFaces) * 100 : 0;
    const averageEngagementScore = totalFaces > 0
      ? faces.reduce((sum, f) => sum + f.engagement, 0) / totalFaces
      : 0;

    setMetrics({
      totalFaces,
      engagedCount,
      neutralCount,
      boredCount,
      boredomPercentage,
      averageEngagementScore,
      faces,
    });

    // Continue processing
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [drawFaces]);

  // Start processing
  const startProcessing = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    if (!isModelLoaded) {
      console.warn('[useVideoProcessor] Models not loaded yet');
      return;
    }

    videoRef.current = video;
    canvasRef.current = canvas;

    // Set canvas size to match video
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    isRunningRef.current = true;
    setIsProcessing(true);
    processFrame();
  }, [isModelLoaded, processFrame]);

  // Stop processing
  const stopProcessing = useCallback(() => {
    isRunningRef.current = false;
    setIsProcessing(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setMetrics(initialMetrics);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProcessing();
    };
  }, [stopProcessing]);

  return {
    metrics,
    isProcessing,
    isModelLoaded,
    startProcessing,
    stopProcessing,
  };
}
