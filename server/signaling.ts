import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

interface SignalMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave';
  roomId: string;
  from: 'host' | 'phone';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface Room {
  host: Socket | null;
  phone: Socket | null;
}

const rooms: Map<string, Room> = new Map();

export function setupSignalingServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/api/signaling',
  });

  io.on('connection', (socket: Socket) => {
    console.log('[Signaling] Client connected:', socket.id);
    let currentRoom: string | null = null;
    let currentRole: 'host' | 'phone' | null = null;

    // Join a room
    socket.on('join-room', (data: { roomId: string; role: 'host' | 'phone' }) => {
      const { roomId, role } = data;
      console.log(`[Signaling] ${role} joining room:`, roomId);

      // Leave previous room if any
      if (currentRoom) {
        leaveRoom(socket, currentRoom, currentRole!);
      }

      // Create room if doesn't exist
      if (!rooms.has(roomId)) {
        rooms.set(roomId, { host: null, phone: null });
      }

      const room = rooms.get(roomId)!;
      
      // Assign socket to role
      if (role === 'host') {
        room.host = socket;
      } else {
        room.phone = socket;
      }

      currentRoom = roomId;
      currentRole = role;
      socket.join(roomId);

      // Notify the other party if present
      const otherRole = role === 'host' ? 'phone' : 'host';
      const otherSocket = role === 'host' ? room.phone : room.host;
      
      if (otherSocket) {
        otherSocket.emit('peer-joined', { role });
        socket.emit('peer-joined', { role: otherRole });
        console.log(`[Signaling] Both parties in room ${roomId}`);
      }
    });

    // Handle signaling messages
    socket.on('signal', (message: SignalMessage) => {
      const { roomId, from, type } = message;
      console.log(`[Signaling] ${type} from ${from} in room ${roomId}`);

      const room = rooms.get(roomId);
      if (!room) {
        console.log(`[Signaling] Room ${roomId} not found`);
        return;
      }

      // Forward message to the other party
      const targetSocket = from === 'host' ? room.phone : room.host;
      if (targetSocket) {
        targetSocket.emit('signal', message);
      } else {
        console.log(`[Signaling] Target not found for ${from} in room ${roomId}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('[Signaling] Client disconnected:', socket.id);
      if (currentRoom && currentRole) {
        leaveRoom(socket, currentRoom, currentRole);
      }
    });

    // Handle explicit leave
    socket.on('leave-room', () => {
      if (currentRoom && currentRole) {
        leaveRoom(socket, currentRoom, currentRole);
        currentRoom = null;
        currentRole = null;
      }
    });
  });

  function leaveRoom(socket: Socket, roomId: string, role: 'host' | 'phone') {
    const room = rooms.get(roomId);
    if (!room) return;

    // Clear the socket from the room
    if (role === 'host') {
      room.host = null;
    } else {
      room.phone = null;
    }

    // Notify the other party
    const otherSocket = role === 'host' ? room.phone : room.host;
    if (otherSocket) {
      otherSocket.emit('peer-left', { role });
    }

    // Clean up empty rooms
    if (!room.host && !room.phone) {
      rooms.delete(roomId);
      console.log(`[Signaling] Room ${roomId} deleted`);
    }

    socket.leave(roomId);
    console.log(`[Signaling] ${role} left room ${roomId}`);
  }

  console.log('[Signaling] WebSocket signaling server initialized');
  return io;
}
