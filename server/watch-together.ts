import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

// Types
interface User {
    id: string;
    username: string;
    isHost: boolean;
    isMuted: boolean;
}

interface VideoState {
    isPlaying: boolean;
    currentTime: number;
    lastUpdate: number;
}

interface Room {
    id: string;
    code: string;
    hostId: string;
    contentType: 'show' | 'movie';
    contentId: string;
    episodeId?: string;
    users: Map<string, User>;
    videoState: VideoState;
    createdAt: Date;
}

interface ChatMessage {
    id: string;
    username: string;
    message: string;
    timestamp: Date;
}

// In-memory room storage
const rooms = new Map<string, Room>();
const userToRoom = new Map<string, string>(); // socketId -> roomCode

// Generate 6-character room code
function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
}

export function setupWatchTogether(httpServer: HttpServer): Server {
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
        path: '/watch-together-socket'
    });

    const watchNamespace = io.of('/watch-together');

    watchNamespace.on('connection', (socket: Socket) => {
        console.log(`🎬 Watch Together: User connected ${socket.id}`);

        // Create a new room
        socket.on('room:create', (data: {
            contentType: 'show' | 'movie';
            contentId: string;
            episodeId?: string;
            username: string;
        }) => {
            let code = generateRoomCode();
            while (rooms.has(code)) {
                code = generateRoomCode();
            }

            const room: Room = {
                id: generateId(),
                code,
                hostId: socket.id,
                contentType: data.contentType,
                contentId: data.contentId,
                episodeId: data.episodeId,
                users: new Map(),
                videoState: {
                    isPlaying: false,
                    currentTime: 0,
                    lastUpdate: Date.now()
                },
                createdAt: new Date()
            };

            const user: User = {
                id: socket.id,
                username: data.username,
                isHost: true,
                isMuted: false
            };

            room.users.set(socket.id, user);
            rooms.set(code, room);
            userToRoom.set(socket.id, code);

            socket.join(code);
            socket.emit('room:created', {
                roomId: room.id,
                roomCode: code,
                contentType: room.contentType,
                contentId: room.contentId,
                episodeId: room.episodeId,
                user,
                videoState: room.videoState
            });

            console.log(`🎬 Room created: ${code} by ${data.username}`);
        });

        // Join an existing room
        socket.on('room:join', (data: { roomCode: string; username: string }) => {
            const room = rooms.get(data.roomCode.toUpperCase());

            if (!room) {
                socket.emit('room:error', { message: 'Room not found' });
                return;
            }

            const user: User = {
                id: socket.id,
                username: data.username,
                isHost: false,
                isMuted: false
            };

            room.users.set(socket.id, user);
            userToRoom.set(socket.id, room.code);

            socket.join(room.code);

            // Send room info to joining user
            socket.emit('room:joined', {
                roomId: room.id,
                roomCode: room.code,
                contentType: room.contentType,
                contentId: room.contentId,
                episodeId: room.episodeId,
                users: Array.from(room.users.values()),
                videoState: room.videoState,
                user
            });

            // Notify others in room
            socket.to(room.code).emit('room:user-joined', { user });

            console.log(`🎬 ${data.username} joined room ${room.code}`);
        });

        // Leave room
        socket.on('room:leave', () => {
            handleUserLeave(socket);
        });

        // Video sync events (host only)
        socket.on('video:play', (data: { currentTime: number }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room || room.hostId !== socket.id) return;

            room.videoState = {
                isPlaying: true,
                currentTime: data.currentTime,
                lastUpdate: Date.now()
            };

            socket.to(roomCode).emit('video:sync', room.videoState);
        });

        socket.on('video:pause', (data: { currentTime: number }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room || room.hostId !== socket.id) return;

            room.videoState = {
                isPlaying: false,
                currentTime: data.currentTime,
                lastUpdate: Date.now()
            };

            socket.to(roomCode).emit('video:sync', room.videoState);
        });

        socket.on('video:seek', (data: { currentTime: number }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room || room.hostId !== socket.id) return;

            room.videoState.currentTime = data.currentTime;
            room.videoState.lastUpdate = Date.now();

            socket.to(roomCode).emit('video:sync', room.videoState);
        });

        // Request current video state (for late joiners/reconnect)
        socket.on('video:request-state', () => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room) return;

            socket.emit('video:sync', room.videoState);
        });

        // Chat messages
        socket.on('chat:message', (data: { message: string }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room) return;

            const user = room.users.get(socket.id);
            if (!user) return;

            const chatMessage: ChatMessage = {
                id: generateId(),
                username: user.username,
                message: data.message,
                timestamp: new Date()
            };

            watchNamespace.to(roomCode).emit('chat:receive', chatMessage);
        });

        // Emoji reactions
        socket.on('reaction:send', (data: { emoji: string }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room) return;

            const user = room.users.get(socket.id);
            if (!user) return;

            watchNamespace.to(roomCode).emit('reaction:show', {
                username: user.username,
                emoji: data.emoji,
                id: generateId()
            });
        });

        // Voice chat signaling (WebRTC)
        socket.on('voice:signal', (data: { targetId: string; signal: any }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) {
                console.log(`🔇 Voice signal rejected: ${socket.id} not in a room`);
                return;
            }

            console.log(`📡 Voice signal from ${socket.id} to ${data.targetId}`);

            // Send signal directly to target socket using namespace
            watchNamespace.to(data.targetId).emit('voice:signal', {
                fromId: socket.id,
                signal: data.signal
            });
        });

        // Broadcast speaking state to all users in room
        socket.on('voice:speaking', (data: { isSpeaking: boolean }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;

            // Broadcast to all other users in the room
            socket.to(roomCode).emit('voice:user-speaking', {
                userId: socket.id,
                isSpeaking: data.isSpeaking
            });
        });

        socket.on('voice:toggle-mute', (data: { isMuted: boolean }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room) return;

            const user = room.users.get(socket.id);
            if (user) {
                user.isMuted = data.isMuted;
                watchNamespace.to(roomCode).emit('room:user-updated', { user });
            }
        });

        // Host can mute/unmute other participants
        socket.on('voice:host-mute', (data: { targetUserId: string; isMuted: boolean }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room) return;

            // Check if sender is host
            if (room.hostId !== socket.id) {
                socket.emit('room:error', { message: 'Only host can mute others' });
                return;
            }

            const targetUser = room.users.get(data.targetUserId);
            if (targetUser) {
                targetUser.isMuted = data.isMuted;
                watchNamespace.to(roomCode).emit('room:user-updated', { user: targetUser });
                // Notify the muted user
                watchNamespace.to(data.targetUserId).emit('voice:muted-by-host', {
                    isMuted: data.isMuted
                });
                console.log(`🎬 Host ${data.isMuted ? 'muted' : 'unmuted'} ${targetUser.username}`);
            }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            handleUserLeave(socket);
            console.log(`🎬 Watch Together: User disconnected ${socket.id}`);
        });

        function handleUserLeave(socket: Socket) {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;

            const room = rooms.get(roomCode);
            if (!room) return;

            const user = room.users.get(socket.id);
            const wasHost = room.hostId === socket.id;

            room.users.delete(socket.id);
            userToRoom.delete(socket.id);
            socket.leave(roomCode);

            // If host left, destroy the room
            if (wasHost) {
                watchNamespace.to(roomCode).emit('room:destroyed', {
                    message: 'Host has ended the session'
                });
                rooms.delete(roomCode);
                console.log(`🎬 Room ${roomCode} destroyed (host left)`);
            } else if (user) {
                socket.to(roomCode).emit('room:user-left', {
                    userId: socket.id,
                    username: user.username
                });
            }
        }
    });

    // Cleanup inactive rooms every 5 minutes
    setInterval(() => {
        const now = Date.now();
        const timeout = 2 * 60 * 60 * 1000; // 2 hours

        const roomCodes = Array.from(rooms.keys());
        roomCodes.forEach(code => {
            const room = rooms.get(code);
            if (room && (room.users.size === 0 || now - room.createdAt.getTime() > timeout)) {
                rooms.delete(code);
                console.log(`🎬 Room ${code} cleaned up (inactive)`);
            }
        });
    }, 5 * 60 * 1000);

    console.log('🎬 Watch Together: Socket.io initialized');
    return io;
}
