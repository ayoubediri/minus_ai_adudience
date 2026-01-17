import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Smartphone, Copy, Check, Wifi, QrCode, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneCameraManager } from '@/lib/webrtcPhoneCamera';

interface PhoneCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (stream: MediaStream) => void;
}

export function PhoneCameraModal({ isOpen, onClose, onConnect }: PhoneCameraModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [phoneUrl, setPhoneUrl] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [status, setStatus] = useState<'waiting' | 'connecting' | 'connected'>('waiting');
  const [copied, setCopied] = useState(false);
  
  const managerRef = useRef<PhoneCameraManager | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Create new manager and start listening
      const manager = new PhoneCameraManager();
      managerRef.current = manager;
      
      setRoomId(manager.getRoomId());
      setPhoneUrl(manager.getPhoneUrl());
      setStatus('waiting');
      setCopied(false);

      // Generate QR code
      manager.generateQRCode().then(setQrCodeUrl).catch(console.error);

      // Set up callbacks
      manager.onStream((stream) => {
        console.log('[PhoneCameraModal] Received video stream');
        setStatus('connected');
        onConnect(stream);
        toast.success('Phone camera connected! Face detection is now active.');
      });

      manager.onDisconnect(() => {
        console.log('[PhoneCameraModal] Connection lost');
        setStatus('waiting');
        toast.error('Phone camera disconnected');
      });

      // Start listening for connections
      manager.startListening();

      return () => {
        // Don't disconnect on close if connected - let LiveMonitor handle it
        if (status !== 'connected') {
          manager.disconnect();
        }
      };
    }
  }, [isOpen]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(phoneUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleClose = () => {
    if (status !== 'connected' && managerRef.current) {
      managerRef.current.disconnect();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Link Phone as Camera
          </DialogTitle>
          <DialogDescription>
            Use your smartphone as a wireless camera for audience monitoring with real-time face detection
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="qr" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Manual Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="space-y-4">
            <div className="flex flex-col items-center py-4">
              {qrCodeUrl ? (
                <div className="p-4 bg-white rounded-xl shadow-sm">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code for phone camera"
                    className="w-48 h-48"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 bg-muted animate-pulse rounded-xl" />
              )}
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Scan this QR code with your phone to start streaming
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Instructions:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Open your phone's camera app</li>
                <li>Point it at the QR code above</li>
                <li>Tap the link that appears</li>
                <li>Allow camera access when prompted</li>
                <li>Tap "Start Streaming" on your phone</li>
                <li>The video will appear here automatically</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Camera URL</Label>
              <div className="flex gap-2">
                <Input
                  value={phoneUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Open this URL on your phone to start streaming video
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Manual Setup:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Copy the URL above</li>
                <li>Send it to your phone (email, message, etc.)</li>
                <li>Open the link in your phone's browser</li>
                <li>Allow camera access when prompted</li>
                <li>Tap "Start Streaming"</li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>

        {/* Connection Status */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {status === 'connecting' ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            ) : (
              <Wifi className={`w-4 h-4 ${status === 'connected' ? 'text-green-500' : 'text-muted-foreground'}`} />
            )}
            <span className="text-sm">Status:</span>
            <Badge
              variant={status === 'connected' ? 'default' : 'secondary'}
              className={status === 'connected' ? 'bg-green-500' : ''}
            >
              {status === 'waiting' && 'Waiting for phone...'}
              {status === 'connecting' && 'Connecting...'}
              {status === 'connected' && 'Connected!'}
            </Badge>
          </div>

          <Button variant="outline" onClick={handleClose}>
            {status === 'connected' ? 'Done' : 'Cancel'}
          </Button>
        </div>

        {/* Room ID for debugging */}
        <p className="text-xs text-muted-foreground text-center">
          Room ID: {roomId}
        </p>

        {/* Important note */}
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            <strong>Note:</strong> Both devices must be on the same network for the connection to work. 
            Face detection will automatically start once the phone stream is received.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
