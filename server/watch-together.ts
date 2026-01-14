import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

// Types
interface User {
    id: string;
    sessionId: string; // Persistent session ID for reconnection
    username: string;
    isHost: boolean;
    isMuted: boolean;
}

interface VideoState {
    isPlaying: boolean;
    currentTime: number;
    lastUpdate: number;
    playbackRate: number;
}

interface Room {
    id: string;
    code: string;
    hostId: string;
    hostSessionId: string; // Host's session ID for reconnection
    contentType: 'show' | 'movie' | 'anime';
    contentId: string;
    episodeId?: string;
    users: Map<string, User>;
    videoState: VideoState;
    createdAt: Date;
    hostDisconnectedAt?: number; // Timestamp when host disconnected (for grace period)
    destroyTimeout?: NodeJS.Timeout; // Timeout to destroy room after host disconnect
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
const sessionToRoom = new Map<string, string>(); // sessionId -> roomCode (for reconnection)

// Host reconnection grace period (2 minutes)
const HOST_GRACE_PERIOD_MS = 2 * 60 * 1000;

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
            contentType: 'show' | 'movie' | 'anime';
            contentId: string;
            episodeId?: string;
            username: string;
            sessionId: string;
        }) => {
            // Check if user already has an active room with this session
            const existingRoomCode = sessionToRoom.get(data.sessionId);
            if (existingRoomCode) {
                const existingRoom = rooms.get(existingRoomCode);
                if (existingRoom && existingRoom.hostSessionId === data.sessionId) {
                    // Host reconnecting - restore their session
                    console.log(`🎬 Host reconnecting to room ${existingRoomCode}`);

                    // Cancel destroy timeout if pending
                    if (existingRoom.destroyTimeout) {
                        clearTimeout(existingRoom.destroyTimeout);
                        existingRoom.destroyTimeout = undefined;
                        existingRoom.hostDisconnectedAt = undefined;
                    }

                    // Update host's socket ID
                    const oldHostId = existingRoom.hostId;
                    existingRoom.hostId = socket.id;

                    // Update user entry
                    existingRoom.users.delete(oldHostId);
                    const user: User = {
                        id: socket.id,
                        sessionId: data.sessionId,
                        username: data.username,
                        isHost: true,
                        isMuted: false
                    };
                    existingRoom.users.set(socket.id, user);

                    userToRoom.set(socket.id, existingRoomCode);
                    socket.join(existingRoomCode);

                    // Send room info to reconnecting host
                    socket.emit('room:joined', {
                        roomId: existingRoom.id,
                        roomCode: existingRoom.code,
                        contentType: existingRoom.contentType,
                        contentId: existingRoom.contentId,
                        episodeId: existingRoom.episodeId,
                        users: Array.from(existingRoom.users.values()),
                        videoState: existingRoom.videoState,
                        user
                    });

                    // Notify others that host reconnected
                    socket.to(existingRoomCode).emit('room:host-reconnected', { user });
                    console.log(`🎬 Host ${data.username} reconnected to room ${existingRoomCode}`);
                    return;
                }
            }

            let code = generateRoomCode();
            while (rooms.has(code)) {
                code = generateRoomCode();
            }

            const room: Room = {
                id: generateId(),
                code,
                hostId: socket.id,
                hostSessionId: data.sessionId,
                contentType: data.contentType,
                contentId: data.contentId,
                episodeId: data.episodeId,
                users: new Map(),
                videoState: {
                    isPlaying: false,
                    currentTime: 0,
                    lastUpdate: Date.now(),
                    playbackRate: 1
                },
                createdAt: new Date()
            };

            const user: User = {
                id: socket.id,
                sessionId: data.sessionId,
                username: data.username,
                isHost: true,
                isMuted: false
            };

            room.users.set(socket.id, user);
            rooms.set(code, room);
            userToRoom.set(socket.id, code);
            sessionToRoom.set(data.sessionId, code);

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
        socket.on('room:join', (data: { roomCode: string; username: string; sessionId: string }) => {
            const room = rooms.get(data.roomCode.toUpperCase());

            if (!room) {
                socket.emit('room:error', { message: 'Room not found' });
                return;
            }

            // Check if this is the HOST reconnecting (matches hostSessionId)
            const isHostReconnecting = room.hostSessionId === data.sessionId;

            if (isHostReconnecting) {
                console.log(`🎬 Host reconnecting to room ${room.code} via join`);

                // Cancel destroy timeout if pending
                if (room.destroyTimeout) {
                    clearTimeout(room.destroyTimeout);
                    room.destroyTimeout = undefined;
                    room.hostDisconnectedAt = undefined;
                    console.log(`🎬 Cancelled room destruction for ${room.code}`);
                }

                // Update host's socket ID
                room.hostId = socket.id;
            }

            // Check if this session was previously in this room (reconnection)
            const previousRoom = sessionToRoom.get(data.sessionId);
            const isReconnecting = previousRoom === room.code;

            // Check if this is a reconnection (same session ID still in room for non-host users)
            let existingUser: User | undefined;
            room.users.forEach((user, oldSocketId) => {
                if (user.sessionId === data.sessionId) {
                    existingUser = user;
                    // Remove old socket entry
                    room.users.delete(oldSocketId);
                    userToRoom.delete(oldSocketId);
                }
            });

            const user: User = {
                id: socket.id,
                sessionId: data.sessionId,
                username: data.username,
                isHost: isHostReconnecting || (existingUser?.isHost ?? false),
                isMuted: existingUser?.isMuted || false
            };

            room.users.set(socket.id, user);
            userToRoom.set(socket.id, room.code);
            sessionToRoom.set(data.sessionId, room.code);

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

            // Notify others in room - use isReconnecting OR existingUser to detect reconnection
            if (isHostReconnecting) {
                console.log(`🎬 Host ${data.username} reconnected to room ${room.code}`);
                socket.to(room.code).emit('room:host-reconnected', { user });
            } else if (existingUser || isReconnecting) {
                console.log(`🎬 ${data.username} reconnected to room ${room.code}`);
                socket.to(room.code).emit('room:user-reconnected', { user });
            } else {
                console.log(`🎬 ${data.username} joined room ${room.code}`);
                socket.to(room.code).emit('room:user-joined', { user });
            }
        });

        // Leave room
        socket.on('room:leave', () => {
            handleUserLeave(socket);
        });

        // Video sync events (host only)
        socket.on('video:play', (data: { currentTime: number }) => {
            const roomCode = userToRoom.get(socket.id);
            console.log('🎬 Server received video:play from', socket.id, 'roomCode:', roomCode, 'time:', data.currentTime);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room || room.hostId !== socket.id) {
                console.log('🎬 video:play rejected - room:', !!room, 'isHost:', room?.hostId === socket.id);
                return;
            }

            room.videoState = {
                isPlaying: true,
                currentTime: data.currentTime,
                lastUpdate: Date.now(),
                playbackRate: room.videoState.playbackRate
            };

            console.log('🎬 Broadcasting video:sync to room', roomCode, room.videoState);
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
                lastUpdate: Date.now(),
                playbackRate: room.videoState.playbackRate
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

        socket.on('video:playbackRate', (data: { rate: number }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room || room.hostId !== socket.id) return;

            room.videoState.playbackRate = data.rate;
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

        // Subtitle sync (host only) - broadcast subtitle changes to all room users
        socket.on('video:subtitle', (data: { subtitleIndex: number }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room || room.hostId !== socket.id) return;

            console.log(`🎬 Host changed subtitle to index ${data.subtitleIndex} in room ${roomCode}`);
            // Broadcast to all other users in room
            socket.to(roomCode).emit('video:subtitle', { subtitleIndex: data.subtitleIndex });
        });

        // Change content (episode/movie) - host only
        socket.on('video:change-content', (data: { episodeId?: string; contentId?: string; contentType?: 'show' | 'movie' }) => {
            const roomCode = userToRoom.get(socket.id);
            console.log('🎬 Server received video:change-content from', socket.id, 'data:', data);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room || room.hostId !== socket.id) {
                console.log('🎬 video:change-content rejected - not host');
                return;
            }

            // Update room content
            if (data.episodeId) {
                room.episodeId = data.episodeId;
            }
            if (data.contentId) {
                room.contentId = data.contentId;
            }
            if (data.contentType) {
                room.contentType = data.contentType;
            }

            // Reset video state for new content
            room.videoState = {
                isPlaying: false,
                currentTime: 0,
                lastUpdate: Date.now(),
                playbackRate: 1
            };

            // Broadcast content change to all users including host
            const contentChangeData = {
                episodeId: room.episodeId,
                contentId: room.contentId,
                contentType: room.contentType,
                videoState: room.videoState
            };

            console.log('🎬 Broadcasting content:changed to room', roomCode, contentChangeData);
            io.of('/watch-together').to(roomCode).emit('content:changed', contentChangeData);
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

            // If host left, start grace period instead of immediately destroying
            if (wasHost && user) {
                console.log(`🎬 Host disconnected from room ${roomCode}, starting ${HOST_GRACE_PERIOD_MS / 1000}s grace period`);

                room.hostDisconnectedAt = Date.now();

                // Notify others that host disconnected (but room still active)
                watchNamespace.to(roomCode).emit('room:host-disconnected', {
                    message: 'Host disconnected. Waiting for reconnection...',
                    gracePeriodMs: HOST_GRACE_PERIOD_MS
                });

                // Set timeout to destroy room if host doesn't reconnect
                room.destroyTimeout = setTimeout(() => {
                    // Check if host reconnected
                    if (room.hostDisconnectedAt) {
                        watchNamespace.to(roomCode).emit('room:destroyed', {
                            message: 'Host did not reconnect in time'
                        });

                        // Clean up session mappings for all users
                        room.users.forEach(u => {
                            sessionToRoom.delete(u.sessionId);
                        });
                        sessionToRoom.delete(room.hostSessionId);

                        rooms.delete(roomCode);
                        console.log(`🎬 Room ${roomCode} destroyed (host didn't reconnect)`);
                    }
                }, HOST_GRACE_PERIOD_MS);

            } else if (user) {
                // Non-host user left - notify others but keep session mapping for reconnection
                socket.to(roomCode).emit('room:user-left', {
                    userId: socket.id,
                    username: user.username
                });
                // DON'T delete sessionToRoom - we need it to detect reconnection
                // sessionToRoom will be cleaned up when room is destroyed
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
