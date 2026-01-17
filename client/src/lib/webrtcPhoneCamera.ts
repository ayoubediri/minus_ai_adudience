import QRCode from 'qrcode';
import { io, Socket } from 'socket.io-client';

/**
 * WebRTC-based phone camera streaming with Socket.IO signaling
 * This allows direct access to the video stream for face detection processing
 * Works across different devices and networks
 */

export interface PhoneCameraConnection {
  roomId: string;
  phoneUrl: string;
  qrCodeDataUrl: string;
  peerConnection: RTCPeerConnection | null;
  videoStream: MediaStream | null;
}

/**
 * Generate a unique room ID
 */
function generateRoomId(): string {
  return 'room_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4);
}

/**
 * Create a phone camera connection manager (Host side - runs on computer)
 */
export class PhoneCameraManager {
  private roomId: string;
  private peerConnection: RTCPeerConnection | null = null;
  private videoStream: MediaStream | null = null;
  private onStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  private socket: Socket | null = null;

  constructor() {
    this.roomId = generateRoomId();
  }

  /**
   * Get the URL for the phone to connect
   */
  getPhoneUrl(): string {
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
    // Connect to signaling server
    const socketUrl = window.location.origin;
    this.socket = io(socketUrl, {
      path: '/api/signaling',
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[WebRTC Host] Connected to signaling server');
      this.socket?.emit('join-room', { roomId: this.roomId, role: 'host' });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebRTC Host] Connection error:', error);
    });

    // When phone joins
    this.socket.on('peer-joined', (data: { role: string }) => {
      console.log('[WebRTC Host] Peer joined:', data.role);
    });

    // Handle signaling messages from phone
    this.socket.on('signal', async (message: any) => {
      console.log('[WebRTC Host] Received signal:', message.type);

      if (message.type === 'offer') {
        await this.handleOffer(message.offer);
      } else if (message.type === 'ice-candidate' && this.peerConnection) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        } catch (e) {
          console.error('[WebRTC Host] Error adding ICE candidate:', e);
        }
      }
    });

    // Handle peer disconnection
    this.socket.on('peer-left', () => {
      console.log('[WebRTC Host] Phone disconnected');
      if (this.onDisconnectCallback) {
        this.onDisconnectCallback();
      }
    });

    console.log('[WebRTC Host] Listening on room:', this.roomId);
  }

  /**
   * Handle incoming offer from phone
   */
  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    });

    // Handle incoming tracks
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC Host] Received track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        this.videoStream = event.streams[0];
        if (this.onStreamCallback) {
          this.onStreamCallback(event.streams[0]);
        }
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('signal', {
          type: 'ice-candidate',
          roomId: this.roomId,
          from: 'host',
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC Host] Connection state:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'disconnected' ||
          this.peerConnection?.connectionState === 'failed') {
        if (this.onDisconnectCallback) {
          this.onDisconnectCallback();
        }
      }
    };

    // Set remote description and create answer
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    // Send answer to phone
    this.socket?.emit('signal', {
      type: 'answer',
      roomId: this.roomId,
      from: 'host',
      answer: answer,
    });
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
    if (this.socket) {
      this.socket.emit('leave-room');
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    console.log('[WebRTC Host] Disconnected');
  }
}

/**
 * Phone-side connection (used on the phone camera page)
 */
export class PhoneCameraSender {
  private roomId: string;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private socket: Socket | null = null;
  private onConnectedCallback: (() => void) | null = null;
  private onDisconnectedCallback: (() => void) | null = null;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  /**
   * Set callback for when connected
   */
  onConnected(callback: () => void): void {
    this.onConnectedCallback = callback;
  }

  /**
   * Set callback for when disconnected
   */
  onDisconnected(callback: () => void): void {
    this.onDisconnectedCallback = callback;
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

    // Connect to signaling server
    const socketUrl = window.location.origin;
    this.socket = io(socketUrl, {
      path: '/api/signaling',
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[WebRTC Phone] Connected to signaling server');
      this.socket?.emit('join-room', { roomId: this.roomId, role: 'phone' });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebRTC Phone] Connection error:', error);
    });

    // When host is ready or already present
    this.socket.on('peer-joined', async (data: { role: string }) => {
      console.log('[WebRTC Phone] Peer joined:', data.role);
      if (data.role === 'host') {
        await this.createOfferAndSend();
      }
    });

    // Handle signaling messages from host
    this.socket.on('signal', async (message: any) => {
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
    });

    // Handle host disconnection
    this.socket.on('peer-left', () => {
      console.log('[WebRTC Phone] Host disconnected');
      if (this.onDisconnectedCallback) {
        this.onDisconnectedCallback();
      }
    });

    // Wait a moment then check if host is already there
    setTimeout(async () => {
      // Create offer immediately - host might already be waiting
      await this.createOfferAndSend();
    }, 500);

    console.log('[WebRTC Phone] Sending stream on room:', this.roomId);
  }

  /**
   * Create WebRTC offer and send to host
   */
  private async createOfferAndSend(): Promise<void> {
    if (this.peerConnection) {
      // Already have a connection
      return;
    }

    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    });

    // Add tracks to peer connection
    this.localStream?.getTracks().forEach(track => {
      if (this.peerConnection && this.localStream) {
        this.peerConnection.addTrack(track, this.localStream);
      }
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('signal', {
          type: 'ice-candidate',
          roomId: this.roomId,
          from: 'phone',
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC Phone] Connection state:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'connected') {
        if (this.onConnectedCallback) {
          this.onConnectedCallback();
        }
      } else if (this.peerConnection?.connectionState === 'disconnected' ||
                 this.peerConnection?.connectionState === 'failed') {
        if (this.onDisconnectedCallback) {
          this.onDisconnectedCallback();
        }
      }
    };

    // Create and send offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.socket?.emit('signal', {
      type: 'offer',
      roomId: this.roomId,
      from: 'phone',
      offer: offer,
    });

    console.log('[WebRTC Phone] Offer sent');
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
   * Check if connected
   */
  isConnected(): boolean {
    return this.peerConnection?.connectionState === 'connected';
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
    if (this.socket) {
      this.socket.emit('leave-room');
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
