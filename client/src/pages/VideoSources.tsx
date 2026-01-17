import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Camera,
  Plus,
  Video,
  Wifi,
  Upload,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Smartphone,
  Monitor,
  HelpCircle,
  ArrowRight,
  Zap,
  Globe,
  FileVideo,
  QrCode,
  Link2,
  Play,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';

interface VideoSource {
  id: string;
  name: string;
  type: 'webcam' | 'ip_camera' | 'rtsp' | 'file' | 'phone';
  url?: string;
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: Date;
}

// Device type cards for the main selection
const deviceTypes = [
  {
    id: 'webcam',
    icon: Monitor,
    title: 'Computer Webcam',
    description: 'Use your laptop or desktop camera',
    color: 'bg-blue-500',
    steps: ['Click "Add" below', 'Allow camera access when prompted', 'Start monitoring'],
  },
  {
    id: 'phone',
    icon: Smartphone,
    title: 'Phone Camera',
    description: 'Use your smartphone as a wireless camera',
    color: 'bg-emerald-500',
    steps: ['Click "Add" below', 'Scan QR code with your phone', 'Tap "Start Streaming" on phone'],
  },
  {
    id: 'ip_camera',
    icon: Wifi,
    title: 'IP Camera / WiFi Camera',
    description: 'Connect a network camera (Wyze, Nest, etc.)',
    color: 'bg-purple-500',
    steps: ['Find camera\'s IP address in its app', 'Enter the stream URL', 'Test connection'],
  },
  {
    id: 'rtsp',
    icon: Video,
    title: 'Security Camera (RTSP)',
    description: 'Connect professional security cameras',
    color: 'bg-orange-500',
    steps: ['Get RTSP URL from camera settings', 'Enter URL with credentials', 'Test connection'],
  },
  {
    id: 'file',
    icon: FileVideo,
    title: 'Video File',
    description: 'Analyze a recorded video file',
    color: 'bg-pink-500',
    steps: ['Select a video file from your computer', 'Upload and process', 'View analysis results'],
  },
];

export default function VideoSources() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
  });

  // Mock data - in production, this would come from the database
  const [sources, setSources] = useState<VideoSource[]>([
    {
      id: '1',
      name: 'Built-in Webcam',
      type: 'webcam',
      status: 'connected',
    },
  ]);

  const handleSelectType = (typeId: string) => {
    setSelectedType(typeId);
    setIsAddDialogOpen(true);
    setNewSource({ name: '', url: '', username: '', password: '' });
  };

  const handleAddSource = () => {
    if (!newSource.name.trim()) {
      toast.error('Please enter a name for this camera');
      return;
    }

    if (selectedType !== 'webcam' && selectedType !== 'phone' && !newSource.url.trim()) {
      toast.error('Please enter the camera URL');
      return;
    }

    const newVideoSource: VideoSource = {
      id: Date.now().toString(),
      name: newSource.name,
      type: selectedType as VideoSource['type'],
      url: newSource.url,
      status: 'disconnected',
    };

    setSources([...sources, newVideoSource]);
    setIsAddDialogOpen(false);
    setSelectedType(null);
    setNewSource({ name: '', url: '', username: '', password: '' });
    toast.success('Camera added successfully! You can now use it in your sessions.');
  };

  const handleTestConnection = (source: VideoSource) => {
    toast.info(`Testing connection to ${source.name}...`);
    setTimeout(() => {
      setSources(sources.map(s => 
        s.id === source.id ? { ...s, status: 'connected' as const } : s
      ));
      toast.success(`✓ Connected to ${source.name}`);
    }, 2000);
  };

  const handleRemoveSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id));
    toast.success('Camera removed');
  };

  const getSourceIcon = (type: VideoSource['type']) => {
    switch (type) {
      case 'webcam': return <Monitor className="w-5 h-5" />;
      case 'phone': return <Smartphone className="w-5 h-5" />;
      case 'ip_camera': return <Wifi className="w-5 h-5" />;
      case 'rtsp': return <Video className="w-5 h-5" />;
      case 'file': return <FileVideo className="w-5 h-5" />;
      default: return <Camera className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: VideoSource['status']) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Ready
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="secondary" className="bg-slate-700 text-slate-300">
            <XCircle className="w-3 h-3 mr-1" />
            Not Connected
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
    }
  };

  const renderAddDialog = () => {
    const deviceType = deviceTypes.find(d => d.id === selectedType);
    if (!deviceType) return null;

    return (
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) setSelectedType(null);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${deviceType.color}`}>
                <deviceType.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle>Add {deviceType.title}</DialogTitle>
                <DialogDescription>{deviceType.description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Step indicator */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                How it works:
              </h4>
              <ol className="space-y-2">
                {deviceType.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-slate-400 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Name input - always shown */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">
                Give it a name (so you can identify it later)
              </Label>
              <Input
                id="name"
                placeholder="e.g., Conference Room, Classroom Front, etc."
                value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>

            {/* Type-specific inputs */}
            {(selectedType === 'ip_camera' || selectedType === 'rtsp') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="url" className="text-slate-300">
                    {selectedType === 'ip_camera' ? 'Camera URL' : 'RTSP Stream URL'}
                  </Label>
                  <Input
                    id="url"
                    placeholder={selectedType === 'ip_camera' 
                      ? 'http://192.168.1.100:8080/video' 
                      : 'rtsp://192.168.1.100:554/stream'}
                    value={newSource.url}
                    onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                    className="bg-slate-800 border-slate-700 font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500">
                    {selectedType === 'ip_camera' 
                      ? '💡 Tip: You can usually find this in your camera\'s mobile app under "Settings" or "Network"'
                      : '💡 Tip: Check your camera\'s manual or settings page for the RTSP URL'}
                  </p>
                </div>

                {/* Optional credentials */}
                <div className="space-y-3">
                  <Label className="text-slate-300 text-sm">
                    Login credentials (if your camera requires them)
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Username"
                      value={newSource.username}
                      onChange={(e) => setNewSource({ ...newSource, username: e.target.value })}
                      className="bg-slate-800 border-slate-700"
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={newSource.password}
                      onChange={(e) => setNewSource({ ...newSource, password: e.target.value })}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>

                {/* Help section */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Need help finding your camera's URL?
                  </h4>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• <strong>Wyze:</strong> Enable RTSP in Wyze app → Camera Settings → Advanced</li>
                    <li>• <strong>Nest/Google:</strong> Use the Google Home app to find stream URL</li>
                    <li>• <strong>Hikvision:</strong> Usually rtsp://[IP]:554/Streaming/Channels/101</li>
                    <li>• <strong>Dahua:</strong> Usually rtsp://[IP]:554/cam/realmonitor?channel=1</li>
                  </ul>
                </div>
              </>
            )}

            {selectedType === 'file' && (
              <div className="space-y-2">
                <Label htmlFor="file" className="text-slate-300">
                  Select video file
                </Label>
                <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-slate-600 transition-colors cursor-pointer">
                  <Upload className="w-10 h-10 mx-auto mb-3 text-slate-500" />
                  <p className="text-sm text-slate-400 mb-1">
                    Click to select or drag & drop
                  </p>
                  <p className="text-xs text-slate-500">
                    MP4, MOV, AVI, WebM (max 500MB)
                  </p>
                </div>
              </div>
            )}

            {selectedType === 'webcam' && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <p className="text-sm text-emerald-400">
                  ✓ Your webcam will be automatically detected when you start a monitoring session.
                  Just make sure to allow camera access when your browser asks.
                </p>
              </div>
            )}

            {selectedType === 'phone' && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <p className="text-sm text-emerald-400">
                  ✓ After adding, you'll be able to scan a QR code with your phone to connect it wirelessly.
                  Make sure both devices are on the same WiFi network.
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddDialogOpen(false);
                setSelectedType(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleAddSource} className="flex-1 bg-blue-500 hover:bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Camera
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Video Sources</h1>
          <p className="text-slate-400">
            Connect your cameras to monitor audience engagement. Choose from the options below.
          </p>
        </div>

        {/* Quick Start Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Add a Camera
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deviceTypes.map((device) => (
              <Card
                key={device.id}
                className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all cursor-pointer group"
                onClick={() => handleSelectType(device.id)}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${device.color} group-hover:scale-110 transition-transform`}>
                      <device.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1">{device.title}</h3>
                      <p className="text-sm text-slate-400 line-clamp-2">{device.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Connected Sources */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            Your Cameras
            <Badge variant="secondary" className="ml-2">{sources.length}</Badge>
          </h2>

          {sources.length === 0 ? (
            <Card className="bg-slate-800/30 border-slate-700 border-dashed">
              <div className="p-12 text-center">
                <Camera className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                <h3 className="text-lg font-medium text-slate-400 mb-2">No cameras connected yet</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Choose a camera type above to get started
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {sources.map((source) => (
                <Card key={source.id} className="bg-slate-800/50 border-slate-700">
                  <div className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-slate-700/50">
                      {getSourceIcon(source.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white">{source.name}</h3>
                      <p className="text-sm text-slate-400 capitalize">
                        {source.type.replace('_', ' ')}
                        {source.url && ` • ${source.url}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(source.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestConnection(source)}
                        className="text-slate-400 hover:text-white"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Test
                      </Button>
                      {source.type !== 'webcam' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSource(source.id)}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8">
          <Card className="bg-slate-800/30 border-slate-700">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                Need Help?
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium text-white mb-2">📱 Using Your Phone</h4>
                  <p className="text-sm text-slate-400">
                    The easiest way to start! Just add a "Phone Camera", scan the QR code, and you're ready to go.
                    Works with any smartphone.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">🎥 IP Cameras</h4>
                  <p className="text-sm text-slate-400">
                    Most WiFi cameras have a streaming URL. Check your camera's app settings or manual
                    for the "Stream URL" or "RTSP address".
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">🔒 Security Cameras</h4>
                  <p className="text-sm text-slate-400">
                    Professional cameras use RTSP protocol. You'll need the camera's IP address
                    and login credentials from your DVR/NVR system.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Add Dialog */}
        {renderAddDialog()}
      </div>
    </AppLayout>
  );
}
