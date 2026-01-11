import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

// Export interface for external control
export interface VideoPlayerRef {
    play: () => void;
    pause: () => void;
    seek: (time: number) => void;
    setPlaybackRate: (rate: number) => void;
    getCurrentTime: () => number;
    getPlaybackRate: () => number;
    isPaused: () => boolean;
}

interface VideoPlayerProps {
    videoUrl: string | null | undefined;
    className?: string;
    onTimeUpdate?: (currentTime: number) => void;
    onPlay?: () => void;
    onPause?: () => void;
    onSeek?: (time: number) => void;
    onPlaybackRateChange?: (rate: number) => void;
    autoplay?: boolean;
    isHost?: boolean; // If true, shows controls; if false, hide controls for viewers
    syncMode?: boolean; // If true, disables local controls for non-hosts
}

// URL type detection helpers
const isGoogleDriveUrl = (url: string): boolean => {
    return url.includes('drive.google.com') || url.includes('docs.google.com');
};

const isJWPlayerUrl = (url: string): boolean => {
    return url.includes('jwplatform.com') ||
        url.includes('cdn.jwplayer.com') ||
        url.includes('.jwp.') ||
        url.includes('jwpltx.com');
};

const isDirectVideoUrl = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.m3u8', '.mpd'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

const isEmbedUrl = (url: string): boolean => {
    // Check for various embed patterns
    return url.includes('/embed') ||
        url.includes('/e/') ||
        url.includes('player.') ||
        url.includes('iframe');
};

// Check if URL requires proxy (protected external URLs)
const isProxyRequiredUrl = (url: string): boolean => {
    const proxyDomains = ['worthcrete.com', 'www.worthcrete.com'];
    return proxyDomains.some(domain => url.includes(domain));
};

// Get proxied URL for external videos
const getProxiedUrl = (url: string): string => {
    if (isProxyRequiredUrl(url)) {
        return `/api/proxy-video?url=${encodeURIComponent(url)}`;
    }
    return url;
};

// Extract Google Drive file ID
const extractDriveId = (url: string): string => {
    const match = url.match(/\/d\/([^/]+)/);
    if (match) return match[1];
    // Check for export format
    const exportMatch = url.match(/id=([^&]+)/);
    if (exportMatch) return exportMatch[1];
    return url;
};

// Placeholder IDs to check
const PLACEHOLDER_IDS = ['1zcFHiGEOwgq2-j6hMqpsE0ov7qcIUqCd', 'PLACEHOLDER'];

// Declare global jwplayer type
declare global {
    interface Window {
        jwplayer: any;
    }
}

// JW Player Wrapper Component with ref for external control
interface JWPlayerWrapperProps {
    videoUrl: string;
    className?: string;
    onTimeUpdate?: (currentTime: number) => void;
    onPlay?: () => void;
    onPause?: () => void;
    onSeek?: (time: number) => void;
    onPlaybackRateChange?: (rate: number) => void;
    autoplay?: boolean;
    isHost?: boolean;
    syncMode?: boolean;
}

const JWPlayerWrapper = forwardRef<VideoPlayerRef, JWPlayerWrapperProps>(({
    videoUrl,
    className = '',
    onTimeUpdate,
    onPlay,
    onPause,
    onSeek,
    onPlaybackRateChange,
    autoplay = false,
    isHost = true,
    syncMode = false
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerIdRef = useRef<string>(`jwplayer-${Math.random().toString(36).substr(2, 9)}`);
    const playerRef = useRef<any>(null);
    const lastSeekTime = useRef<number>(0);

    // Refs for callbacks to avoid stale closures
    const callbacksRef = useRef({
        onPlay,
        onPause,
        onSeek,
        onPlaybackRateChange,
        onTimeUpdate,
        isHost,
        syncMode
    });

    // Keep refs updated
    callbacksRef.current = {
        onPlay,
        onPause,
        onSeek,
        onPlaybackRateChange,
        onTimeUpdate,
        isHost,
        syncMode
    };

    // Expose control methods via ref
    useImperativeHandle(ref, () => ({
        play: () => {
            console.log('🎬 VideoPlayer.play() called');
            playerRef.current?.play();
        },
        pause: () => {
            console.log('🎬 VideoPlayer.pause() called');
            playerRef.current?.pause();
        },
        seek: (time: number) => {
            console.log('🎬 VideoPlayer.seek() called:', time);
            lastSeekTime.current = time;
            playerRef.current?.seek(time);
        },
        setPlaybackRate: (rate: number) => {
            console.log('🎬 VideoPlayer.setPlaybackRate() called:', rate);
            playerRef.current?.setPlaybackRate(rate);
        },
        getCurrentTime: () => {
            return playerRef.current?.getPosition?.() || 0;
        },
        getPlaybackRate: () => {
            return playerRef.current?.getPlaybackRate?.() || 1;
        },
        isPaused: () => {
            const state = playerRef.current?.getState?.();
            return state !== 'playing';
        }
    }));

    useEffect(() => {
        if (!containerRef.current || !window.jwplayer) {
            console.warn('JW Player not loaded');
            return;
        }

        const playerId = playerIdRef.current;

        // Initialize JW Player with full settings
        // Use proxy for protected external URLs
        const finalVideoUrl = getProxiedUrl(videoUrl);
        const player = window.jwplayer(playerId).setup({
            file: finalVideoUrl,
            width: '100%',
            height: '100%',
            autostart: autoplay,
            controls: true, // Always show controls, but we'll handle sync via events
            primary: 'html5',
            stretching: 'fill',
            playbackRateControls: true,
            playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
            displaytitle: false,
            displaydescription: false,
            skin: {
                name: 'seven'
            }
        });

        playerRef.current = player;

        // Attach event listeners using refs to avoid stale closures
        player.on('time', (e: { position: number }) => {
            callbacksRef.current.onTimeUpdate?.(e.position);
        });

        // Only emit control events if host or not in sync mode
        player.on('play', () => {
            const { isHost, syncMode, onPlay } = callbacksRef.current;
            console.log('🎬 JW Player play event - isHost:', isHost, 'syncMode:', syncMode);
            if (isHost || !syncMode) {
                onPlay?.();
            }
        });

        player.on('pause', () => {
            const { isHost, syncMode, onPause } = callbacksRef.current;
            console.log('🎬 JW Player pause event - isHost:', isHost, 'syncMode:', syncMode);
            if (isHost || !syncMode) {
                onPause?.();
            }
        });

        player.on('seek', (e: { offset: number; position: number }) => {
            const { isHost, syncMode, onSeek } = callbacksRef.current;
            console.log('🎬 JW Player seek event:', e.offset, '- isHost:', isHost);
            // Only emit if this is a user-initiated seek (not a sync seek)
            if ((isHost || !syncMode) && Math.abs(e.offset - lastSeekTime.current) > 1) {
                onSeek?.(e.offset);
            }
        });

        player.on('playbackRateChanged', (e: { playbackRate: number }) => {
            const { isHost, syncMode, onPlaybackRateChange } = callbacksRef.current;
            console.log('🎬 JW Player playbackRate changed:', e.playbackRate, '- isHost:', isHost);
            if (isHost || !syncMode) {
                onPlaybackRateChange?.(e.playbackRate);
            }
        });

        return () => {
            playerRef.current = null;
            try {
                window.jwplayer(playerId).remove();
            } catch (e) {
                // Player may already be destroyed
            }
        };
    }, [videoUrl, autoplay, isHost, syncMode]);

    return (
        <div className={`w-full h-full ${className}`} style={{ position: 'relative' }}>
            <div
                id={playerIdRef.current}
                ref={containerRef}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            ></div>
        </div>
    );
});

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
    videoUrl,
    className = '',
    onTimeUpdate,
    onPlay,
    onPause,
    onSeek,
    onPlaybackRateChange,
    autoplay = false,
    isHost = true,
    syncMode = false
}, ref) => {
    const jwPlayerRef = useRef<VideoPlayerRef>(null);
    const [playerType, setPlayerType] = useState<'drive' | 'jwplayer' | 'direct' | 'embed' | 'none'>('none');
    const [processedUrl, setProcessedUrl] = useState<string | null>(null);

    // Forward ref to internal player
    useImperativeHandle(ref, () => ({
        play: () => jwPlayerRef.current?.play(),
        pause: () => jwPlayerRef.current?.pause(),
        seek: (time: number) => jwPlayerRef.current?.seek(time),
        setPlaybackRate: (rate: number) => jwPlayerRef.current?.setPlaybackRate(rate),
        getCurrentTime: () => jwPlayerRef.current?.getCurrentTime() || 0,
        getPlaybackRate: () => jwPlayerRef.current?.getPlaybackRate() || 1,
        isPaused: () => jwPlayerRef.current?.isPaused() ?? true
    }));

    useEffect(() => {
        if (!videoUrl) {
            setPlayerType('none');
            setProcessedUrl(null);
            return;
        }

        // Check for placeholder
        const isPlaceholder = PLACEHOLDER_IDS.some(id => videoUrl.includes(id));
        if (isPlaceholder) {
            setPlayerType('none');
            setProcessedUrl(null);
            return;
        }

        // Check if it's a full URL or just a Drive ID
        const isAbsoluteUrl = videoUrl.startsWith('http://') || videoUrl.startsWith('https://');

        // If it's just a Google Drive ID (alphanumeric with dashes/underscores, typically 30-40 chars)
        const isDriveId = /^[a-zA-Z0-9_-]{20,60}$/.test(videoUrl);

        if (isDriveId && !isAbsoluteUrl) {
            // It's a plain Google Drive ID - convert to embed URL
            console.log('VideoPlayer: Detected Drive ID, converting to embed URL');
            setPlayerType('drive');
            setProcessedUrl(`https://drive.google.com/file/d/${videoUrl}/preview?autoplay=0&controls=1&modestbranding=1`);
            return;
        }

        // If not absolute URL and not a Drive ID, it's invalid
        if (!isAbsoluteUrl) {
            console.warn('VideoPlayer: Invalid URL format (must be absolute URL or Drive ID)', videoUrl);
            setPlayerType('none');
            setProcessedUrl(null);
            return;
        }

        // Detect URL type and process accordingly
        if (isGoogleDriveUrl(videoUrl)) {
            setPlayerType('drive');
            const driveId = extractDriveId(videoUrl);
            setProcessedUrl(`https://drive.google.com/file/d/${driveId}/preview?autoplay=0&controls=1&modestbranding=1`);
        } else if (isJWPlayerUrl(videoUrl)) {
            setPlayerType('jwplayer');
            // Use URL directly for JW Player embed or convert if needed
            setProcessedUrl(videoUrl);
        } else if (isDirectVideoUrl(videoUrl)) {
            setPlayerType('direct');
            setProcessedUrl(videoUrl);
        } else if (isEmbedUrl(videoUrl)) {
            setPlayerType('embed');
            setProcessedUrl(videoUrl);
        } else {
            // Default: treat as generic embed
            setPlayerType('embed');
            setProcessedUrl(videoUrl);
        }
    }, [videoUrl]);

    // Render placeholder when no video available
    if (playerType === 'none' || !processedUrl) {
        return (
            <div className={`w-full h-full flex flex-col items-center justify-center text-white p-8 text-center bg-black ${className}`}>
                <div className="mb-6">
                    <svg className="w-20 h-20 mx-auto mb-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        <line x1="4" y1="4" x2="20" y2="20" strokeLinecap="round" strokeWidth={2} />
                    </svg>
                    <h3 className="text-2xl font-bold mb-2">Video Not Available</h3>
                    <p className="text-muted-foreground mb-6">
                        This content is not available yet. We're working on adding it!
                    </p>
                </div>
                <Link href="/request">
                    <Button variant="default" size="lg" className="gap-2">
                        Request This Content
                    </Button>
                </Link>
            </div>
        );
    }

    // Google Drive Player
    if (playerType === 'drive') {
        return (
            <iframe
                src={processedUrl}
                className={`w-full h-full border-0 ${className}`}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                style={{ border: 'none' }}
            />
        );
    }

    // JW Player - Use iframe embed
    if (playerType === 'jwplayer') {
        // If it's already an embed URL, use directly
        // Otherwise, try to create proper embed URL
        let embedUrl = processedUrl;

        // Convert JW Player CDN URLs to embed format if needed
        if (!processedUrl.includes('/embed') && processedUrl.includes('cdn.jwplayer.com')) {
            // Try to extract media ID and create embed URL
            const mediaIdMatch = processedUrl.match(/\/([a-zA-Z0-9]{8})-/);
            if (mediaIdMatch) {
                const mediaId = mediaIdMatch[1];
                embedUrl = `https://cdn.jwplayer.com/players/${mediaId}-${mediaId}.html`;
            }
        }

        return (
            <iframe
                src={embedUrl}
                className={`w-full h-full border-0 ${className}`}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                style={{ border: 'none' }}
                scrolling="no"
            />
        );
    }

    // Direct Video (MP4, WebM, etc.) - Use JW Player
    if (playerType === 'direct') {
        return (
            <JWPlayerWrapper
                ref={jwPlayerRef}
                videoUrl={processedUrl!}
                className={className}
                onTimeUpdate={onTimeUpdate}
                onPlay={onPlay}
                onPause={onPause}
                onSeek={onSeek}
                onPlaybackRateChange={onPlaybackRateChange}
                autoplay={autoplay}
                isHost={isHost}
                syncMode={syncMode}
            />
        );
    }

    // Generic Embed (iframe for other players)
    return (
        <iframe
            src={processedUrl}
            className={`w-full h-full border-0 ${className}`}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            style={{ border: 'none' }}
            scrolling="no"
        />
    );
});

export default VideoPlayer;
