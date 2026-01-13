import { useState, useEffect, useRef } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
    Users,
    MessageCircle,
    Copy,
    Check,
    Play,
    Pause,
    Send,
    X,
    Smile,
    ChevronLeft,
    ChevronRight,
    Crown,
    Mic,
    MicOff,
    Search,
    Paperclip,
    Image,
    Video,
    Music,
    Smartphone,
    SkipBack,
    SkipForward,
    List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWatchTogether, WatchTogetherProvider } from '@/contexts/watch-together-context';
import { useVoiceChat } from '@/hooks/use-voice-chat';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { VideoPlayer, VideoPlayerRef } from '@/components/video-player';
import type { Show, Movie, Episode } from '@shared/schema';

// Emoji reactions
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🔥', '👏', '😢', '🎉'];

// Format message with GIFs and attachments rendered as media
function formatMessageWithMedia(text: string) {
    // Split by both GIF URLs and attachment tags
    const mediaRegex = /(https:\/\/media\.tenor\.com\/[^\s]+\.gif)|\[ATTACHMENT:(image|video|audio):([^\]]+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let keyIndex = 0;

    while ((match = mediaRegex.exec(text)) !== null) {
        // Add text before this match
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        // Check if it's a GIF URL
        if (match[1]) {
            parts.push(
                <img
                    key={`media-${keyIndex++}`}
                    src={match[1]}
                    alt="GIF"
                    className="max-w-[200px] max-h-[150px] rounded-lg my-1 block"
                    loading="lazy"
                />
            );
        }
        // Check if it's an attachment tag
        else if (match[2] && match[3]) {
            const type = match[2];
            const url = match[3];

            if (type === 'image') {
                parts.push(
                    <img
                        key={`media-${keyIndex++}`}
                        src={url}
                        alt="Shared image"
                        className="max-w-[200px] max-h-[150px] rounded-lg my-1 block object-cover"
                    />
                );
            } else if (type === 'video') {
                parts.push(
                    <video
                        key={`media-${keyIndex++}`}
                        src={url}
                        className="max-w-[200px] max-h-[150px] rounded-lg my-1 block"
                        controls
                    />
                );
            } else if (type === 'audio') {
                parts.push(
                    <audio
                        key={`media-${keyIndex++}`}
                        src={url}
                        controls
                        className="my-1 block max-w-[200px]"
                    />
                );
            }
        }

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
}

function WatchTogetherContent() {
    const [, params] = useRoute('/watch-together/:roomCode');
    const [, setLocation] = useLocation();
    const roomCode = params?.roomCode;

    const {
        socket,
        isConnected,
        roomInfo,
        users,
        speakingUsers,
        messages,
        reactions,
        videoState,
        isHost,
        currentUser,
        error,
        createRoom,
        joinRoom,
        leaveRoom,
        sendMessage,
        sendReaction,
        videoPlay,
        videoPause,
        videoSeek,
        videoPlaybackRate,
        videoSubtitle,
        hostMuteUser,
        changeContent,
        clearError
    } = useWatchTogether();

    // Video player ref for sync control
    const videoPlayerRef = useRef<VideoPlayerRef>(null);

    // Custom modal state for mute/unmute notifications
    const [showMuteNotification, setShowMuteNotification] = useState(false);
    const [showUnmuteRequest, setShowUnmuteRequest] = useState(false);
    const [unmuteHandlers, setUnmuteHandlers] = useState<{ onAccept: () => void; onReject: () => void } | null>(null);

    // Voice chat with custom modal callbacks
    const {
        isMuted,
        isVoiceEnabled,
        isSpeaking,
        connectedPeers,
        error: voiceError,
        toggleMute,
        startVoice,
        stopVoice
    } = useVoiceChat({
        socket,
        roomUsers: users,
        currentUserId: currentUser?.id ?? null,
        onMutedByHost: () => {
            setShowMuteNotification(true);
            setTimeout(() => setShowMuteNotification(false), 3000);
        },
        onUnmuteRequest: (onAccept, onReject) => {
            setUnmuteHandlers({ onAccept, onReject });
            setShowUnmuteRequest(true);
        }
    });

    const [username, setUsername] = useState('');
    const [showJoinModal, setShowJoinModal] = useState(true);
    const [chatMessage, setChatMessage] = useState('');
    const [copied, setCopied] = useState(false);
    const [showChat, setShowChat] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [gifSearch, setGifSearch] = useState('');
    const [gifs, setGifs] = useState<any[]>([]);
    const [isLoadingGifs, setIsLoadingGifs] = useState(false);
    const [selectedGif, setSelectedGif] = useState<string | null>(null);
    const [attachment, setAttachment] = useState<{ file: File; preview: string; type: 'image' | 'video' | 'audio' } | null>(null);
    const [isPortrait, setIsPortrait] = useState(false);
    const [dismissedLandscapeHint, setDismissedLandscapeHint] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLIFrameElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Detect portrait mode on mobile
    useEffect(() => {
        const checkOrientation = () => {
            const isMobile = window.innerWidth < 768;
            const isPortraitMode = window.innerHeight > window.innerWidth;
            setIsPortrait(isMobile && isPortraitMode);
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    // Handle file attachment - convert to base64 for sharing
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (max 2MB for base64 efficiency)
        if (file.size > 2 * 1024 * 1024) {
            alert('File too large. Max 2MB allowed for sharing.');
            return;
        }

        let type: 'image' | 'video' | 'audio';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
        else {
            alert('Unsupported file type. Only images, videos, and audio allowed.');
            return;
        }

        // Convert to base64 data URL
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setAttachment({ file, preview: base64, type });
        };
        reader.readAsDataURL(file);
    };

    // Remove attachment
    const removeAttachment = () => {
        setAttachment(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Search GIFs from Tenor API
    const searchGifs = async (query: string) => {
        if (!query.trim()) {
            setGifs([]);
            return;
        }
        setIsLoadingGifs(true);
        try {
            const response = await fetch(
                `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&client_key=streamvault&limit=20`
            );
            const data = await response.json();
            setGifs(data.results || []);
        } catch (error) {
            console.error('GIF search error:', error);
            setGifs([]);
        }
        setIsLoadingGifs(false);
    };

    // Load trending GIFs when GIF picker opens
    useEffect(() => {
        if (showGifPicker && gifs.length === 0 && !gifSearch) {
            searchGifs('trending');
        }
    }, [showGifPicker]);

    // Fetch all shows to find by ID (API doesn't support direct ID lookup)
    const { data: allShows } = useQuery<Show[]>({
        queryKey: ['/api/shows'],
        enabled: !!roomInfo && roomInfo.contentType === 'show'
    });
    const show = allShows?.find(s => s.id === roomInfo?.contentId);

    // Fetch all movies to find by ID
    const { data: allMovies } = useQuery<Movie[]>({
        queryKey: ['/api/movies'],
        enabled: !!roomInfo && roomInfo.contentType === 'movie'
    });
    const movie = allMovies?.find(m => m.id === roomInfo?.contentId);

    // Fetch all episodes for the show, then find the one we need
    const { data: episodes } = useQuery<Episode[]>({
        queryKey: ['/api/episodes', show?.id],
        enabled: !!show?.id
    });

    // Find the episode by ID from the episodes array
    const episode = episodes?.find(ep => ep.id === roomInfo?.episodeId);

    // Fetch blog posts to get IMDB links for subtitles
    const { data: blogPosts = [] } = useQuery<any[]>({
        queryKey: ['/api/blog'],
        enabled: !!(show?.id || movie?.id)
    });

    // Find matching blog post for this content to get external links
    const blogPost = (show || movie) ? blogPosts.find(
        (post) => post.contentId === (show?.id || movie?.id) || post.slug === (show?.slug || movie?.slug)
    ) : null;

    // State for subtitle tracks
    const [subtitleTracks, setSubtitleTracks] = useState<Array<{
        file: string;
        label: string;
        kind: 'captions' | 'subtitles';
        default?: boolean;
    }>>([]);

    // Fetch subtitles when content loads
    useEffect(() => {
        const fetchSubtitles = async () => {
            if (!blogPost) return;

            try {
                // Parse IMDB ID from blog post external links
                const externalLinks = blogPost.externalLinks
                    ? (typeof blogPost.externalLinks === 'string'
                        ? JSON.parse(blogPost.externalLinks)
                        : blogPost.externalLinks)
                    : null;

                const imdbLink = externalLinks?.imdb;
                if (!imdbLink) {
                    console.log('No IMDB link found for Watch Together subtitle search');
                    return;
                }

                // Extract just the IMDB ID (tt1234567) from the link
                const imdbMatch = imdbLink.match(/tt\d+/);
                if (!imdbMatch) {
                    console.log('Invalid IMDB ID format');
                    return;
                }

                // For shows, include season and episode
                const season = episode?.seasonNumber;
                const ep = episode?.episodeNumber;
                const searchUrl = roomInfo?.contentType === 'show' && season && ep
                    ? `/api/subtitles/search?imdbId=${imdbMatch[0]}&season=${season}&episode=${ep}&language=en`
                    : `/api/subtitles/search?imdbId=${imdbMatch[0]}&language=en`;

                console.log(`🔍 Fetching subtitles for Watch Together: ${imdbMatch[0]}`);

                const response = await fetch(searchUrl);

                if (!response.ok) {
                    console.error('Watch Together subtitle search failed');
                    return;
                }

                const data = await response.json();

                if (data.subtitles && data.subtitles.length > 0) {
                    console.log(`✅ Found ${data.subtitles.length} subtitles for Watch Together`);

                    // Language code to full name mapping
                    const langNames: Record<string, string> = {
                        'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
                        'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
                        'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
                        'tr': 'Turkish', 'pl': 'Polish', 'nl': 'Dutch', 'sv': 'Swedish'
                    };

                    // Convert to VideoPlayer format (use first 10 subtitles)
                    const tracks = data.subtitles.slice(0, 10).map((sub: any, index: number) => ({
                        file: sub.downloadUrl,
                        label: langNames[sub.lang] || sub.language || sub.lang || 'Unknown',
                        kind: 'subtitles' as const,
                        default: index === 0
                    }));

                    setSubtitleTracks(tracks);
                } else {
                    console.log('No Watch Together subtitles found');
                }
            } catch (error) {
                console.error('Error fetching Watch Together subtitles:', error);
            }
        };

        fetchSubtitles();
    }, [blogPost, episode?.id, roomInfo?.contentType]);

    const content = roomInfo?.contentType === 'show' ? show : movie;
    const title = content?.title || 'Watch Together';

    // Debug logging
    console.log('🎬 Watch Together Debug:', {
        'roomInfo.contentType': roomInfo?.contentType,
        'roomInfo.contentId': roomInfo?.contentId,
        'roomInfo.episodeId': roomInfo?.episodeId,
        allShowsCount: allShows?.length,
        'First show ID sample': allShows?.[0]?.id,
        showFound: show?.title,
        showId: show?.id,
        'contentId matches show': show?.id === roomInfo?.contentId,
        'String match': String(show?.id) === String(roomInfo?.contentId),
        episodesCount: episodes?.length,
        'First episode ID sample': episodes?.[0]?.id,
        episodeFound: episode?.title,
        googleDriveUrl: episode?.googleDriveUrl || movie?.googleDriveUrl
    });

    // Auto-create or auto-join if coming from create-room page
    useEffect(() => {
        const storedUsername = sessionStorage.getItem('watchTogether_username');
        const isCreator = sessionStorage.getItem('watchTogether_isCreator');
        const contentType = sessionStorage.getItem('watchTogether_contentType') as 'show' | 'movie' | null;
        const contentId = sessionStorage.getItem('watchTogether_contentId');
        const episodeId = sessionStorage.getItem('watchTogether_episodeId');

        if (!isConnected || roomInfo) return;

        // If this is a new room creation request
        if (roomCode === 'NEW' && isCreator === 'true' && storedUsername && contentType && contentId) {
            // Clear the stored data
            sessionStorage.removeItem('watchTogether_username');
            sessionStorage.removeItem('watchTogether_isCreator');
            sessionStorage.removeItem('watchTogether_contentType');
            sessionStorage.removeItem('watchTogether_contentId');
            sessionStorage.removeItem('watchTogether_episodeId');

            // Also clear auto-rejoin localStorage to prevent rejoining old room
            localStorage.removeItem('watch-together-username');
            localStorage.removeItem('watch-together-room');

            // Create the room
            setUsername(storedUsername);
            createRoom(contentType, contentId, storedUsername, episodeId || undefined);
            setShowJoinModal(false);
        }
        // If joining an existing room with stored username
        else if (roomCode && roomCode !== 'NEW' && storedUsername) {
            sessionStorage.removeItem('watchTogether_username');
            sessionStorage.removeItem('watchTogether_isCreator');

            setUsername(storedUsername);
            joinRoom(roomCode, storedUsername);
            setShowJoinModal(false);
        }
    }, [isConnected, roomCode, roomInfo, joinRoom, createRoom]);

    // Update URL when room is created (replace /NEW with actual room code)
    useEffect(() => {
        if (roomInfo?.roomCode && roomCode === 'NEW') {
            window.history.replaceState({}, '', `/watch-together/${roomInfo.roomCode}`);
        }
    }, [roomInfo, roomCode]);

    // Scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-start voice chat when user joins (muted by default)
    useEffect(() => {
        if (currentUser && !isVoiceEnabled && socket) {
            console.log('🎤 Auto-starting voice chat (muted by default)...');
            startVoice();
        }
    }, [currentUser, socket]);

    // Auto-rejoin on page load if we have saved credentials
    useEffect(() => {
        // Skip auto-rejoin if we're creating a new room
        if (!isConnected || currentUser || !roomCode || roomCode === 'NEW') return;

        const savedUsername = localStorage.getItem('watch-together-username');
        const savedRoom = localStorage.getItem('watch-together-room');

        // If we have saved credentials for this room, auto-rejoin
        if (savedUsername && savedRoom && savedRoom === roomCode) {
            console.log('🔄 Auto-rejoining with saved credentials:', savedUsername);
            setUsername(savedUsername);
            // Small delay to ensure socket is ready
            setTimeout(() => {
                joinRoom(roomCode, savedUsername);
                setShowJoinModal(false);
            }, 500);
        }
    }, [isConnected, currentUser, roomCode, joinRoom]);

    // Video sync effect - listen for sync events from host and apply to player
    useEffect(() => {
        // Only attach listener for non-host viewers
        if (!socket || isHost) return;

        const handleVideoSync = (state: { isPlaying: boolean; currentTime: number; playbackRate: number }) => {
            console.log('🎬 Received video sync:', state);

            const player = videoPlayerRef.current;
            if (!player) {
                console.log('🎬 VideoPlayer ref not available yet');
                return;
            }

            // Apply playback rate
            if (state.playbackRate !== player.getPlaybackRate()) {
                console.log('🎬 Applying playback rate:', state.playbackRate);
                player.setPlaybackRate(state.playbackRate);
            }

            // Sync position if difference is more than 2 seconds
            const currentTime = player.getCurrentTime();
            if (Math.abs(currentTime - state.currentTime) > 2) {
                console.log('🎬 Syncing position from', currentTime, 'to', state.currentTime);
                player.seek(state.currentTime);
            }

            // Sync play/pause state
            if (state.isPlaying && player.isPaused()) {
                console.log('🎬 Playing video (sync)');
                player.play();
            } else if (!state.isPlaying && !player.isPaused()) {
                console.log('🎬 Pausing video (sync)');
                player.pause();
            }
        };

        console.log('🎬 Attaching video:sync listener for viewer');
        socket.on('video:sync', handleVideoSync);

        // Listen for subtitle sync from host
        const handleSubtitleSync = (data: { subtitleIndex: number }) => {
            console.log('🎬 Received subtitle sync:', data.subtitleIndex, '(index -1 means off)');
            const player = videoPlayerRef.current;
            if (player) {
                console.log('🎬 Setting captions to index:', data.subtitleIndex);
                player.setCaptions(data.subtitleIndex);
            } else {
                console.log('🎬 VideoPlayer ref not ready for subtitle sync');
            }
        };
        socket.on('video:subtitle', handleSubtitleSync);

        return () => {
            console.log('🎬 Removing video:sync listener');
            socket.off('video:sync', handleVideoSync);
            socket.off('video:subtitle', handleSubtitleSync);
        };
    }, [socket, isHost]);

    // Handle join
    const handleJoin = () => {
        if (username.trim() && roomCode) {
            // Save to localStorage for auto-rejoin on page refresh
            localStorage.setItem('watch-together-username', username.trim());
            localStorage.setItem('watch-together-room', roomCode);

            joinRoom(roomCode, username.trim());
            setShowJoinModal(false);
        }
    };

    // Handle leave
    const handleLeave = () => {
        // Clear localStorage since user intentionally left
        localStorage.removeItem('watch-together-username');
        localStorage.removeItem('watch-together-room');
        leaveRoom();
        setLocation('/');
    };

    // Copy room code
    const copyRoomCode = () => {
        if (roomInfo?.roomCode) {
            navigator.clipboard.writeText(`${window.location.origin}/watch-together/${roomInfo.roomCode}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Send chat message
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();

        // Build message with optional attachment and GIF
        let messageToSend = chatMessage.trim();

        // If there's a selected GIF, include it in the message
        if (selectedGif) {
            messageToSend = messageToSend ? `${messageToSend} ${selectedGif}` : selectedGif;
        }

        // If there's an attachment, include its preview URL in the message
        if (attachment) {
            const attachmentTag = `[ATTACHMENT:${attachment.type}:${attachment.preview}]`;
            messageToSend = messageToSend ? `${messageToSend} ${attachmentTag}` : attachmentTag;
        }

        if (messageToSend) {
            sendMessage(messageToSend);
            setChatMessage('');
            setSelectedGif(null);
            removeAttachment();
        }
    };

    // Extract Google Drive ID (handles both full URLs and plain IDs)
    const extractDriveId = (url: string | undefined) => {
        if (!url) return null;
        // Check if it's a full URL with /d/ pattern
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) return match[1];
        // Check for /file/d/ pattern
        const match2 = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match2) return match2[1];
        // If it's already just an ID (no slashes), return it directly
        if (!url.includes('/') && url.length > 10) return url;
        return null;
    };

    const driveId = episode?.googleDriveUrl
        ? extractDriveId(episode.googleDriveUrl)
        : movie?.googleDriveUrl
            ? extractDriveId(movie.googleDriveUrl)
            : null;

    // Error display
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background via-background to-black flex items-center justify-center">
                <div className="text-center p-8 bg-card rounded-xl border border-border max-w-md">
                    <h2 className="text-2xl font-bold mb-4 text-red-500">Error</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button onClick={() => { clearError(); setLocation('/'); }}>
                        Go Home
                    </Button>
                </div>
            </div>
        );
    }

    // Join modal
    if (showJoinModal && !roomInfo) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background via-background to-black flex items-center justify-center p-4">
                <Helmet>
                    <title>Join Watch Party | StreamVault</title>
                    <meta name="description" content="Join a synchronized watch party and enjoy movies and TV shows together with friends in real-time. Chat, react, and use voice chat while watching!" />
                    <link rel="canonical" href="https://streamvault.live/watch-together" />
                    <meta property="og:type" content="website" />
                    <meta property="og:title" content="Watch Together - StreamVault Watch Party" />
                    <meta property="og:description" content="Sync up with friends and watch movies or TV shows together in real-time. Chat, react with emojis, and use voice chat!" />
                    <meta property="og:image" content="https://streamvault.live/og-watch-together.png" />
                    <meta property="og:url" content="https://streamvault.live/watch-together" />
                    <meta property="og:site_name" content="StreamVault" />
                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:title" content="Watch Together - StreamVault Watch Party" />
                    <meta name="twitter:description" content="Sync up with friends and watch movies or TV shows together in real-time!" />
                    <meta name="twitter:image" content="https://streamvault.live/og-watch-together.png" />
                </Helmet>
                <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full">
                    <h1 className="text-3xl font-bold mb-2 text-center">🎬 Watch Together</h1>
                    <p className="text-muted-foreground text-center mb-6">
                        Join room: <span className="font-mono text-primary font-bold">{roomCode}</span>
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Your Name</label>
                            <Input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your name..."
                                className="text-lg"
                                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                            />
                        </div>

                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleJoin}
                            disabled={!username.trim() || !isConnected}
                        >
                            {isConnected ? 'Join Room' : 'Connecting...'}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-black">
            <Helmet>
                <title>Watch Together: {title} | StreamVault</title>
                <meta name="description" content={`Watch ${title} together with friends in a synchronized watch party. Chat, react, and enjoy together!`} />
                <link rel="canonical" href={`https://streamvault.live/watch-together/${roomInfo?.roomCode}`} />
                <meta property="og:type" content="website" />
                <meta property="og:title" content={`Watch ${title} Together - StreamVault Party`} />
                <meta property="og:description" content={`Join this watch party and enjoy ${title} with friends in real-time sync!`} />
                <meta property="og:image" content="https://streamvault.live/og-watch-together.png" />
                <meta property="og:url" content={`https://streamvault.live/watch-together/${roomInfo?.roomCode}`} />
                <meta property="og:site_name" content="StreamVault" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`Watch ${title} Together`} />
                <meta name="twitter:description" content={`Join this watch party for ${title}!`} />
                <meta name="twitter:image" content="https://streamvault.live/og-watch-together.png" />
            </Helmet>

            {/* Landscape Mode Hint Overlay for Mobile */}
            {isPortrait && !dismissedLandscapeHint && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 text-center">
                    <div className="relative">
                        <Smartphone className="w-16 h-16 text-primary rotate-90 animate-pulse" />
                    </div>
                    <h2 className="text-xl font-bold mt-6 text-white">Rotate Your Phone</h2>
                    <p className="text-muted-foreground mt-2 max-w-xs">
                        For the best Watch Together experience, please switch to landscape mode
                    </p>
                    <Button
                        variant="outline"
                        className="mt-6"
                        onClick={() => setDismissedLandscapeHint(true)}
                    >
                        Continue Anyway
                    </Button>
                </div>
            )}

            {/* Custom Mute Notification */}
            {showMuteNotification && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100]">
                    <div className="bg-red-600 text-white px-8 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-pulse">
                        <MicOff className="w-6 h-6" />
                        <span className="font-semibold">The host has muted you</span>
                    </div>
                </div>
            )}

            {/* Custom Unmute Request Modal */}
            {showUnmuteRequest && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                                <Mic className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Unmute Request</h3>
                            <p className="text-muted-foreground mt-2">
                                The host is asking you to unmute your microphone. Do you want to speak?
                            </p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    unmuteHandlers?.onReject();
                                    setShowUnmuteRequest(false);
                                    setUnmuteHandlers(null);
                                }}
                            >
                                Stay Muted
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => {
                                    unmuteHandlers?.onAccept();
                                    setShowUnmuteRequest(false);
                                    setUnmuteHandlers(null);
                                }}
                            >
                                <Mic className="w-4 h-4 mr-2" />
                                Unmute
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Reactions */}
            <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                {reactions.map((reaction) => {
                    // Use reaction.id to generate a deterministic position
                    const hash = reaction.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    const leftPos = (hash % 70) + 15;
                    return (
                        <div
                            key={reaction.id}
                            className="absolute text-4xl animate-bounce"
                            style={{
                                left: `${leftPos}%`,
                                bottom: '100px',
                                animation: 'floatUp 2s ease-out forwards'
                            }}
                        >
                            {reaction.emoji}
                        </div>
                    );
                })}
            </div>

            {/* Header */}
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={handleLeave}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="font-bold">{title}</h1>
                            {episode && <p className="text-sm text-muted-foreground">S{episode.season} E{episode.episodeNumber}</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Room Code */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={copyRoomCode}
                            className="font-mono"
                        >
                            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                            {roomInfo?.roomCode}
                        </Button>

                        {/* Users Count */}
                        <Button variant="ghost" size="sm">
                            <Users className="h-4 w-4 mr-2" />
                            {users.length}
                        </Button>

                        {/* Voice Chat Toggle */}
                        <Button
                            variant={isMuted ? 'outline' : 'default'}
                            size="sm"
                            onClick={toggleMute}
                            disabled={!isVoiceEnabled}
                            className={`relative ${!isMuted ? 'bg-green-600 hover:bg-green-700' : ''} ${isSpeaking ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-background' : ''}`}
                            title={isMuted ? 'Unmute (click to speak)' : 'Mute'}
                        >
                            {isSpeaking && (
                                <span className="absolute inset-0 rounded-md animate-ping bg-green-400 opacity-30" />
                            )}
                            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className={`h-4 w-4 ${isSpeaking ? 'animate-pulse' : ''}`} />}
                            {connectedPeers.length > 0 && (
                                <span className="ml-1 text-xs">{connectedPeers.length}</span>
                            )}
                        </Button>

                        {/* Chat Toggle */}
                        <Button
                            variant={showChat ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setShowChat(!showChat)}
                        >
                            <MessageCircle className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex h-[calc(100vh-65px)]">
                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Video Player - fills available space */}
                    <div className="flex-1 relative bg-black flex items-center justify-center min-h-0">
                        <div className="w-full h-full max-h-full flex items-center justify-center">
                            <VideoPlayer
                                ref={videoPlayerRef}
                                videoUrl={episode?.googleDriveUrl || movie?.googleDriveUrl}
                                className="w-full h-full"
                                isHost={isHost}
                                syncMode={true}
                                subtitleTracks={subtitleTracks}
                                onPlay={() => {
                                    console.log('🎬 onPlay handler called - isHost:', isHost);
                                    if (isHost) {
                                        const time = videoPlayerRef.current?.getCurrentTime() || 0;
                                        console.log('🎬 Calling videoPlay with time:', time);
                                        videoPlay(time);
                                    }
                                }}
                                onPause={() => {
                                    console.log('🎬 onPause handler called - isHost:', isHost);
                                    if (isHost) {
                                        const time = videoPlayerRef.current?.getCurrentTime() || 0;
                                        console.log('🎬 Calling videoPause with time:', time);
                                        videoPause(time);
                                    }
                                }}
                                onSeek={(time) => {
                                    console.log('🎬 onSeek handler called - isHost:', isHost, 'time:', time);
                                    if (isHost) {
                                        videoSeek(time);
                                    }
                                }}
                                onPlaybackRateChange={(rate) => {
                                    console.log('🎬 onPlaybackRateChange handler called - isHost:', isHost, 'rate:', rate);
                                    if (isHost) {
                                        videoPlaybackRate(rate);
                                    }
                                }}
                                onSubtitleChange={(subtitleIndex) => {
                                    console.log('🎬 onSubtitleChange handler called - isHost:', isHost, 'index:', subtitleIndex);
                                    if (isHost) {
                                        videoSubtitle(subtitleIndex);
                                    }
                                }}
                            />
                        </div>

                        {/* Host indicator */}
                        {isHost && (
                            <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                <Crown className="h-4 w-4" />
                                You're the host
                            </div>
                        )}
                    </div>

                    {/* Episode Selector Bar - Host Only (for shows) */}
                    {isHost && roomInfo?.contentType === 'show' && episodes && episodes.length > 1 && (
                        <div className="bg-card/95 backdrop-blur border-t border-border px-4 py-2 flex-shrink-0">
                            <div className="flex items-center justify-center gap-4">
                                {/* Previous Episode */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        const currentEpIndex = episodes.findIndex(ep => ep.id === roomInfo?.episodeId);
                                        if (currentEpIndex > 0) {
                                            const prevEp = episodes[currentEpIndex - 1];
                                            changeContent(prevEp.id, roomInfo?.contentId, 'show');
                                        }
                                    }}
                                    disabled={!episodes || episodes.findIndex(ep => ep.id === roomInfo?.episodeId) <= 0}
                                    className="flex items-center gap-1"
                                >
                                    <SkipBack className="h-4 w-4" />
                                    <span className="hidden sm:inline">Previous</span>
                                </Button>

                                {/* Current Episode Info */}
                                <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg">
                                    <span className="text-sm font-medium text-primary">
                                        S{episode?.season}E{episode?.episodeNumber}
                                    </span>
                                    <span className="text-sm text-muted-foreground max-w-[200px] truncate hidden sm:inline">
                                        {episode?.title}
                                    </span>
                                </div>

                                {/* Next Episode */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        const currentEpIndex = episodes.findIndex(ep => ep.id === roomInfo?.episodeId);
                                        if (currentEpIndex < episodes.length - 1) {
                                            const nextEp = episodes[currentEpIndex + 1];
                                            changeContent(nextEp.id, roomInfo?.contentId, 'show');
                                        }
                                    }}
                                    disabled={!episodes || episodes.findIndex(ep => ep.id === roomInfo?.episodeId) >= episodes.length - 1}
                                    className="flex items-center gap-1"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <SkipForward className="h-4 w-4" />
                                </Button>

                                {/* Episode Dropdown */}
                                <select
                                    value={episode?.id || ''}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            changeContent(e.target.value, roomInfo?.contentId, 'show');
                                        }
                                    }}
                                    className="bg-muted text-foreground text-sm rounded-lg px-2 py-1 border border-border cursor-pointer hover:bg-muted/80 transition-colors"
                                >
                                    {episodes?.map((ep) => (
                                        <option key={ep.id} value={ep.id}>
                                            S{ep.season}E{ep.episodeNumber}: {ep.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat Sidebar */}
                {showChat && (
                    <div className="w-80 flex-shrink-0 bg-card border-l border-border flex flex-col h-full">
                        {/* Users List */}
                        <div className="p-4 border-b border-border">
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Viewers ({users.length})
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {users.map((user) => {
                                    // Check if user is speaking: for current user use local state, for others use context
                                    const isUserSpeaking = user.id === currentUser?.id
                                        ? (isSpeaking && !isMuted)
                                        : speakingUsers.has(user.id);

                                    return (
                                        <div
                                            key={user.id}
                                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all ${isUserSpeaking
                                                ? 'bg-green-500/20 ring-2 ring-green-400 animate-pulse'
                                                : 'bg-accent'
                                                }`}
                                        >
                                            {user.isHost && <Crown className="h-3 w-3 text-yellow-500" />}
                                            {isUserSpeaking && (
                                                <span className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                                            )}
                                            {user.username}
                                            {user.isMuted && <MicOff className="h-3 w-3 text-red-500" />}
                                            {/* Host can mute other users */}
                                            {isHost && user.id !== currentUser?.id && !user.isHost && (
                                                <button
                                                    onClick={() => hostMuteUser(user.id, !user.isMuted)}
                                                    className="ml-1 p-0.5 rounded hover:bg-muted transition-colors"
                                                    title={user.isMuted ? 'Unmute user' : 'Mute user'}
                                                >
                                                    {user.isMuted ? (
                                                        <Mic className="h-3 w-3 text-muted-foreground" />
                                                    ) : (
                                                        <MicOff className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`${msg.username === 'System' ? 'text-center text-muted-foreground text-sm italic' : ''}`}
                                >
                                    {msg.username !== 'System' && (
                                        <p className="text-sm">
                                            <span className="font-semibold text-primary">{msg.username}</span>
                                            <span className="text-muted-foreground ml-2 text-xs">
                                                {new Date(msg.timestamp).toLocaleTimeString()}
                                            </span>
                                        </p>
                                    )}
                                    <p className={msg.username === 'System' ? '' : 'mt-0.5'}>{formatMessageWithMedia(msg.message)}</p>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Chat Input */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
                            {/* Hidden file input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="image/*,video/*,audio/*"
                                className="hidden"
                            />

                            {/* GIF Preview */}
                            {selectedGif && (
                                <div className="mb-3 relative inline-block">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedGif(null)}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80 z-10"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                    <img
                                        src={selectedGif}
                                        alt="GIF Preview"
                                        className="max-w-[200px] max-h-[150px] rounded-lg"
                                    />
                                </div>
                            )}

                            {/* Attachment Preview */}
                            {attachment && (
                                <div className="mb-3 relative inline-block">
                                    <button
                                        type="button"
                                        onClick={removeAttachment}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80 z-10"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                    {attachment.type === 'image' && (
                                        <img
                                            src={attachment.preview}
                                            alt="Preview"
                                            className="max-w-[200px] max-h-[150px] rounded-lg object-cover"
                                        />
                                    )}
                                    {attachment.type === 'video' && (
                                        <video
                                            src={attachment.preview}
                                            className="max-w-[200px] max-h-[150px] rounded-lg"
                                            controls
                                        />
                                    )}
                                    {attachment.type === 'audio' && (
                                        <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
                                            <Music className="w-8 h-8 text-primary" />
                                            <audio src={attachment.preview} controls className="h-8" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Reaction Emojis - above input, no visible container */}
                            <div className="flex items-center justify-center gap-1 py-1">
                                {REACTION_EMOJIS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => sendReaction(emoji)}
                                        className="text-lg hover:scale-125 transition-transform p-1 rounded hover:bg-accent/50"
                                        title={`React with ${emoji}`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-1 items-center">
                                {/* Emoji Button */}
                                <div className="relative">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className={`h-8 w-8 p-0 ${showEmojiPicker ? 'bg-muted' : ''}`}
                                    >
                                        <Smile className="h-4 w-4" />
                                    </Button>
                                    {showEmojiPicker && (
                                        <div className="absolute bottom-12 left-0 z-50">
                                            <EmojiPicker
                                                onEmojiClick={(emojiData) => {
                                                    setChatMessage(prev => prev + emojiData.emoji);
                                                    setShowEmojiPicker(false);
                                                }}
                                                theme={Theme.DARK}
                                                width={300}
                                                height={350}
                                                searchPlaceHolder="Search emoji..."
                                                skinTonesDisabled
                                                previewConfig={{ showPreview: false }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* GIF Button */}
                                <div className="relative">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowGifPicker(!showGifPicker)}
                                        className={`h-8 w-8 p-0 ${showGifPicker ? 'bg-muted' : ''}`}
                                    >
                                        <span className="text-[10px] font-bold">GIF</span>
                                    </Button>
                                    {showGifPicker && (
                                        <div className="absolute bottom-12 right-0 z-50 w-[280px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-xl">
                                            <div className="p-2 border-b border-border">
                                                <div className="relative">
                                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <Input
                                                        type="text"
                                                        placeholder="Search GIFs..."
                                                        value={gifSearch}
                                                        onChange={(e) => {
                                                            setGifSearch(e.target.value);
                                                            searchGifs(e.target.value);
                                                        }}
                                                        className="pl-8 h-8 text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="h-[250px] overflow-y-auto p-2">
                                                {isLoadingGifs ? (
                                                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading...</div>
                                                ) : gifs.length > 0 ? (
                                                    <div className="grid grid-cols-2 gap-1">
                                                        {gifs.map((gif: any) => (
                                                            <button
                                                                key={gif.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    const gifUrl = gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url;
                                                                    if (gifUrl) {
                                                                        setSelectedGif(gifUrl);
                                                                    }
                                                                    setShowGifPicker(false);
                                                                    setGifSearch('');
                                                                }}
                                                                className="aspect-video rounded overflow-hidden hover:ring-2 ring-primary"
                                                            >
                                                                <img
                                                                    src={gif.media_formats?.tinygif?.url || gif.media_formats?.nanogif?.url}
                                                                    alt={gif.content_description}
                                                                    className="w-full h-full object-cover"
                                                                    loading="lazy"
                                                                />
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                                        {gifSearch ? 'No GIFs found' : 'Search for GIFs'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-1 border-t border-border text-center">
                                                <span className="text-xs text-muted-foreground">Powered by Tenor</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Attachment Button */}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Attach image, video, or audio"
                                    className="h-8 w-8 p-0"
                                >
                                    <Paperclip className="h-4 w-4" />
                                </Button>

                                <Input
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 h-8"
                                />
                                <Button type="submit" size="sm" disabled={!chatMessage.trim() && !attachment && !selectedGif} className="h-8 w-8 p-0">
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* CSS for floating animation */}
            <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-300px) scale(1.5);
          }
        }
      `}</style>
        </div>
    );
}

export default function WatchTogether() {
    return (
        <WatchTogetherProvider>
            <WatchTogetherContent />
        </WatchTogetherProvider>
    );
}
