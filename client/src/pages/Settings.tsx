import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  Save,
  Volume2,
  Smartphone,
  Mail,
  Eye,
  User,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { PushoverSettings } from '@/components/PushoverSettings';

export default function Settings() {
  const { user } = useAuth();
  const { data: preferences, refetch } = trpc.notifications.getPreferences.useQuery();
  const updatePreferencesMutation = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success('Preferences saved successfully');
      refetch();
    },
  });

  const [localPrefs, setLocalPrefs] = useState({
    enableVibration: true,
    enableSound: true,
    enableVisual: true,
    enableEmail: false,
    enablePush: true,
    soundType: 'default',
  });
  const [soundVolume, setSoundVolume] = useState(70);

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        enableVibration: preferences.enableVibration,
        enableSound: preferences.enableSound,
        enableVisual: preferences.enableVisual,
        enableEmail: preferences.enableEmail,
        enablePush: preferences.enablePush,
        soundType: preferences.soundType || 'default',
      });
    }
  }, [preferences]);

  const handleSave = () => {
    updatePreferencesMutation.mutate(localPrefs);
  };

  const testAlert = () => {
    if (localPrefs.enableVibration && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    if (localPrefs.enableSound) {
      const audio = new Audio('/alert-sound.mp3');
      audio.volume = soundVolume / 100;
      audio.play().catch(() => {});
    }
    toast.info('Test alert triggered!');
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your notification preferences and account settings
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Card */}
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">{user?.name || 'User'}</h2>
                <p className="text-sm text-muted-foreground">{user?.email || ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Role: {user?.role || 'User'}</span>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Notification Preferences</h2>
                <p className="text-sm text-muted-foreground">
                  Choose how you want to receive alerts
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Vibration */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="font-medium">Vibration Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Vibrate your device when alerts are triggered
                    </p>
                  </div>
                </div>
                <Switch
                  checked={localPrefs.enableVibration}
                  onCheckedChange={(checked) =>
                    setLocalPrefs({ ...localPrefs, enableVibration: checked })
                  }
                />
              </div>

              {/* Sound */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium">Sound Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Play a sound when alerts are triggered
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={localPrefs.enableSound}
                    onCheckedChange={(checked) =>
                      setLocalPrefs({ ...localPrefs, enableSound: checked })
                    }
                  />
                </div>

                {localPrefs.enableSound && (
                  <div className="ml-8 space-y-4 p-4 bg-muted/30 rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-sm">Sound Type</Label>
                      <Select
                        value={localPrefs.soundType}
                        onValueChange={(value) =>
                          setLocalPrefs({ ...localPrefs, soundType: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="gentle">Gentle</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="chime">Chime</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Volume</Label>
                        <span className="text-sm text-muted-foreground">
                          {soundVolume}%
                        </span>
                      </div>
                      <Slider
                        value={[soundVolume]}
                        onValueChange={(value) => setSoundVolume(value[0])}
                        min={0}
                        max={100}
                        step={10}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Visual */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="font-medium">Visual Indicators</Label>
                    <p className="text-sm text-muted-foreground">
                      Show visual alerts on the dashboard
                    </p>
                  </div>
                </div>
                <Switch
                  checked={localPrefs.enableVisual}
                  onCheckedChange={(checked) =>
                    setLocalPrefs({ ...localPrefs, enableVisual: checked })
                  }
                />
              </div>

              {/* Email */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="font-medium">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email summaries after sessions
                    </p>
                  </div>
                </div>
                <Switch
                  checked={localPrefs.enableEmail}
                  onCheckedChange={(checked) =>
                    setLocalPrefs({ ...localPrefs, enableEmail: checked })
                  }
                />
              </div>

              {/* Push */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="font-medium">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive browser push notifications
                    </p>
                  </div>
                </div>
                <Switch
                  checked={localPrefs.enablePush}
                  onCheckedChange={(checked) =>
                    setLocalPrefs({ ...localPrefs, enablePush: checked })
                  }
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-6 border-t border-border">
              <Button
                onClick={handleSave}
                disabled={updatePreferencesMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={testAlert}>
                Test Alert
              </Button>
            </div>
          </Card>

          {/* Smartwatch Alerts */}
          <PushoverSettings />

          {/* Info Card */}
          <Card className="p-5 bg-muted/30">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-medium mb-1">About Alerts</h3>
                <p className="text-sm text-muted-foreground">
                  Alerts are triggered when the percentage of disengaged audience members
                  exceeds your configured threshold. You can adjust the threshold for each
                  session individually. Multiple alert channels can be enabled simultaneously
                  for maximum awareness.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
