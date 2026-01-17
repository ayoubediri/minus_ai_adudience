import QRCode from 'qrcode';

export interface PhoneCameraLinkData {
  roomId: string;
  pushUrl: string;
  viewUrl: string;
  qrData: string;
}

/**
 * Generate unique room ID for vdo.ninja
 */
function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(-4);
}

/**
 * Generate phone camera link data using vdo.ninja
 */
export function generatePhoneCameraLink(): PhoneCameraLinkData {
  const roomId = generateRoomId();

  return {
    roomId,
    // URL for the phone to push video
    pushUrl: `https://vdo.ninja/?push=${roomId}&quality=1&stereo=0&webcam`,
    // URL for the app to receive video (iframe embed)
    viewUrl: `https://vdo.ninja/?view=${roomId}&cleanoutput&autostart`,
    // Data for QR code
    qrData: `https://vdo.ninja/?push=${roomId}&quality=1&webcam`,
  };
}

/**
 * Generate QR code as data URL
 */
export async function generateQRCode(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('[PhoneCameraLink] Failed to generate QR code:', error);
    throw error;
  }
}

/**
 * Create an iframe element for receiving phone camera stream
 */
export function createPhoneCameraIframe(viewUrl: string): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.src = viewUrl;
  iframe.allow = 'autoplay; camera; microphone';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.backgroundColor = '#000';
  return iframe;
}

/**
 * Storage keys for phone camera settings
 */
const STORAGE_KEY = 'fidget_phone_camera';

/**
 * Save phone camera link to localStorage
 */
export function savePhoneCameraLink(linkData: PhoneCameraLinkData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...linkData,
    savedAt: new Date().toISOString(),
  }));
}

/**
 * Get saved phone camera link from localStorage
 */
export function getSavedPhoneCameraLink(): PhoneCameraLinkData | null {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  
  try {
    const parsed = JSON.parse(data);
    // Check if link is less than 1 hour old
    const savedAt = new Date(parsed.savedAt);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (savedAt > hourAgo) {
      return parsed;
    }
    
    // Link expired, remove it
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear saved phone camera link
 */
export function clearPhoneCameraLink(): void {
  localStorage.removeItem(STORAGE_KEY);
}
