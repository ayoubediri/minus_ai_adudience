import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Camera,
  CameraOff,
  AlertTriangle,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeft,
  Settings,
  Volume2,
  VolumeX,
  Smartphone,
  Square,
  Unlink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useVideoProcessor } from '@/hooks/useVideoProcessor';
import AppLayout from '@/components/AppLayout';
import { PhoneCameraModal } from '@/components/PhoneCameraModal';

export default function LiveMonitor() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = parseInt(params.sessionId || '0');
  const [, setLocation] = useLocation();

  const videoRef = useRef<HTMLVideoElement>(null);
  const phoneVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(40);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [selectedSource, setSelectedSource] = useState<'webcam' | 'phone'>('webcam');
  const [lastAlertTime, setLastAlertTime] = useState(0);
  const [showPhoneCameraModal, setShowPhoneCameraModal] = useState(false);
  const [phoneStream, setPhoneStream] = useState<MediaStream | null>(null);
  const [isPhoneConnected, setIsPhoneConnected] = useState(false);

  const { data: session } = trpc.sessions.getById.useQuery(
    { sessionId },
    { enabled: sessionId > 0 }
  );

  const recordEngagementMutation = trpc.engagement.record.useMutation();
  const createAlertMutation = trpc.alerts.create.useMutation();
  const endSessionMutation = trpc.sessions.endSession.useMutation({
    onSuccess: () => {
      toast.success('Session ended');
      setLocation('/sessions');
    },
  });

  const { metrics, isProcessing, isModelLoaded, startProcessing, stopProcessing } = useVideoProcessor();

  // Trigger alert
  const triggerAlert = useCallback((boredomPercentage: number) => {
    toast.error(`Alert: ${boredomPercentage.toFixed(0)}% of audience appears disengaged!`, {
      duration: 5000,
    });

    if (vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    if (soundEnabled) {
      const audio = new Audio('/alert-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }

    // Record alert
    createAlertMutation.mutate({
      sessionId,
      userId: 0,
      alertType: 'threshold_breach',
      boredomPercentage,
      message: `Boredom threshold exceeded: ${boredomPercentage.toFixed(0)}%`,
      deliveryChannels: JSON.stringify(['vibration', 'sound', 'visual']),
    });
  }, [vibrationEnabled, soundEnabled, sessionId, createAlertMutation]);

  // Check for alerts
  useEffect(() => {
    if (!isProcessing || metrics.totalFaces === 0) return;

    const now = Date.now();
    if (metrics.boredomPercentage >= alertThreshold && now - lastAlertTime > 30000) {
      triggerAlert(metrics.boredomPercentage);
      setLastAlertTime(now);
    }
  }, [metrics.boredomPercentage, alertThreshold, isProcessing, metrics.totalFaces, lastAlertTime, triggerAlert]);

  // Record engagement data
  useEffect(() => {
    if (!isProcessing || metrics.totalFaces === 0) return;

    const interval = setInterval(() => {
      recordEngagementMutation.mutate({
        sessionId,
        timestamp: new Date(),
        totalFaces: metrics.totalFaces,
        boredCount: metrics.boredCount,
        engagedCount: metrics.engagedCount,
        neutralCount: metrics.neutralCount,
        boredomPercentage: metrics.boredomPercentage,
        averageEngagementScore: metrics.averageEngagementScore,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isProcessing, metrics, sessionId, recordEngagementMutation]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
        setSelectedSource('webcam');

        if (canvasRef.current) {
          startProcessing(videoRef.current, canvasRef.current);
        }
        toast.success('Camera started');
      }
    } catch (error) {
      toast.error('Failed to access camera. Please check permissions.');
      console.error('Camera error:', error);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    stopProcessing();
    setIsStreaming(false);
  };

  // Handle phone camera connection - receives MediaStream directly
  const handlePhoneCameraConnect = async (stream: MediaStream) => {
    console.log('[LiveMonitor] Phone camera stream received');
    setPhoneStream(stream);
    setIsPhoneConnected(true);
    setShowPhoneCameraModal(false);
    
    // Stop webcam if running
    if (isStreaming && selectedSource === 'webcam') {
      stopCamera();
    }
    
    setSelectedSource('phone');

    // Set up phone video element and start processing
    if (phoneVideoRef.current && canvasRef.current) {
      phoneVideoRef.current.srcObject = stream;
      await phoneVideoRef.current.play();
      
      // Start face detection on phone stream
      startProcessing(phoneVideoRef.current, canvasRef.current);
      setIsStreaming(true);
      
      toast.success('Phone camera connected with face detection active!');
    }
  };

  // Disconnect phone camera
  const disconnectPhoneCamera = () => {
    if (phoneStream) {
      phoneStream.getTracks().forEach(track => track.stop());
      setPhoneStream(null);
    }
    if (phoneVideoRef.current) {
      phoneVideoRef.current.srcObject = null;
    }
    stopProcessing();
    setIsPhoneConnected(false);
    setIsStreaming(false);
    setSelectedSource('webcam');
    toast.info('Phone camera disconnected');
  };

  // Switch video source
  const handleSourceChange = async (source: 'webcam' | 'phone') => {
    if (source === 'webcam') {
      // Stop phone processing if active
      if (isPhoneConnected && selectedSource === 'phone') {
        stopProcessing();
      }
      setSelectedSource('webcam');
      if (!isStreaming || selectedSource === 'phone') {
        await startCamera();
      }
    } else if (source === 'phone') {
      if (!isPhoneConnected) {
        setShowPhoneCameraModal(true);
      } else {
        // Switch to phone stream
        if (isStreaming && selectedSource === 'webcam') {
          stopCamera();
        }
        setSelectedSource('phone');
        
        // Start processing phone stream
        if (phoneVideoRef.current && canvasRef.current && phoneStream) {
          phoneVideoRef.current.srcObject = phoneStream;
          await phoneVideoRef.current.play();
          startProcessing(phoneVideoRef.current, canvasRef.current);
          setIsStreaming(true);
        }
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (phoneStream) {
        phoneStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const getEngagementColor = (percentage: number) => {
    if (percentage >= 70) return 'text-emerald-600';
    if (percentage >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getBoredomColor = (percentage: number) => {
    if (percentage < 30) return 'text-emerald-600';
    if (percentage < 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/sessions')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {session?.title || 'Live Monitor'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">Live Session</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setLocation(`/analytics/${sessionId}`)}
            >
              View Analytics
            </Button>
            <Button
              variant="destructive"
              onClick={() => endSessionMutation.mutate({ sessionId })}
              disabled={endSessionMutation.isPending}
            >
              <Square className="w-4 h-4 mr-2" />
              End Session
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="xl:col-span-2 space-y-4">
            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-slate-900">
                {/* Hidden video elements for processing */}
                <video
                  ref={videoRef}
                  className="hidden"
                  playsInline
                  muted
                  autoPlay
                />
                <video
                  ref={phoneVideoRef}
                  className="hidden"
                  playsInline
                  muted
                  autoPlay
                />
                
                {/* Canvas shows processed video with face detection overlays */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* No camera active */}
                {!isStreaming && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <Camera className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Camera not active</p>
                    <p className="text-sm text-white/60 mb-6">
                      Click the button below to start monitoring
                    </p>
                    <div className="flex gap-3">
                      <Button size="lg" onClick={startCamera} disabled={!isModelLoaded}>
                        <Camera className="w-5 h-5 mr-2" />
                        {isModelLoaded ? 'Start Webcam' : 'Loading AI Models...'}
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline" 
                        onClick={() => setShowPhoneCameraModal(true)}
                        className="border-white/30 text-white hover:bg-white/10"
                      >
                        <Smartphone className="w-5 h-5 mr-2" />
                        Use Phone
                      </Button>
                    </div>
                    {!isModelLoaded && (
                      <p className="text-xs text-white/40 mt-3">Loading face detection models...</p>
                    )}
                  </div>
                )}

                {/* Overlay controls */}
                {isStreaming && (
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className="bg-black/60 text-white border-0"
                    >
                      <Users className="w-3 h-3 mr-1" />
                      {metrics.totalFaces} detected
                      {selectedSource === 'phone' && (
                        <span className="ml-2 text-blue-300">
                          <Smartphone className="w-3 h-3 inline mr-1" />
                          Phone
                        </span>
                      )}
                    </Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-black/60 hover:bg-black/80 text-white border-0"
                      onClick={selectedSource === 'phone' ? disconnectPhoneCamera : stopCamera}
                    >
                      <CameraOff className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  </div>
                )}

                {/* Alert overlay */}
                {isStreaming && metrics.boredomPercentage >= alertThreshold && metrics.totalFaces > 0 && (
                  <div className="absolute top-4 left-4 right-4">
                    <div className="bg-red-500/90 text-white px-4 py-3 rounded-lg flex items-center gap-3 animate-pulse">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">
                        High disengagement detected: {Math.round(metrics.boredomPercentage)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Video source selector */}
              <div className="p-4 border-t border-border bg-muted/30">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <Label className="text-sm font-medium">Video Source:</Label>
                    <Select 
                      value={selectedSource} 
                      onValueChange={(value) => handleSourceChange(value as 'webcam' | 'phone')}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="webcam">
                          <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4" />
                            Built-in Webcam
                          </div>
                        </SelectItem>
                        <SelectItem value="phone">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            Phone Camera {isPhoneConnected && '✓'}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    {isPhoneConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={disconnectPhoneCamera}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Unlink className="w-4 h-4 mr-2" />
                        Disconnect Phone
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPhoneCameraModal(true)}
                      >
                        <Smartphone className="w-4 h-4 mr-2" />
                        Link Phone
                      </Button>
                    )}
                  </div>
                </div>

                {/* Phone connection status */}
                {isPhoneConnected && selectedSource === 'phone' && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-sm font-medium">Phone camera active with face detection</span>
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                      AI is analyzing the video stream in real-time
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Metrics & Controls */}
          <div className="space-y-4">
            {/* Engagement Score */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Engagement Score</h3>
                <Badge variant="outline" className={getEngagementColor(metrics.averageEngagementScore)}>
                  {metrics.averageEngagementScore >= 70 ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : metrics.averageEngagementScore >= 40 ? (
                    <Minus className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {metrics.averageEngagementScore >= 70
                    ? 'Good'
                    : metrics.averageEngagementScore >= 40
                    ? 'Fair'
                    : 'Low'}
                </Badge>
              </div>
              <div className="text-center mb-4">
                <span className={`text-5xl font-bold ${getEngagementColor(metrics.averageEngagementScore)}`}>
                  {Math.round(metrics.averageEngagementScore)}
                </span>
                <span className="text-2xl text-muted-foreground">%</span>
              </div>
              <Progress
                value={metrics.averageEngagementScore}
                className="h-2"
              />
            </Card>

            {/* Audience Breakdown */}
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Audience Breakdown</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm">Engaged</span>
                  </div>
                  <span className="font-semibold text-emerald-600">
                    {metrics.engagedCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm">Neutral</span>
                  </div>
                  <span className="font-semibold text-amber-600">
                    {metrics.neutralCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm">Disengaged</span>
                  </div>
                  <span className="font-semibold text-red-600">
                    {metrics.boredCount}
                  </span>
                </div>
              </div>

              {/* Boredom percentage */}
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Disengagement Rate</span>
                  <span className={`font-bold ${getBoredomColor(metrics.boredomPercentage)}`}>
                    {Math.round(metrics.boredomPercentage)}%
                  </span>
                </div>
                <Progress
                  value={metrics.boredomPercentage}
                  className="h-2"
                />
              </div>
            </Card>

            {/* Alert Settings */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold">Alert Settings</h3>
              </div>

              <div className="space-y-5">
                {/* Threshold */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Alert Threshold</Label>
                    <span className="text-sm font-medium text-primary">
                      {alertThreshold}%
                    </span>
                  </div>
                  <Slider
                    value={[alertThreshold]}
                    onValueChange={(value) => setAlertThreshold(value[0])}
                    min={10}
                    max={90}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert when disengagement exceeds this level
                  </p>
                </div>

                {/* Sound toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Label className="text-sm">Sound Alerts</Label>
                  </div>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                  />
                </div>

                {/* Vibration toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm">Vibration</Label>
                  </div>
                  <Switch
                    checked={vibrationEnabled}
                    onCheckedChange={setVibrationEnabled}
                  />
                </div>
              </div>
            </Card>

            {/* Detection Indicators */}
            {isProcessing && metrics.faces.length > 0 && (
              <Card className="p-5">
                <h3 className="font-semibold mb-4">Detection Details</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {metrics.faces.map((face, idx) => (
                    <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Person {idx + 1}</span>
                        <Badge
                          variant="outline"
                          className={
                            face.emotionLabel === 'engaged'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : face.emotionLabel === 'bored'
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-amber-100 text-amber-700 border-amber-200'
                          }
                        >
                          {face.emotionLabel}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Score: {Math.round(face.engagement)}%</div>
                        <div>Head: {face.isLookingDown ? '👇 Down' : '👀 Forward'}</div>
                        <div>{face.isYawning ? '😴 Yawning' : '✓ Alert'}</div>
                        <div>{'expressions' in face ? '✓ Detected' : '✓ Upright'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Processing Status */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isProcessing ? 'bg-emerald-500 animate-pulse' : isModelLoaded ? 'bg-amber-500' : 'bg-slate-400'
                  }`}
                />
                <span className="text-sm">
                  {isProcessing 
                    ? `AI Processing Active${selectedSource === 'phone' ? ' (Phone)' : ''}` 
                    : isModelLoaded 
                    ? 'Waiting for camera' 
                    : 'Loading AI models...'}
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Phone Camera Modal */}
      <PhoneCameraModal
        isOpen={showPhoneCameraModal}
        onClose={() => setShowPhoneCameraModal(false)}
        onConnect={handlePhoneCameraConnect}
      />
    </AppLayout>
  );
}
