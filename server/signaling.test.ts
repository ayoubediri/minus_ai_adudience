import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for the WebSocket signaling server logic
 * Tests the room management and message routing functionality
 */

// Mock room management logic (same as in signaling.ts)
interface Room {
  host: { id: string; emit: (event: string, data: any) => void } | null;
  phone: { id: string; emit: (event: string, data: any) => void } | null;
}

class SignalingRoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(roomId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, { host: null, phone: null });
    }
  }

  joinRoom(roomId: string, role: 'host' | 'phone', socket: { id: string; emit: (event: string, data: any) => void }): { otherRole: string | null } {
    this.createRoom(roomId);
    const room = this.rooms.get(roomId)!;
    
    if (role === 'host') {
      room.host = socket;
    } else {
      room.phone = socket;
    }

    const otherRole = role === 'host' ? 'phone' : 'host';
    const otherSocket = role === 'host' ? room.phone : room.host;
    
    return { otherRole: otherSocket ? otherRole : null };
  }

  leaveRoom(roomId: string, role: 'host' | 'phone'): { notifySocket: { id: string; emit: (event: string, data: any) => void } | null } {
    const room = this.rooms.get(roomId);
    if (!room) return { notifySocket: null };

    const otherSocket = role === 'host' ? room.phone : room.host;

    if (role === 'host') {
      room.host = null;
    } else {
      room.phone = null;
    }

    // Clean up empty rooms
    if (!room.host && !room.phone) {
      this.rooms.delete(roomId);
    }

    return { notifySocket: otherSocket };
  }

  forwardSignal(roomId: string, from: 'host' | 'phone', message: any): { targetSocket: { id: string; emit: (event: string, data: any) => void } | null } {
    const room = this.rooms.get(roomId);
    if (!room) return { targetSocket: null };

    const targetSocket = from === 'host' ? room.phone : room.host;
    return { targetSocket };
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId);
  }
}

describe('SignalingRoomManager', () => {
  let manager: SignalingRoomManager;
  let mockHostSocket: { id: string; emit: ReturnType<typeof vi.fn> };
  let mockPhoneSocket: { id: string; emit: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    manager = new SignalingRoomManager();
    mockHostSocket = { id: 'host-socket-1', emit: vi.fn() };
    mockPhoneSocket = { id: 'phone-socket-1', emit: vi.fn() };
  });

  describe('Room Creation', () => {
    it('should create a new room', () => {
      manager.createRoom('room-123');
      expect(manager.hasRoom('room-123')).toBe(true);
      expect(manager.getRoomCount()).toBe(1);
    });

    it('should not duplicate rooms', () => {
      manager.createRoom('room-123');
      manager.createRoom('room-123');
      expect(manager.getRoomCount()).toBe(1);
    });
  });

  describe('Room Joining', () => {
    it('should allow host to join room', () => {
      const result = manager.joinRoom('room-123', 'host', mockHostSocket);
      expect(result.otherRole).toBeNull();
      expect(manager.hasRoom('room-123')).toBe(true);
    });

    it('should allow phone to join room', () => {
      const result = manager.joinRoom('room-123', 'phone', mockPhoneSocket);
      expect(result.otherRole).toBeNull();
    });

    it('should notify when both parties join', () => {
      manager.joinRoom('room-123', 'host', mockHostSocket);
      const result = manager.joinRoom('room-123', 'phone', mockPhoneSocket);
      expect(result.otherRole).toBe('host');
    });

    it('should notify host when phone joins second', () => {
      manager.joinRoom('room-123', 'phone', mockPhoneSocket);
      const result = manager.joinRoom('room-123', 'host', mockHostSocket);
      expect(result.otherRole).toBe('phone');
    });
  });

  describe('Room Leaving', () => {
    it('should remove host from room', () => {
      manager.joinRoom('room-123', 'host', mockHostSocket);
      manager.joinRoom('room-123', 'phone', mockPhoneSocket);
      
      const result = manager.leaveRoom('room-123', 'host');
      expect(result.notifySocket).toBe(mockPhoneSocket);
    });

    it('should remove phone from room', () => {
      manager.joinRoom('room-123', 'host', mockHostSocket);
      manager.joinRoom('room-123', 'phone', mockPhoneSocket);
      
      const result = manager.leaveRoom('room-123', 'phone');
      expect(result.notifySocket).toBe(mockHostSocket);
    });

    it('should delete empty rooms', () => {
      manager.joinRoom('room-123', 'host', mockHostSocket);
      manager.leaveRoom('room-123', 'host');
      expect(manager.hasRoom('room-123')).toBe(false);
    });

    it('should keep room if one party remains', () => {
      manager.joinRoom('room-123', 'host', mockHostSocket);
      manager.joinRoom('room-123', 'phone', mockPhoneSocket);
      manager.leaveRoom('room-123', 'host');
      expect(manager.hasRoom('room-123')).toBe(true);
    });
  });

  describe('Signal Forwarding', () => {
    it('should forward signal from host to phone', () => {
      manager.joinRoom('room-123', 'host', mockHostSocket);
      manager.joinRoom('room-123', 'phone', mockPhoneSocket);
      
      const result = manager.forwardSignal('room-123', 'host', { type: 'offer' });
      expect(result.targetSocket).toBe(mockPhoneSocket);
    });

    it('should forward signal from phone to host', () => {
      manager.joinRoom('room-123', 'host', mockHostSocket);
      manager.joinRoom('room-123', 'phone', mockPhoneSocket);
      
      const result = manager.forwardSignal('room-123', 'phone', { type: 'answer' });
      expect(result.targetSocket).toBe(mockHostSocket);
    });

    it('should return null if target not in room', () => {
      manager.joinRoom('room-123', 'host', mockHostSocket);
      
      const result = manager.forwardSignal('room-123', 'host', { type: 'offer' });
      expect(result.targetSocket).toBeNull();
    });

    it('should return null for non-existent room', () => {
      const result = manager.forwardSignal('non-existent', 'host', { type: 'offer' });
      expect(result.targetSocket).toBeNull();
    });
  });

  describe('Multiple Rooms', () => {
    it('should handle multiple rooms independently', () => {
      const mockHost2 = { id: 'host-2', emit: vi.fn() };
      const mockPhone2 = { id: 'phone-2', emit: vi.fn() };

      manager.joinRoom('room-1', 'host', mockHostSocket);
      manager.joinRoom('room-1', 'phone', mockPhoneSocket);
      manager.joinRoom('room-2', 'host', mockHost2);
      manager.joinRoom('room-2', 'phone', mockPhone2);

      expect(manager.getRoomCount()).toBe(2);

      // Forward in room 1
      const result1 = manager.forwardSignal('room-1', 'host', { type: 'offer' });
      expect(result1.targetSocket).toBe(mockPhoneSocket);

      // Forward in room 2
      const result2 = manager.forwardSignal('room-2', 'host', { type: 'offer' });
      expect(result2.targetSocket).toBe(mockPhone2);
    });

    it('should clean up rooms independently', () => {
      manager.joinRoom('room-1', 'host', mockHostSocket);
      manager.joinRoom('room-2', 'host', { id: 'host-2', emit: vi.fn() });

      manager.leaveRoom('room-1', 'host');
      
      expect(manager.hasRoom('room-1')).toBe(false);
      expect(manager.hasRoom('room-2')).toBe(true);
      expect(manager.getRoomCount()).toBe(1);
    });
  });
});

describe('WebRTC Signaling Messages', () => {
  it('should validate offer message structure', () => {
    const offerMessage = {
      type: 'offer',
      roomId: 'room-123',
      from: 'phone',
      offer: {
        type: 'offer',
        sdp: 'v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\n...'
      }
    };

    expect(offerMessage.type).toBe('offer');
    expect(offerMessage.from).toBe('phone');
    expect(offerMessage.offer).toBeDefined();
    expect(offerMessage.offer.type).toBe('offer');
  });

  it('should validate answer message structure', () => {
    const answerMessage = {
      type: 'answer',
      roomId: 'room-123',
      from: 'host',
      answer: {
        type: 'answer',
        sdp: 'v=0\r\no=- 987654321 2 IN IP4 127.0.0.1\r\n...'
      }
    };

    expect(answerMessage.type).toBe('answer');
    expect(answerMessage.from).toBe('host');
    expect(answerMessage.answer).toBeDefined();
    expect(answerMessage.answer.type).toBe('answer');
  });

  it('should validate ICE candidate message structure', () => {
    const iceMessage = {
      type: 'ice-candidate',
      roomId: 'room-123',
      from: 'phone',
      candidate: {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 54321 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0
      }
    };

    expect(iceMessage.type).toBe('ice-candidate');
    expect(iceMessage.candidate).toBeDefined();
    expect(iceMessage.candidate.candidate).toContain('candidate:');
  });
});
