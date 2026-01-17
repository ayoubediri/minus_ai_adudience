import QRCode from 'qrcode';

/**
 * WebRTC-based phone camera streaming
 * This allows direct access to the video stream for face detection processing
 */

export interface PhoneCameraConnection {
  roomId: string;
  phoneUrl: string;
  qrCodeDataUrl: string;
  peerConnection: RTCPeerConnection | null;
  videoStream: MediaStream | null;
}

// Signaling server simulation using BroadcastChannel (works in same browser)
// For production, you'd use a WebSocket signaling server
const SIGNALING_PREFIX = 'phone_camera_signal_';

/**
 * Generate a unique room ID
 */
function generateRoomId(): string {
  return 'room_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4);
}

/**
 * Create a phone camera connection manager
 */
export class PhoneCameraManager {
  private roomId: string;
  private peerConnection: RTCPeerConnection | null = null;
  private videoStream: MediaStream | null = null;
  private onStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  private signalChannel: BroadcastChannel | null = null;
  private isHost: boolean = true;

  constructor() {
    this.roomId = generateRoomId();
  }

  /**
   * Get the URL for the phone to connect
   */
  getPhoneUrl(): string {
    // Use the current origin for the phone page
    const origin = window.location.origin;
    return `${origin}/phone-camera?room=${this.roomId}`;
  }

  /**
   * Generate QR code for the phone URL
   */
  async generateQRCode(): Promise<string> {
    const phoneUrl = this.getPhoneUrl();
    return await QRCode.toDataURL(phoneUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  }

  /**
   * Get room ID
   */
  getRoomId(): string {
    return this.roomId;
  }

  /**
   * Set callback for when video stream is received
   */
  onStream(callback: (stream: MediaStream) => void): void {
    this.onStreamCallback = callback;
  }

  /**
   * Set callback for when connection is lost
   */
  onDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback;
  }

  /**
   * Start listening for phone connection (host mode)
   */
  async startListening(): Promise<void> {
    this.isHost = true;
    
    // Create signaling channel
    this.signalChannel = new BroadcastChannel(SIGNALING_PREFIX + this.roomId);
    
    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Handle incoming tracks
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Received track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        this.videoStream = event.streams[0];
        if (this.onStreamCallback) {
          this.onStreamCallback(event.streams[0]);
        }
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.signalChannel) {
        this.signalChannel.postMessage({
          type: 'ice-candidate',
          candidate: event.candidate,
          from: 'host',
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'disconnected' ||
          this.peerConnection?.connectionState === 'failed') {
        if (this.onDisconnectCallback) {
          this.onDisconnectCallback();
        }
      }
    };

    // Listen for signaling messages
    this.signalChannel.onmessage = async (event) => {
      const message = event.data;
      
      if (message.from === 'host') return; // Ignore our own messages
      
      console.log('[WebRTC] Received signal:', message.type);

      if (message.type === 'offer' && this.peerConnection) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        
        this.signalChannel?.postMessage({
          type: 'answer',
          answer: answer,
          from: 'host',
        });
      } else if (message.type === 'ice-candidate' && this.peerConnection) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        } catch (e) {
          console.error('[WebRTC] Error adding ICE candidate:', e);
        }
      }
    };

    console.log('[WebRTC] Host listening on room:', this.roomId);
  }

  /**
   * Get the current video stream
   */
  getVideoStream(): MediaStream | null {
    return this.videoStream;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.peerConnection?.connectionState === 'connected';
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.signalChannel) {
      this.signalChannel.close();
      this.signalChannel = null;
    }
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    console.log('[WebRTC] Disconnected');
  }
}

/**
 * Phone-side connection (used on the phone camera page)
 */
export class PhoneCameraSender {
  private roomId: string;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private signalChannel: BroadcastChannel | null = null;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  /**
   * Start sending camera stream
   */
  async startSending(): Promise<void> {
    // Get camera access
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment', // Use back camera by default
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    // Create signaling channel
    this.signalChannel = new BroadcastChannel(SIGNALING_PREFIX + this.roomId);

    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Add tracks to peer connection
    this.localStream.getTracks().forEach(track => {
      if (this.peerConnection && this.localStream) {
        this.peerConnection.addTrack(track, this.localStream);
      }
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.signalChannel) {
        this.signalChannel.postMessage({
          type: 'ice-candidate',
          candidate: event.candidate,
          from: 'phone',
        });
      }
    };

    // Listen for signaling messages
    this.signalChannel.onmessage = async (event) => {
      const message = event.data;
      
      if (message.from === 'phone') return; // Ignore our own messages
      
      console.log('[WebRTC Phone] Received signal:', message.type);

      if (message.type === 'answer' && this.peerConnection) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
      } else if (message.type === 'ice-candidate' && this.peerConnection) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        } catch (e) {
          console.error('[WebRTC Phone] Error adding ICE candidate:', e);
        }
      }
    };

    // Create and send offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    
    this.signalChannel.postMessage({
      type: 'offer',
      offer: offer,
      from: 'phone',
    });

    console.log('[WebRTC Phone] Sending stream on room:', this.roomId);
  }

  /**
   * Get local stream for preview
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera(): Promise<void> {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    const currentFacingMode = videoTrack.getSettings().facingMode;
    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';

    // Stop current track
    videoTrack.stop();

    // Get new stream with different camera
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: newFacingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    const newVideoTrack = newStream.getVideoTracks()[0];
    
    // Replace track in peer connection
    const sender = this.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
    if (sender) {
      await sender.replaceTrack(newVideoTrack);
    }

    // Update local stream
    this.localStream = newStream;
  }

  /**
   * Stop sending
   */
  stop(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.signalChannel) {
      this.signalChannel.close();
      this.signalChannel = null;
    }
  }
}
