import { useState, useEffect } from 'react';
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
import { Smartphone, Copy, Check, Wifi, QrCode, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  generatePhoneCameraLink,
  generateQRCode,
  PhoneCameraLinkData,
} from '@/lib/phoneCameraLink';

interface PhoneCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (viewUrl: string) => void;
}

export function PhoneCameraModal({ isOpen, onClose, onConnect }: PhoneCameraModalProps) {
  const [linkData, setLinkData] = useState<PhoneCameraLinkData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [status, setStatus] = useState<'waiting' | 'connecting' | 'connected'>('waiting');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Generate new link data
      const data = generatePhoneCameraLink();
      setLinkData(data);
      setStatus('waiting');
      setCopied(false);

      // Generate QR code
      generateQRCode(data.qrData).then(setQrCodeUrl).catch(console.error);
    }
  }, [isOpen]);

  const copyToClipboard = async () => {
    if (!linkData) return;

    try {
      await navigator.clipboard.writeText(linkData.pushUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleConnect = () => {
    if (!linkData) return;
    setStatus('connected');
    onConnect(linkData.viewUrl);
    toast.success('Phone camera connected!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Link Phone as Camera
          </DialogTitle>
          <DialogDescription>
            Use your smartphone as a wireless camera for audience monitoring
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
                <li>Click "Connect" below once streaming</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Camera URL</Label>
              <div className="flex gap-2">
                <Input
                  value={linkData?.pushUrl || ''}
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
                <li>Click "Connect" below once streaming</li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>

        {/* Connection Status */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Wifi className={`w-4 h-4 ${status === 'connected' ? 'text-green-500' : 'text-muted-foreground'}`} />
            <span className="text-sm">Status:</span>
            <Badge
              variant={status === 'connected' ? 'default' : 'secondary'}
              className={status === 'connected' ? 'bg-green-500' : ''}
            >
              {status === 'waiting' && 'Waiting for connection...'}
              {status === 'connecting' && 'Connecting...'}
              {status === 'connected' && 'Connected!'}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConnect}>
              Connect
            </Button>
          </div>
        </div>

        {/* Room ID for debugging */}
        {linkData && (
          <p className="text-xs text-muted-foreground text-center">
            Room ID: {linkData.roomId}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
