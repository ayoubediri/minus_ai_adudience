import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
          <p className="text-muted-foreground">
            Configure how you receive engagement alerts during presentations
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="vibration" className="text-base">
                  Vibration Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Vibrate your device when engagement threshold is breached
                </p>
              </div>
              <Switch
                id="vibration"
                checked={localPrefs.enableVibration}
                onCheckedChange={(checked) =>
                  setLocalPrefs({ ...localPrefs, enableVibration: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound" className="text-base">
                  Sound Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Play an alert sound when threshold is breached
                </p>
              </div>
              <Switch
                id="sound"
                checked={localPrefs.enableSound}
                onCheckedChange={(checked) =>
                  setLocalPrefs({ ...localPrefs, enableSound: checked })
                }
              />
            </div>

            {localPrefs.enableSound && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="soundType">Sound Type</Label>
                <Select
                  value={localPrefs.soundType}
                  onValueChange={(value) =>
                    setLocalPrefs({ ...localPrefs, soundType: value })
                  }
                >
                  <SelectTrigger id="soundType">
                    <SelectValue placeholder="Select sound" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="gentle">Gentle</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="chime">Chime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="visual" className="text-base">
                  Visual Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show visual indicators on the dashboard
                </p>
              </div>
              <Switch
                id="visual"
                checked={localPrefs.enableVisual}
                onCheckedChange={(checked) =>
                  setLocalPrefs({ ...localPrefs, enableVisual: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email" className="text-base">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive email alerts for threshold breaches
                </p>
              </div>
              <Switch
                id="email"
                checked={localPrefs.enableEmail}
                onCheckedChange={(checked) =>
                  setLocalPrefs({ ...localPrefs, enableEmail: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push" className="text-base">
                  Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications on your devices
                </p>
              </div>
              <Switch
                id="push"
                checked={localPrefs.enablePush}
                onCheckedChange={(checked) =>
                  setLocalPrefs({ ...localPrefs, enablePush: checked })
                }
              />
            </div>

            <div className="pt-4 border-t flex justify-end">
              <Button
                onClick={handleSave}
                disabled={updatePreferencesMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 mt-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                About Alerts
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
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
  );
}
