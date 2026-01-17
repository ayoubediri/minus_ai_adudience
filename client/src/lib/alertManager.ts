export type AlertLevel = 'critical' | 'warning' | 'info';

export interface AlertEvent {
  id: string;
  timestamp: Date;
  level: AlertLevel;
  message: string;
  engagement: number;
}

export interface AlertSettings {
  criticalThreshold: number; // Below this = critical (default 40)
  warningThreshold: number;  // Below this = warning (default 60)
  cooldownMs: number;        // Time between alerts (default 30000)
  enableSound: boolean;
  enableVibration: boolean;
  enableVisual: boolean;
  enablePushover: boolean;
  pushoverUserKey: string;
  pushoverApiToken: string;
}

const DEFAULT_SETTINGS: AlertSettings = {
  criticalThreshold: 40,
  warningThreshold: 60,
  cooldownMs: 30000,
  enableSound: true,
  enableVibration: true,
  enableVisual: true,
  enablePushover: false,
  pushoverUserKey: '',
  pushoverApiToken: '',
};

const STORAGE_KEY = 'fidget_alert_settings';

export class AlertManager {
  private lastAlertTime = 0;
  private settings: AlertSettings;
  private alertHistory: AlertEvent[] = [];
  private onAlertCallback?: (alert: AlertEvent) => void;
  private audioContext?: AudioContext;

  constructor() {
    this.settings = this.loadSettings();
  }

  /**
   * Set callback for when alerts are triggered
   */
  onAlert(callback: (alert: AlertEvent) => void): void {
    this.onAlertCallback = callback;
  }

  /**
   * Check engagement and trigger alerts if needed
   */
  checkAndAlert(avgEngagement: number, boredPercentage: number): AlertEvent | null {
    const now = Date.now();

    // Check cooldown
    if (now - this.lastAlertTime < this.settings.cooldownMs) {
      return null;
    }

    let level: AlertLevel | null = null;
    let message = '';

    // Check for critical alert
    if (avgEngagement < this.settings.criticalThreshold || boredPercentage > 60) {
      level = 'critical';
      message = `⚠️ Critical: Engagement dropped to ${Math.round(avgEngagement)}%! ${Math.round(boredPercentage)}% of audience is disengaged.`;
    }
    // Check for warning alert
    else if (avgEngagement < this.settings.warningThreshold || boredPercentage > 40) {
      level = 'warning';
      message = `⚡ Warning: Engagement at ${Math.round(avgEngagement)}%. ${Math.round(boredPercentage)}% showing signs of disengagement.`;
    }

    if (level) {
      const alert = this.triggerAlert(level, message, avgEngagement);
      this.lastAlertTime = now;
      return alert;
    }

    return null;
  }

  /**
   * Trigger an alert with all enabled channels
   */
  private triggerAlert(level: AlertLevel, message: string, engagement: number): AlertEvent {
    const alert: AlertEvent = {
      id: `alert-${Date.now()}`,
      timestamp: new Date(),
      level,
      message,
      engagement,
    };

    // Add to history
    this.alertHistory.unshift(alert);
    if (this.alertHistory.length > 50) {
      this.alertHistory.pop();
    }

    // Trigger all enabled channels
    if (this.settings.enableSound) {
      this.playSound(level);
    }

    if (this.settings.enableVibration) {
      this.vibrate(level);
    }

    if (this.settings.enablePushover && this.settings.pushoverUserKey && this.settings.pushoverApiToken) {
      this.sendPushoverAlert(level, engagement);
    }

    // Call callback
    if (this.onAlertCallback) {
      this.onAlertCallback(alert);
    }

    return alert;
  }

  /**
   * Play alert sound using Web Audio API
   */
  private playSound(level: AlertLevel): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Different frequencies for different alert levels
      oscillator.frequency.value = level === 'critical' ? 880 : level === 'warning' ? 660 : 440;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();

      // Different durations for different levels
      const duration = level === 'critical' ? 0.5 : 0.3;
      
      // Fade out
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      oscillator.stop(this.audioContext.currentTime + duration);

      // For critical, play a second beep
      if (level === 'critical') {
        setTimeout(() => this.playSound('warning'), 600);
      }
    } catch (error) {
      console.error('[AlertManager] Failed to play sound:', error);
    }
  }

  /**
   * Trigger device vibration
   */
  private vibrate(level: AlertLevel): void {
    if ('vibrate' in navigator) {
      const pattern = level === 'critical'
        ? [500, 100, 500, 100, 500] // Urgent pattern
        : level === 'warning'
        ? [300, 100, 300]           // Warning pattern
        : [200];                     // Info pattern

      navigator.vibrate(pattern);
    }
  }

  /**
   * Send alert to smartwatch via Pushover API
   */
  private async sendPushoverAlert(level: AlertLevel, engagement: number): Promise<void> {
    try {
      const response = await fetch('https://api.pushover.net/1/messages.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: this.settings.pushoverApiToken,
          user: this.settings.pushoverUserKey,
          message: `📉 Engagement dropped to ${Math.round(engagement)}%`,
          title: 'Fidget Index Alert',
          priority: level === 'critical' ? 1 : 0,
          sound: level === 'critical' ? 'siren' : 'pushover',
        }),
      });

      if (!response.ok) {
        console.error('[AlertManager] Pushover API error:', await response.text());
      }
    } catch (error) {
      console.error('[AlertManager] Failed to send Pushover alert:', error);
    }
  }

  /**
   * Get alert history
   */
  getHistory(): AlertEvent[] {
    return [...this.alertHistory];
  }

  /**
   * Clear alert history
   */
  clearHistory(): void {
    this.alertHistory = [];
  }

  /**
   * Get current settings
   */
  getSettings(): AlertSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<AlertSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): AlertSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('[AlertManager] Failed to load settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('[AlertManager] Failed to save settings:', error);
    }
  }

  /**
   * Reset cooldown (allow immediate alert)
   */
  resetCooldown(): void {
    this.lastAlertTime = 0;
  }
}

// Singleton instance
export const alertManager = new AlertManager();
