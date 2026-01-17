import { useState, useRef, useEffect } from 'react';
import { useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, CameraOff, RefreshCw, Wifi, WifiOff, Smartphone, CheckCircle } from 'lucide-react';
import { PhoneCameraSender } from '@/lib/webrtcPhoneCamera';

export default function PhoneCamera() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const roomId = params.get('room') || '';
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const senderRef = useRef<PhoneCameraSender | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnectedToHost, setIsConnectedToHost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const startStreaming = async () => {
    if (!roomId) {
      setError('Invalid room ID. Please scan the QR code again.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const sender = new PhoneCameraSender(roomId);
      
      // Set up connection callbacks
      sender.onConnected(() => {
        console.log('[PhoneCamera] Connected to host!');
        setIsConnectedToHost(true);
      });
      
      sender.onDisconnected(() => {
        console.log('[PhoneCamera] Disconnected from host');
        setIsConnectedToHost(false);
      });
      
      await sender.startSending();
      senderRef.current = sender;

      // Show local preview
      if (videoRef.current && sender.getLocalStream()) {
        videoRef.current.srcObject = sender.getLocalStream();
        await videoRef.current.play();
      }

      setIsStreaming(true);
      setIsConnecting(false);
    } catch (err) {
      console.error('Failed to start streaming:', err);
      setError('Failed to access camera. Please allow camera permissions and try again.');
      setIsConnecting(false);
    }
  };

  const stopStreaming = () => {
    if (senderRef.current) {
      senderRef.current.stop();
      senderRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsConnectedToHost(false);
  };

  const switchCamera = async () => {
    if (senderRef.current) {
      await senderRef.current.switchCamera();
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
      
      // Update preview
      if (videoRef.current && senderRef.current.getLocalStream()) {
        videoRef.current.srcObject = senderRef.current.getLocalStream();
      }
    }
  };

  // Check connection status periodically
  useEffect(() => {
    if (!isStreaming || !senderRef.current) return;
    
    const interval = setInterval(() => {
      if (senderRef.current) {
        setIsConnectedToHost(senderRef.current.isConnected());
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (senderRef.current) {
        senderRef.current.stop();
      }
    };
  }, []);

  if (!roomId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <WifiOff className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-xl font-bold mb-2">Invalid Connection</h1>
          <p className="text-muted-foreground">
            Please scan the QR code from the EngageAI dashboard to connect your phone camera.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Smartphone className="w-6 h-6 text-blue-400" />
          <div>
            <h1 className="text-white font-semibold">EngageAI Camera</h1>
            <p className="text-slate-400 text-xs">Room: {roomId.slice(0, 12)}...</p>
          </div>
        </div>
        <Badge 
          variant={isConnectedToHost ? 'default' : isStreaming ? 'secondary' : 'outline'}
          className={isConnectedToHost ? 'bg-emerald-500' : isStreaming ? 'bg-amber-500' : ''}
        >
          {isConnectedToHost ? (
            <>
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </>
          ) : isStreaming ? (
            <>
              <Wifi className="w-3 h-3 mr-1 animate-pulse" />
              Waiting...
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 mr-1" />
              Offline
            </>
          )}
        </Badge>
      </div>

      {/* Connection Status Banner */}
      {isStreaming && !isConnectedToHost && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2">
          <p className="text-amber-200 text-sm text-center">
            📡 Waiting for dashboard to connect... Make sure the QR modal is open on your computer.
          </p>
        </div>
      )}
      
      {isStreaming && isConnectedToHost && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/30 px-4 py-2">
          <p className="text-emerald-200 text-sm text-center">
            ✅ Connected! Your camera is streaming to the dashboard with face detection active.
          </p>
        </div>
      )}

      {/* Video Preview */}
      <div className="flex-1 relative bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {!isStreaming && !isConnecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
            <Camera className="w-20 h-20 mb-6 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Ready to Stream</h2>
            <p className="text-white/60 text-center mb-8 max-w-xs">
              Tap the button below to start streaming your camera to the EngageAI dashboard
            </p>
            <Button 
              size="lg" 
              onClick={startStreaming}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-6 text-lg"
            >
              <Camera className="w-6 h-6 mr-3" />
              Start Streaming
            </Button>
          </div>
        )}

        {isConnecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6" />
            <p className="text-lg">Connecting...</p>
            <p className="text-white/60 text-sm mt-2">Please allow camera access</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-x-4 top-4">
            <div className="bg-red-500/90 text-white px-4 py-3 rounded-lg">
              {error}
            </div>
          </div>
        )}

        {/* Live indicator */}
        {isStreaming && (
          <div className="absolute top-4 left-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isConnectedToHost ? 'bg-red-500' : 'bg-slate-700'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnectedToHost ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
              <span className="text-white text-sm font-medium">
                {isConnectedToHost ? 'LIVE' : 'PREVIEW'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {isStreaming && (
        <div className="bg-slate-800 p-4 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={switchCamera}
            className="border-slate-600 text-white hover:bg-slate-700"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Flip Camera
          </Button>
          <Button
            variant="destructive"
            size="lg"
            onClick={stopStreaming}
          >
            <CameraOff className="w-5 h-5 mr-2" />
            Stop
          </Button>
        </div>
      )}

      {/* Instructions */}
      {!isStreaming && (
        <div className="bg-slate-800 p-4">
          <h3 className="text-white font-medium mb-2">Instructions:</h3>
          <ol className="text-slate-400 text-sm space-y-1 list-decimal list-inside">
            <li>Tap "Start Streaming" above</li>
            <li>Allow camera access when prompted</li>
            <li>Wait for "Connected" status</li>
            <li>Point your phone at the audience</li>
            <li>The dashboard will analyze engagement in real-time</li>
          </ol>
        </div>
      )}
    </div>
  );
}
