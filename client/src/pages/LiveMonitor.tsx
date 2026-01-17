import { useEffect, useRef, useState } from 'react';
import { useVideoProcessor } from '@/hooks/useVideoProcessor';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, AlertTriangle, Users } from 'lucide-react';
import { toast } from 'sonner';

interface LiveMonitorProps {
  sessionId: number;
}

export default function LiveMonitor({ sessionId }: LiveMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [threshold, setThreshold] = useState(40);
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);

  const { metrics, isProcessing, startProcessing, stopProcessing } = useVideoProcessor();
  const updateThresholdMutation = trpc.sessions.updateThreshold.useMutation();
  const recordEngagementMutation = trpc.engagement.record.useMutation();
  const createAlertMutation = trpc.alerts.create.useMutation();

  // Start webcam
  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setStream(mediaStream);
        
        // Start processing after video is ready
        if (canvasRef.current) {
          startProcessing(videoRef.current, canvasRef.current);
        }
        
        toast.success('Camera started');
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
      toast.error('Failed to access camera');
    }
  };

  // Stop webcam
  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      stopProcessing();
      toast.info('Camera stopped');
    }
  };

  // Record engagement data periodically
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
    }, 5000); // Record every 5 seconds

    return () => clearInterval(interval);
  }, [isProcessing, metrics, sessionId]);

  // Check for threshold breach and trigger alerts
  useEffect(() => {
    if (!isProcessing || metrics.totalFaces === 0) return;

    const now = Date.now();
    const timeSinceLastAlert = now - lastAlertTime;

    // Only alert if threshold breached and at least 30 seconds since last alert
    if (metrics.boredomPercentage >= threshold && timeSinceLastAlert > 30000) {
      setLastAlertTime(now);
      
      // Trigger vibration if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      
      // Play alert sound
      const audio = new Audio('/alert-sound.mp3');
      audio.play().catch(() => {
        // Fallback if audio fails
        console.log('Audio playback failed');
      });
      
      // Show toast notification
      toast.error(`Alert: ${Math.round(metrics.boredomPercentage)}% of audience appears disengaged!`, {
        duration: 5000,
      });
      
      // Record alert in database
      createAlertMutation.mutate({
        sessionId,
        userId: 0, // Will be set by server from context
        alertType: 'threshold_breach',
        boredomPercentage: metrics.boredomPercentage,
        message: `Boredom threshold exceeded: ${Math.round(metrics.boredomPercentage)}%`,
        deliveryChannels: JSON.stringify(['vibration', 'sound', 'visual']),
      });
    }
  }, [metrics.boredomPercentage, threshold, isProcessing, metrics.totalFaces]);

  // Update threshold
  const handleThresholdChange = (value: number[]) => {
    const newThreshold = value[0];
    setThreshold(newThreshold);
    updateThresholdMutation.mutate({
      sessionId,
      threshold: newThreshold,
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Live Audience Monitoring</h1>
          <p className="text-muted-foreground">Real-time engagement analysis and alerts</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Camera Feed</h2>
                  <div className="flex gap-2">
                    {!stream ? (
                      <Button onClick={startWebcam} size="sm">
                        <Video className="w-4 h-4 mr-2" />
                        Start Camera
                      </Button>
                    ) : (
                      <Button onClick={stopWebcam} variant="destructive" size="sm">
                        <VideoOff className="w-4 h-4 mr-2" />
                        Stop Camera
                      </Button>
                    )}
                  </div>
                </div>

                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover hidden"
                    autoPlay
                    playsInline
                    muted
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {!stream && (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <div className="text-center">
                        <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">Click "Start Camera" to begin monitoring</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Alert Threshold Control */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Alert Threshold</h3>
                  <Badge variant="outline" className="text-lg">
                    {threshold}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Slider
                    value={[threshold]}
                    onValueChange={handleThresholdChange}
                    min={10}
                    max={90}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Alert when {threshold}% or more of the audience appears disengaged
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Metrics Panel */}
          <div className="space-y-4">
            {/* Overall Metrics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Audience Overview
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">Total Faces</span>
                    <span className="text-2xl font-bold">{metrics.totalFaces}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">Engagement Score</span>
                    <span className="text-2xl font-bold">
                      {Math.round(metrics.averageEngagementScore)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${metrics.averageEngagementScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">Boredom Level</span>
                    <span className={`text-2xl font-bold ${
                      metrics.boredomPercentage >= threshold ? 'text-destructive animate-pulse-alert' : ''
                    }`}>
                      {Math.round(metrics.boredomPercentage)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        metrics.boredomPercentage >= threshold ? 'bg-destructive' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${metrics.boredomPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Detailed Breakdown */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Engagement Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm flex items-center">
                    <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                    Engaged
                  </span>
                  <span className="font-semibold status-engaged">{metrics.engagedCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm flex items-center">
                    <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                    Neutral
                  </span>
                  <span className="font-semibold status-neutral">{metrics.neutralCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm flex items-center">
                    <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                    Bored
                  </span>
                  <span className="font-semibold status-bored">{metrics.boredCount}</span>
                </div>
              </div>
            </Card>

            {/* Alert Status */}
            {metrics.boredomPercentage >= threshold && metrics.totalFaces > 0 && (
              <Card className="p-6 border-destructive bg-destructive/10">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 animate-pulse" />
                  <div>
                    <h3 className="font-semibold text-destructive mb-1">Alert Active</h3>
                    <p className="text-sm text-muted-foreground">
                      Audience engagement is below threshold. Consider adjusting your presentation.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
