import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Watch, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { alertManager } from '@/lib/alertManager';

export function PushoverSettings() {
  const [enabled, setEnabled] = useState(false);
  const [userKey, setUserKey] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Load saved settings
  useEffect(() => {
    const settings = alertManager.getSettings();
    setEnabled(settings.enablePushover);
    setUserKey(settings.pushoverUserKey);
    setApiToken(settings.pushoverApiToken);
  }, []);

  // Save settings when changed
  const saveSettings = () => {
    alertManager.updateSettings({
      enablePushover: enabled,
      pushoverUserKey: userKey,
      pushoverApiToken: apiToken,
    });
    toast.success('Pushover settings saved');
  };

  // Test Pushover connection
  const testConnection = async () => {
    if (!userKey || !apiToken) {
      toast.error('Please enter both User Key and API Token');
      return;
    }

    setTestStatus('testing');

    try {
      const response = await fetch('https://api.pushover.net/1/messages.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: apiToken,
          user: userKey,
          message: '✅ Fidget Index test notification - Your smartwatch alerts are working!',
          title: 'Fidget Index',
          priority: 0,
        }),
      });

      if (response.ok) {
        setTestStatus('success');
        toast.success('Test notification sent! Check your smartwatch.');
      } else {
        const data = await response.json();
        setTestStatus('error');
        toast.error(`Failed: ${data.errors?.join(', ') || 'Unknown error'}`);
      }
    } catch (error) {
      setTestStatus('error');
      toast.error('Failed to send test notification');
    }

    // Reset status after 3 seconds
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Watch className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Smartwatch Alerts</h3>
          <p className="text-sm text-muted-foreground">
            Receive alerts on your smartwatch via Pushover
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div>
            <Label>Enable Smartwatch Alerts</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Send alerts to your smartwatch when engagement drops
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => {
              setEnabled(checked);
              alertManager.updateSettings({ enablePushover: checked });
            }}
          />
        </div>

        {enabled && (
          <>
            {/* Setup Instructions */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Setup Instructions:</h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>
                  Download Pushover app on your phone:{' '}
                  <a
                    href="https://pushover.net/clients"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    iOS/Android <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Create a free account at pushover.net</li>
                <li>Copy your User Key from the dashboard</li>
                <li>
                  Create an Application at{' '}
                  <a
                    href="https://pushover.net/apps/build"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    pushover.net/apps <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Copy the API Token from your new app</li>
                <li>Enable smartwatch notifications in Pushover app settings</li>
              </ol>
            </div>

            {/* User Key */}
            <div className="space-y-2">
              <Label htmlFor="userKey">Pushover User Key</Label>
              <Input
                id="userKey"
                type="password"
                placeholder="Enter your Pushover User Key"
                value={userKey}
                onChange={(e) => setUserKey(e.target.value)}
              />
            </div>

            {/* API Token */}
            <div className="space-y-2">
              <Label htmlFor="apiToken">Pushover API Token</Label>
              <Input
                id="apiToken"
                type="password"
                placeholder="Enter your Application API Token"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={saveSettings}>
                Save Settings
              </Button>
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={testStatus === 'testing'}
              >
                {testStatus === 'testing' ? (
                  'Sending...'
                ) : testStatus === 'success' ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    Sent!
                  </>
                ) : testStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                    Failed
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
            </div>

            {/* Status */}
            {userKey && apiToken && (
              <div className="flex items-center gap-2 pt-2">
                <Badge variant={enabled ? 'default' : 'secondary'}>
                  {enabled ? 'Active' : 'Disabled'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Alerts will be sent to your Pushover-connected devices
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
