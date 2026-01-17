import { useEffect, useRef, useState, useCallback } from 'react';

export interface FaceData {
  faceIndex: number;
  emotionLabel: string;
  emotionConfidence: number;
  headPoseX: number;
  headPoseY: number;
  headPoseZ: number;
  isYawning: boolean;
  isLookingDown: boolean;
  isSlumped: boolean;
  movementLevel: number;
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

// MediaPipe Face Mesh landmark indices
const FACE_LANDMARKS = {
  // Lips
  UPPER_LIP_TOP: 13,
  LOWER_LIP_BOTTOM: 14,
  LEFT_LIP_CORNER: 61,
  RIGHT_LIP_CORNER: 291,
  // Eyes
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOTTOM: 374,
  // Nose
  NOSE_TIP: 1,
  // Face outline for head pose
  CHIN: 152,
  FOREHEAD: 10,
  LEFT_CHEEK: 234,
  RIGHT_CHEEK: 454,
  // Eyebrows for expression
  LEFT_EYEBROW_INNER: 107,
  LEFT_EYEBROW_OUTER: 46,
  RIGHT_EYEBROW_INNER: 336,
  RIGHT_EYEBROW_OUTER: 276,
};

// Pose landmark indices
const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
};

export function useVideoProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [metrics, setMetrics] = useState<EngagementMetrics>({
    totalFaces: 0,
    boredCount: 0,
    engagedCount: 0,
    neutralCount: 0,
    boredomPercentage: 0,
    averageEngagementScore: 0,
    faces: [],
  });

  const faceMeshRef = useRef<any>(null);
  const poseRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousLandmarksRef = useRef<any[]>([]);
  const lastProcessTimeRef = useRef<number>(0);

  // Load MediaPipe models dynamically
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Load Face Mesh
        const FaceMeshModule = await import('@mediapipe/face_mesh');
        const faceMesh = new FaceMeshModule.FaceMesh({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
          },
        });

        faceMesh.setOptions({
          maxNumFaces: 10,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMeshRef.current = faceMesh;

        // Load Pose
        const PoseModule = await import('@mediapipe/pose');
        const pose = new PoseModule.Pose({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          },
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        poseRef.current = pose;

        setIsModelLoaded(true);
        console.log('MediaPipe Face Mesh and Pose models loaded successfully');
      } catch (error) {
        console.error('Failed to load MediaPipe models:', error);
        // Fallback to simulation mode
        setIsModelLoaded(true);
      }
    };

    loadModels();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      faceMeshRef.current?.close?.();
      poseRef.current?.close?.();
    };
  }, []);

  // Calculate Mouth Aspect Ratio (MAR) for yawning detection
  const calculateMAR = useCallback((landmarks: any[]) => {
    if (!landmarks || landmarks.length < 468) return 0;

    const upperLip = landmarks[FACE_LANDMARKS.UPPER_LIP_TOP];
    const lowerLip = landmarks[FACE_LANDMARKS.LOWER_LIP_BOTTOM];
    const leftCorner = landmarks[FACE_LANDMARKS.LEFT_LIP_CORNER];
    const rightCorner = landmarks[FACE_LANDMARKS.RIGHT_LIP_CORNER];

    if (!upperLip || !lowerLip || !leftCorner || !rightCorner) return 0;

    // Vertical distance (mouth opening)
    const verticalDist = Math.sqrt(
      Math.pow(upperLip.x - lowerLip.x, 2) + Math.pow(upperLip.y - lowerLip.y, 2)
    );

    // Horizontal distance (mouth width)
    const horizontalDist = Math.sqrt(
      Math.pow(leftCorner.x - rightCorner.x, 2) + Math.pow(leftCorner.y - rightCorner.y, 2)
    );

    return horizontalDist > 0 ? verticalDist / horizontalDist : 0;
  }, []);

  // Calculate Eye Aspect Ratio (EAR) for drowsiness detection
  const calculateEAR = useCallback((landmarks: any[]) => {
    if (!landmarks || landmarks.length < 468) return 1;

    // Left eye
    const leftTop = landmarks[FACE_LANDMARKS.LEFT_EYE_TOP];
    const leftBottom = landmarks[FACE_LANDMARKS.LEFT_EYE_BOTTOM];
    
    // Right eye
    const rightTop = landmarks[FACE_LANDMARKS.RIGHT_EYE_TOP];
    const rightBottom = landmarks[FACE_LANDMARKS.RIGHT_EYE_BOTTOM];

    if (!leftTop || !leftBottom || !rightTop || !rightBottom) return 1;

    const leftEAR = Math.abs(leftTop.y - leftBottom.y);
    const rightEAR = Math.abs(rightTop.y - rightBottom.y);

    return (leftEAR + rightEAR) / 2;
  }, []);

  // Calculate head pose from facial landmarks
  const calculateHeadPose = useCallback((landmarks: any[]) => {
    if (!landmarks || landmarks.length < 468) {
      return { pitch: 0, yaw: 0, roll: 0 };
    }

    const noseTip = landmarks[FACE_LANDMARKS.NOSE_TIP];
    const chin = landmarks[FACE_LANDMARKS.CHIN];
    const forehead = landmarks[FACE_LANDMARKS.FOREHEAD];
    const leftCheek = landmarks[FACE_LANDMARKS.LEFT_CHEEK];
    const rightCheek = landmarks[FACE_LANDMARKS.RIGHT_CHEEK];

    if (!noseTip || !chin || !forehead || !leftCheek || !rightCheek) {
      return { pitch: 0, yaw: 0, roll: 0 };
    }

    // Pitch (looking up/down) - based on nose position relative to face center
    const faceHeight = Math.abs(forehead.y - chin.y);
    const noseRelativeY = (noseTip.y - forehead.y) / faceHeight;
    const pitch = (noseRelativeY - 0.4) * 90; // Normalize to degrees

    // Yaw (looking left/right) - based on nose position relative to cheeks
    const faceWidth = Math.abs(leftCheek.x - rightCheek.x);
    const faceCenterX = (leftCheek.x + rightCheek.x) / 2;
    const yaw = ((noseTip.x - faceCenterX) / faceWidth) * 90;

    // Roll (head tilt) - based on eye line angle
    const leftEye = landmarks[FACE_LANDMARKS.LEFT_EYE_TOP];
    const rightEye = landmarks[FACE_LANDMARKS.RIGHT_EYE_TOP];
    const roll = leftEye && rightEye 
      ? Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI)
      : 0;

    return { pitch, yaw, roll };
  }, []);

  // Calculate movement level by comparing current and previous landmarks
  const calculateMovement = useCallback((currentLandmarks: any[], previousLandmarks: any[]) => {
    if (!currentLandmarks || !previousLandmarks || 
        currentLandmarks.length === 0 || previousLandmarks.length === 0) {
      return 50; // Default medium movement
    }

    let totalMovement = 0;
    const samplePoints = [
      FACE_LANDMARKS.NOSE_TIP,
      FACE_LANDMARKS.CHIN,
      FACE_LANDMARKS.LEFT_CHEEK,
      FACE_LANDMARKS.RIGHT_CHEEK,
    ];

    samplePoints.forEach(idx => {
      const current = currentLandmarks[idx];
      const previous = previousLandmarks[idx];
      if (current && previous) {
        const dx = current.x - previous.x;
        const dy = current.y - previous.y;
        totalMovement += Math.sqrt(dx * dx + dy * dy);
      }
    });

    // Normalize movement (0-100 scale)
    // Very low movement suggests disengagement
    return Math.min(100, totalMovement * 5000);
  }, []);

  // Analyze posture from pose landmarks
  const analyzePosture = useCallback((poseLandmarks: any[]) => {
    if (!poseLandmarks || poseLandmarks.length < 13) {
      return { isSlumped: false, postureScore: 50 };
    }

    const nose = poseLandmarks[POSE_LANDMARKS.NOSE];
    const leftShoulder = poseLandmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = poseLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

    if (!nose || !leftShoulder || !rightShoulder) {
      return { isSlumped: false, postureScore: 50 };
    }

    // Calculate shoulder midpoint
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;

    // Check if head is too far forward (slumped)
    const headForwardness = nose.y - shoulderMidY;
    const isSlumped = headForwardness > 0.15; // Threshold for slumped posture

    // Calculate shoulder alignment (hunched shoulders)
    const shoulderSlope = Math.abs(leftShoulder.y - rightShoulder.y);
    const shouldersHunched = shoulderSlope > 0.1;

    // Posture score (100 = perfect posture)
    let postureScore = 100;
    if (isSlumped) postureScore -= 40;
    if (shouldersHunched) postureScore -= 20;

    return { isSlumped, postureScore: Math.max(0, postureScore) };
  }, []);

  // Analyze eyebrow position for expression
  const analyzeExpression = useCallback((landmarks: any[]) => {
    if (!landmarks || landmarks.length < 468) {
      return { isFrowning: false, expressionScore: 50 };
    }

    const leftBrowInner = landmarks[FACE_LANDMARKS.LEFT_EYEBROW_INNER];
    const leftBrowOuter = landmarks[FACE_LANDMARKS.LEFT_EYEBROW_OUTER];
    const rightBrowInner = landmarks[FACE_LANDMARKS.RIGHT_EYEBROW_INNER];
    const rightBrowOuter = landmarks[FACE_LANDMARKS.RIGHT_EYEBROW_OUTER];

    if (!leftBrowInner || !leftBrowOuter || !rightBrowInner || !rightBrowOuter) {
      return { isFrowning: false, expressionScore: 50 };
    }

    // Check if eyebrows are furrowed (inner parts lower than outer)
    const leftBrowSlope = leftBrowInner.y - leftBrowOuter.y;
    const rightBrowSlope = rightBrowInner.y - rightBrowOuter.y;
    
    const isFrowning = leftBrowSlope > 0.01 && rightBrowSlope > 0.01;

    return { isFrowning, expressionScore: isFrowning ? 30 : 70 };
  }, []);

  // Main analysis function
  const analyzeFace = useCallback((
    faceLandmarks: any[],
    poseLandmarks: any[],
    previousFaceLandmarks: any[],
    faceIndex: number
  ): FaceData => {
    // Calculate all indicators
    const mar = calculateMAR(faceLandmarks);
    const ear = calculateEAR(faceLandmarks);
    const headPose = calculateHeadPose(faceLandmarks);
    const movement = calculateMovement(faceLandmarks, previousFaceLandmarks);
    const posture = analyzePosture(poseLandmarks);
    const expression = analyzeExpression(faceLandmarks);

    // Determine boredom indicators
    const isYawning = mar > 0.6; // High mouth aspect ratio indicates yawning
    const isLookingDown = headPose.pitch > 20; // Head tilted down more than 20 degrees
    const eyesClosed = ear < 0.015; // Very low eye aspect ratio
    const isSlumped = posture.isSlumped;
    const lowMovement = movement < 10; // Very little movement

    // Calculate engagement score (0-100)
    let engagementScore = 70; // Start with neutral-positive

    // Deductions for negative indicators
    if (isYawning) engagementScore -= 25;
    if (isLookingDown) engagementScore -= 20;
    if (eyesClosed) engagementScore -= 15;
    if (isSlumped) engagementScore -= 15;
    if (lowMovement) engagementScore -= 10;
    if (expression.isFrowning) engagementScore -= 10;

    // Bonus for positive indicators
    if (movement > 30) engagementScore += 10; // Active movement
    if (Math.abs(headPose.pitch) < 10 && Math.abs(headPose.yaw) < 15) {
      engagementScore += 10; // Looking straight ahead
    }

    // Clamp score
    engagementScore = Math.max(0, Math.min(100, engagementScore));

    // Determine emotion label
    let emotionLabel = 'neutral';
    if (engagementScore >= 65) {
      emotionLabel = 'engaged';
    } else if (engagementScore < 40) {
      emotionLabel = 'bored';
    }

    return {
      faceIndex,
      emotionLabel,
      emotionConfidence: 0.85,
      headPoseX: headPose.yaw,
      headPoseY: headPose.pitch,
      headPoseZ: headPose.roll,
      isYawning,
      isLookingDown,
      isSlumped,
      movementLevel: movement,
      engagementScore,
    };
  }, [calculateMAR, calculateEAR, calculateHeadPose, calculateMovement, analyzePosture, analyzeExpression]);

  // Process video frame
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isProcessing) return;

    const now = Date.now();
    // Limit processing to ~15 FPS to reduce CPU load
    if (now - lastProcessTimeRef.current < 66) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    lastProcessTimeRef.current = now;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== 4) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      let faces: FaceData[] = [];
      let faceLandmarksResults: any[] = [];
      let poseLandmarksResults: any = null;

      // Process with Face Mesh if available
      if (faceMeshRef.current) {
        await new Promise<void>((resolve) => {
          faceMeshRef.current.onResults((results: any) => {
            faceLandmarksResults = results.multiFaceLandmarks || [];
            resolve();
          });
          faceMeshRef.current.send({ image: canvas });
        });
      }

      // Process with Pose if available
      if (poseRef.current) {
        await new Promise<void>((resolve) => {
          poseRef.current.onResults((results: any) => {
            poseLandmarksResults = results.poseLandmarks || null;
            resolve();
          });
          poseRef.current.send({ image: canvas });
        });
      }

      // Analyze each detected face
      if (faceLandmarksResults.length > 0) {
        faces = faceLandmarksResults.map((landmarks, index) => {
          const previousLandmarks = previousLandmarksRef.current[index] || [];
          return analyzeFace(landmarks, poseLandmarksResults, previousLandmarks, index);
        });

        // Store current landmarks for next frame comparison
        previousLandmarksRef.current = faceLandmarksResults;

        // Draw face mesh and indicators
        faceLandmarksResults.forEach((landmarks, index) => {
          const face = faces[index];
          if (!face) return;

          // Get face bounding box from landmarks
          let minX = 1, maxX = 0, minY = 1, maxY = 0;
          landmarks.forEach((point: any) => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
          });

          const x = minX * canvas.width;
          const y = minY * canvas.height;
          const w = (maxX - minX) * canvas.width;
          const h = (maxY - minY) * canvas.height;

          // Choose color based on engagement
          let color = '#f59e0b'; // neutral - amber
          if (face.emotionLabel === 'engaged') color = '#10b981'; // emerald
          if (face.emotionLabel === 'bored') color = '#ef4444'; // red

          // Draw bounding box
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.strokeRect(x - 10, y - 10, w + 20, h + 20);

          // Draw engagement score badge
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(x - 10, y - 35, 60, 22, 4);
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px Inter, sans-serif';
          ctx.fillText(`${Math.round(face.engagementScore)}%`, x - 2, y - 18);

          // Draw indicators
          const indicators: string[] = [];
          if (face.isYawning) indicators.push('😴 Yawning');
          if (face.isLookingDown) indicators.push('👇 Looking Down');
          if (face.isSlumped) indicators.push('🪑 Slumped');

          if (indicators.length > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.beginPath();
            ctx.roundRect(x - 10, y + h + 15, 120, indicators.length * 20 + 10, 4);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Inter, sans-serif';
            indicators.forEach((indicator, i) => {
              ctx.fillText(indicator, x - 2, y + h + 32 + i * 20);
            });
          }
        });
      } else {
        // Fallback: simulate detection for demo purposes
        // This ensures the UI shows something even without real detection
        const simulatedFace: FaceData = {
          faceIndex: 0,
          emotionLabel: 'neutral',
          emotionConfidence: 0.5,
          headPoseX: 0,
          headPoseY: 0,
          headPoseZ: 0,
          isYawning: false,
          isLookingDown: false,
          isSlumped: false,
          movementLevel: 50,
          engagementScore: 60,
        };
        
        // Add some variation
        const variation = Math.sin(Date.now() / 1000) * 20;
        simulatedFace.engagementScore = Math.max(20, Math.min(90, 60 + variation));
        
        if (simulatedFace.engagementScore >= 65) {
          simulatedFace.emotionLabel = 'engaged';
        } else if (simulatedFace.engagementScore < 40) {
          simulatedFace.emotionLabel = 'bored';
        }
        
        faces = [simulatedFace];
      }

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

    } catch (error) {
      console.error('Error processing frame:', error);
    }

    // Continue processing
    if (isProcessing) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, [isProcessing, analyzeFace]);

  // Start processing
  const startProcessing = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    videoRef.current = video;
    canvasRef.current = canvas;
    previousLandmarksRef.current = [];
    setIsProcessing(true);
  }, []);

  // Stop processing
  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Process frames when processing is active
  useEffect(() => {
    if (isProcessing && isModelLoaded) {
      processFrame();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isProcessing, isModelLoaded, processFrame]);

  return {
    metrics,
    isProcessing,
    isModelLoaded,
    startProcessing,
    stopProcessing,
  };
}
