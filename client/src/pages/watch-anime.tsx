import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { useEffect, useState, useRef } from "react";
import { ChevronLeft, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CommentsSection } from "@/components/comments-section";
import { VideoPlayer, VideoPlayerRef } from "@/components/video-player";
import { Helmet } from "react-helmet-async";
import type { Anime, AnimeEpisode } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { trackWatch } from "@/components/analytics-tracker";

export default function WatchAnime() {
    const [, params] = useRoute("/watch-anime/:slug");
    const [location] = useLocation();
    const slug = params?.slug;

    // Use window.location.search to get query parameters reliably
    const searchParams = new URLSearchParams(window.location.search);
    const currentSeason = parseInt(searchParams.get("s") || searchParams.get("season") || "1");
    const currentEpisode = parseInt(searchParams.get("e") || searchParams.get("episode") || "1");

    const { data: anime } = useQuery<Anime>({
        queryKey: ["/api/anime", slug],
        enabled: !!slug,
    });

    const { data: episodes } = useQuery<AnimeEpisode[]>({
        queryKey: ["/api/anime-episodes", anime?.id],
        enabled: !!anime?.id,
    });

    // Fetch blog posts to get IMDB links for subtitles
    const { data: blogPosts = [] } = useQuery<any[]>({
        queryKey: ["/api/blog"],
        enabled: !!anime?.id,
    });

    // Find matching blog post for this anime to get external links
    const blogPost = anime ? blogPosts.find(
        (post) => post.contentId === anime.id || post.slug === anime.slug
    ) : null;

    const currentEpisodeData = episodes?.find(
        (ep) => ep.season === currentSeason && ep.episodeNumber === currentEpisode
    );

    const upNextEpisodes = episodes
        ?.filter(
            (ep) =>
                (ep.season === currentSeason && ep.episodeNumber > currentEpisode) ||
                (ep.season === currentSeason + 1 && ep.episodeNumber === 1)
        )
        .sort((a, b) => {
            if (a.season !== b.season) return a.season - b.season;
            return a.episodeNumber - b.episodeNumber;
        })
        .slice(0, 10) || [];

    // Next episode for the "Next Episode" button
    const nextEpisode = upNextEpisodes[0];

    // Video player ref
    const videoPlayerRef = useRef<VideoPlayerRef>(null);

    // State for Next Episode button (only for direct video/JWPlayer)
    const [showNextEpisode, setShowNextEpisode] = useState(false);
    const [secondsRemaining, setSecondsRemaining] = useState(0);

    // State for subtitle tracks
    const [subtitleTracks, setSubtitleTracks] = useState<Array<{
        file: string;
        label: string;
        kind: 'captions' | 'subtitles';
        default?: boolean;
    }>>([]);

    // Fetch subtitles when episode loads
    useEffect(() => {
        const fetchSubtitles = async () => {
            if (!anime || !currentEpisodeData || !blogPost) return;

            try {
                // Parse IMDB ID from blog post external links
                const externalLinks = blogPost.externalLinks
                    ? (typeof blogPost.externalLinks === 'string'
                        ? JSON.parse(blogPost.externalLinks)
                        : blogPost.externalLinks)
                    : null;

                const imdbLink = externalLinks?.imdb;
                if (!imdbLink) {
                    console.log('No IMDB link found for subtitle search');
                    return;
                }

                // Extract just the IMDB ID (tt1234567) from the link
                const imdbMatch = imdbLink.match(/tt\d+/);
                if (!imdbMatch) {
                    console.log('Invalid IMDB ID format');
                    return;
                }

                console.log(`🔍 Fetching subtitles for ${imdbMatch[0]} S${currentSeason}E${currentEpisode}`);

                const response = await fetch(
                    `/api/subtitles/search?imdbId=${imdbMatch[0]}&season=${currentSeason}&episode=${currentEpisode}&language=en`
                );

                if (!response.ok) {
                    console.error('Subtitle search failed');
                    return;
                }

                const data = await response.json();

                if (data.subtitles && data.subtitles.length > 0) {
                    console.log(`✅ Found ${data.subtitles.length} subtitles`);

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
                    console.log('No subtitles found');
                }
            } catch (error) {
                console.error('Error fetching subtitles:', error);
            }
        };

        fetchSubtitles();
    }, [anime?.id, currentEpisodeData?.id, currentSeason, currentEpisode, blogPost]);

    // Helper to check if URL is a direct video (JWPlayer compatible)
    const isDirectVideoUrl = (url: string | undefined): boolean => {
        if (!url) return false;
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.m3u8', '.mpd'];
        const isGoogleDrive = url.includes('drive.google.com') || url.includes('docs.google.com');
        const isEmbed = url.includes('/embed') || url.includes('/e/') || url.includes('player.');
        return !isGoogleDrive && !isEmbed && videoExtensions.some(ext => url.toLowerCase().includes(ext));
    };

    // Navigate to next episode
    const goToNextEpisode = () => {
        if (nextEpisode && slug) {
            const url = `/watch-anime/${slug}?s=${nextEpisode.season}&e=${nextEpisode.episodeNumber}`;
            window.location.replace(url);
        }
    };

    // Handle time update from video player - shows Next Episode button 30s before end
    const handleTimeUpdate = (currentTime: number, duration: number) => {
        if (!nextEpisode || duration <= 0) return;

        const remaining = duration - currentTime;

        // Show button 30 seconds before end
        if (remaining <= 30 && remaining > 0) {
            setShowNextEpisode(true);
            setSecondsRemaining(Math.ceil(remaining));
        } else if (remaining <= 0) {
            // Keep showing after video ends
            setShowNextEpisode(true);
            setSecondsRemaining(0);
        } else {
            setShowNextEpisode(false);
        }
    };

    const queryClient = useQueryClient();
    const progressUpdated = useRef(false);

    const updateProgressMutation = useMutation({
        mutationFn: (progress: any) =>
            apiRequest("POST", "/api/progress", progress),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
        },
    });

    useEffect(() => {
        if (currentEpisodeData && anime && !progressUpdated.current) {
            progressUpdated.current = true;
            updateProgressMutation.mutate({
                animeId: anime.id,
                episodeId: currentEpisodeData.id,
                season: currentSeason,
                episodeNumber: currentEpisode,
                progress: 0,
                lastWatched: new Date().toISOString(),
            });

            // Track watch event for analytics
            trackWatch('anime', anime.id, anime.title, currentEpisodeData.id, currentEpisodeData.duration ? currentEpisodeData.duration * 60 : 0);
        }

        return () => {
            progressUpdated.current = false;
        };
    }, [currentEpisodeData?.id, anime?.id, currentSeason, currentEpisode]);

    // Set Media Session metadata for browser controls
    useEffect(() => {
        if ('mediaSession' in navigator && currentEpisodeData && anime) {
            const episodeTitle = currentEpisodeData.title || `Episode ${currentEpisode}`;
            const metadata = {
                title: episodeTitle,
                artist: anime.title,
                album: `Season ${currentSeason}`,
                artwork: [
                    {
                        src: currentEpisodeData.thumbnailUrl || anime.posterUrl || '',
                        sizes: '512x512',
                        type: 'image/jpeg',
                    },
                    {
                        src: currentEpisodeData.thumbnailUrl || anime.posterUrl || '',
                        sizes: '256x256',
                        type: 'image/jpeg',
                    },
                ],
            };

            navigator.mediaSession.metadata = new MediaMetadata(metadata);

            // Update document title
            document.title = `${episodeTitle} - ${anime.title} | StreamVault`;
        }

        return () => {
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = null;
            }
            document.title = 'StreamVault - Free Anime Streaming';
        };
    }, [currentEpisodeData, anime, currentSeason, currentEpisode]);

    if (!anime || !currentEpisodeData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Skeleton className="w-full max-w-5xl aspect-video" />
            </div>
        );
    }

    const extractDriveId = (url: string | undefined) => {
        if (!url) return null;
        // Check if it's a full URL with /d/ pattern
        const match = url.match(/\/d\/([^/]+)/);
        if (match) return match[1];
        // Otherwise, assume it's already just the file ID
        return url;
    };

    const videoUrl = currentEpisodeData.videoUrl || currentEpisodeData.googleDriveUrl;
    const PLACEHOLDER_IDS = ['placeholder', 'PLACEHOLDER'];

    // Check if it's a placeholder URL or no URL at all
    const isPlaceholder = PLACEHOLDER_IDS.some(id => videoUrl?.toLowerCase().includes(id));
    const driveId = (!videoUrl || isPlaceholder) ? null : extractDriveId(videoUrl);

    const episodeTitle = currentEpisodeData.title || `Episode ${currentEpisode}`;

    return (
        <div className="min-h-screen bg-background">
            <Helmet>
                <title>{`${episodeTitle} - ${anime.title} S${currentSeason}E${currentEpisode} | StreamVault`}</title>
                <meta name="description" content={currentEpisodeData.description || anime.description} />
                {/* Canonical points to anime detail page to avoid duplicate content */}
                <link rel="canonical" href={`https://streamvault.live/anime/${anime.slug}`} />
                <meta property="og:type" content="video.episode" />
                <meta property="og:title" content={`${episodeTitle} - ${anime.title}`} />
                <meta property="og:description" content={currentEpisodeData.description || anime.description} />
                <meta property="og:image" content={currentEpisodeData.thumbnailUrl || anime.backdropUrl} />
                <meta property="og:url" content={`https://streamvault.live/anime/${anime.slug}`} />
            </Helmet>
            <div className="container mx-auto px-4 py-6">
                {/* Back Button */}
                <Link href={`/anime/${slug}`}>
                    <Button
                        variant="ghost"
                        className="mb-4 gap-2"
                        data-testid="button-back-to-anime"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to {anime.title}
                    </Button>
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Video Player */}
                    <div className="lg:col-span-2">
                        <div className="aspect-video bg-black rounded-md overflow-hidden relative">
                            <VideoPlayer
                                ref={videoPlayerRef}
                                videoUrl={videoUrl}
                                onTimeUpdate={handleTimeUpdate}
                                subtitleTracks={subtitleTracks}
                            />

                            {/* Netflix-style Next Episode Button with Progress Bar - Only for direct video players */}
                            {isDirectVideoUrl(videoUrl) && showNextEpisode && nextEpisode && (
                                <div className="absolute bottom-20 right-4 z-50 animate-in slide-in-from-right duration-300">
                                    <button
                                        onClick={goToNextEpisode}
                                        className="relative flex items-center gap-3 bg-gray-300 text-black px-5 py-2.5 rounded-md font-semibold text-base shadow-xl overflow-hidden"
                                    >
                                        {/* Netflix-style progress bar with smooth CSS animation */}
                                        <div
                                            className="absolute top-0 left-0 bottom-0 bg-white"
                                            style={{
                                                animation: 'nextEpFill 30s linear forwards'
                                            }}
                                        />
                                        {/* Button content (above progress bar) */}
                                        <div className="relative z-10 flex items-center gap-3">
                                            <Play className="w-5 h-5 fill-current" />
                                            <span>Next Episode</span>
                                        </div>
                                    </button>
                                    <style>{`
                    @keyframes nextEpFill {
                      from { width: 0%; }
                      to { width: 100%; }
                    }
                  `}</style>
                                </div>
                            )}
                        </div>

                        {/* Episode Info */}
                        <div className="mt-4">
                            <h1
                                className="text-2xl md:text-3xl font-bold mb-2"
                                data-testid="text-episode-title"
                            >
                                {anime.title}
                            </h1>
                            <h2 className="text-lg text-muted-foreground mb-3">
                                S{currentSeason} E{currentEpisode}: {currentEpisodeData.title}
                                {currentEpisodeData.dubbed && (
                                    <Badge className="ml-2" variant="secondary">Dubbed</Badge>
                                )}
                            </h2>
                            <p className="text-muted-foreground">
                                {currentEpisodeData.description}
                            </p>
                            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                                <span>{currentEpisodeData.duration} min</span>
                                {currentEpisodeData.airDate && <span>{currentEpisodeData.airDate}</span>}
                            </div>
                        </div>

                        {/* Comments Section - Desktop only */}
                        <div className="mt-8 hidden lg:block">
                            <CommentsSection episodeId={currentEpisodeData.id} />
                        </div>
                    </div>

                    {/* Up Next Sidebar */}
                    <div className="lg:col-span-1">
                        <h3 className="text-lg font-semibold mb-4">Up Next</h3>
                        <div className="space-y-3">
                            {upNextEpisodes.length > 0 ? (
                                upNextEpisodes.map((episode) => (
                                    <Card
                                        key={episode.id}
                                        className="overflow-hidden cursor-pointer group hover-elevate active-elevate-2 transition-all"
                                        onClick={() => {
                                            const url = `/watch-anime/${slug}?s=${episode.season}&e=${episode.episodeNumber}`;
                                            console.log("Up Next - navigating to:", url);
                                            window.location.replace(url);
                                        }}
                                    >
                                        <div className="flex gap-3">
                                            <div className="relative w-32 aspect-video flex-shrink-0">
                                                <img
                                                    src={episode.thumbnailUrl || anime.backdropUrl}
                                                    alt={episode.title}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Play className="w-6 h-6 text-primary fill-current" />
                                                </div>
                                                {episode.dubbed && (
                                                    <Badge className="absolute top-1 left-1 text-[10px]" variant="secondary">Dub</Badge>
                                                )}
                                            </div>
                                            <div className="flex-1 py-2 pr-3 min-w-0">
                                                <p className="text-xs text-muted-foreground mb-1">
                                                    S{episode.season} E{episode.episodeNumber}
                                                </p>
                                                <h4 className="text-sm font-medium line-clamp-2">
                                                    {episode.title}
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {episode.duration} min
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No more episodes available.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Adsterra Native Banner - Above Comments */}
                <div className="mt-8 flex justify-center">
                    <div id="container-326e4e570b95e9b55f432cac93890441"></div>
                </div>

                {/* Comments Section - Mobile only (below Up Next) */}
                <div className="mt-8 lg:hidden">
                    <CommentsSection episodeId={currentEpisodeData.id} />
                </div>
            </div>
        </div >
    );
}
