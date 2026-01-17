import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Camera,
  Plus,
  Video,
  Wifi,
  Upload,
  Trash2,
  Settings,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';

interface VideoSource {
  id: string;
  name: string;
  type: 'webcam' | 'ip_camera' | 'rtsp' | 'file';
  url?: string;
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: Date;
}

export default function VideoSources() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [sourceType, setSourceType] = useState<string>('ip_camera');
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

  const handleAddSource = () => {
    if (!newSource.name.trim()) {
      toast.error('Please enter a source name');
      return;
    }

    if (sourceType !== 'webcam' && !newSource.url.trim()) {
      toast.error('Please enter a URL or file path');
      return;
    }

    const newVideoSource: VideoSource = {
      id: Date.now().toString(),
      name: newSource.name,
      type: sourceType as VideoSource['type'],
      url: newSource.url,
      status: 'disconnected',
    };

    setSources([...sources, newVideoSource]);
    setIsAddDialogOpen(false);
    setNewSource({ name: '', url: '', username: '', password: '' });
    toast.success('Video source added successfully');
  };

  const handleTestConnection = (source: VideoSource) => {
    toast.info(`Testing connection to ${source.name}...`);
    // Simulate connection test
    setTimeout(() => {
      setSources(sources.map(s => 
        s.id === source.id ? { ...s, status: 'connected' as const } : s
      ));
      toast.success(`Connected to ${source.name}`);
    }, 2000);
  };

  const handleRemoveSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id));
    toast.success('Video source removed');
  };

  const getSourceIcon = (type: VideoSource['type']) => {
    switch (type) {
      case 'webcam':
        return <Camera className="w-5 h-5" />;
      case 'ip_camera':
        return <Wifi className="w-5 h-5" />;
      case 'rtsp':
        return <Video className="w-5 h-5" />;
      case 'file':
        return <Upload className="w-5 h-5" />;
      default:
        return <Camera className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: VideoSource['status']) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            Disconnected
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

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Video Sources</h1>
            <p className="text-muted-foreground mt-1">
              Connect cameras and video streams for audience monitoring
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Source
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Add Video Source</DialogTitle>
                <DialogDescription>
                  Connect a new camera or video stream for audience analysis
                </DialogDescription>
              </DialogHeader>

              <Tabs value={sourceType} onValueChange={setSourceType} className="mt-4">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="webcam">Webcam</TabsTrigger>
                  <TabsTrigger value="ip_camera">IP Camera</TabsTrigger>
                  <TabsTrigger value="rtsp">RTSP</TabsTrigger>
                  <TabsTrigger value="file">Video File</TabsTrigger>
                </TabsList>

                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Source Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Conference Room Camera"
                      value={newSource.name}
                      onChange={(e) =>
                        setNewSource({ ...newSource, name: e.target.value })
                      }
                    />
                  </div>

                  <TabsContent value="webcam" className="mt-0 space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Your browser will request permission to access your webcam when you start a monitoring session.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Select Camera</Label>
                      <Select defaultValue="default">
                        <SelectTrigger>
                          <SelectValue placeholder="Select webcam" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default Camera</SelectItem>
                          <SelectItem value="front">Front Camera</SelectItem>
                          <SelectItem value="back">Back Camera</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="ip_camera" className="mt-0 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ip_url">Camera URL</Label>
                      <Input
                        id="ip_url"
                        placeholder="http://192.168.1.100:8080/video"
                        value={newSource.url}
                        onChange={(e) =>
                          setNewSource({ ...newSource, url: e.target.value })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the HTTP stream URL of your IP camera
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username (Optional)</Label>
                        <Input
                          id="username"
                          placeholder="admin"
                          value={newSource.username}
                          onChange={(e) =>
                            setNewSource({ ...newSource, username: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password (Optional)</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={newSource.password}
                          onChange={(e) =>
                            setNewSource({ ...newSource, password: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="rtsp" className="mt-0 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="rtsp_url">RTSP Stream URL</Label>
                      <Input
                        id="rtsp_url"
                        placeholder="rtsp://192.168.1.100:554/stream"
                        value={newSource.url}
                        onChange={(e) =>
                          setNewSource({ ...newSource, url: e.target.value })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the RTSP stream URL (commonly used by security cameras)
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rtsp_username">Username (Optional)</Label>
                        <Input
                          id="rtsp_username"
                          placeholder="admin"
                          value={newSource.username}
                          onChange={(e) =>
                            setNewSource({ ...newSource, username: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rtsp_password">Password (Optional)</Label>
                        <Input
                          id="rtsp_password"
                          type="password"
                          placeholder="••••••••"
                          value={newSource.password}
                          onChange={(e) =>
                            setNewSource({ ...newSource, password: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="file" className="mt-0 space-y-4">
                    <div className="space-y-2">
                      <Label>Upload Video File</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                        <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm font-medium mb-1">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          MP4, WebM, or AVI (max 500MB)
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="file_url">Or enter file URL</Label>
                      <Input
                        id="file_url"
                        placeholder="https://example.com/video.mp4"
                        value={newSource.url}
                        onChange={(e) =>
                          setNewSource({ ...newSource, url: e.target.value })
                        }
                      />
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddSource}>Add Source</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Card */}
        <Card className="p-5 mb-8 bg-primary/5 border-primary/20">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Supported Video Sources</h3>
              <p className="text-sm text-muted-foreground">
                Connect webcams, IP cameras, RTSP streams, or upload video files for analysis. 
                Multiple sources can be used simultaneously during a monitoring session.
              </p>
            </div>
          </div>
        </Card>

        {/* Sources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sources.map((source) => (
            <Card key={source.id} className="p-5">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      {getSourceIcon(source.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{source.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">
                        {source.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(source.status)}
                </div>

                {/* URL */}
                {source.url && (
                  <div className="text-sm text-muted-foreground truncate bg-muted/50 px-3 py-2 rounded-md">
                    {source.url}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleTestConnection(source)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Test
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Settings className="w-4 h-4" />
                  </Button>
                  {source.type !== 'webcam' && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveSource(source.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {/* Add New Card */}
          <Card
            className="p-5 border-dashed cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <div className="h-full flex flex-col items-center justify-center text-center py-6">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">Add Video Source</p>
              <p className="text-sm text-muted-foreground">
                Connect a camera or upload video
              </p>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
