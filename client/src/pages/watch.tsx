import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { useEffect, useState, useRef } from "react";
import { ChevronLeft, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentsSection } from "@/components/comments-section";
import { Helmet } from "react-helmet-async";
import type { Show, Episode } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function Watch() {
  const [, params] = useRoute("/watch/:slug");
  const [location] = useLocation();
  const slug = params?.slug;

  // Use window.location.search to get query parameters reliably
  const searchParams = new URLSearchParams(window.location.search);
  const currentSeason = parseInt(searchParams.get("season") || "1");
  const currentEpisode = parseInt(searchParams.get("episode") || "1");

  const { data: show } = useQuery<Show>({
    queryKey: ["/api/shows", slug],
    enabled: !!slug,
  });

  const { data: episodes } = useQuery<Episode[]>({
    queryKey: ["/api/episodes", show?.id],
    enabled: !!show?.id,
  });

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
    if (currentEpisodeData && show && !progressUpdated.current) {
      progressUpdated.current = true;
      updateProgressMutation.mutate({
        showId: show.id,
        episodeId: currentEpisodeData.id,
        season: currentSeason,
        episodeNumber: currentEpisode,
        progress: 0,
        lastWatched: new Date().toISOString(),
      });
    }
    
    return () => {
      progressUpdated.current = false;
    };
  }, [currentEpisodeData?.id, show?.id, currentSeason, currentEpisode]);

  // Set Media Session metadata for browser controls
  useEffect(() => {
    if ('mediaSession' in navigator && currentEpisodeData && show) {
      const episodeTitle = currentEpisodeData.title || `Episode ${currentEpisode}`;
      const metadata = {
        title: episodeTitle,
        artist: show.title,
        album: `Season ${currentSeason}`,
        artwork: [
          {
            src: currentEpisodeData.thumbnailUrl || show.posterUrl || '',
            sizes: '512x512',
            type: 'image/jpeg',
          },
          {
            src: currentEpisodeData.thumbnailUrl || show.posterUrl || '',
            sizes: '256x256',
            type: 'image/jpeg',
          },
        ],
      };

      navigator.mediaSession.metadata = new MediaMetadata(metadata);
      
      // Update document title
      document.title = `${episodeTitle} - ${show.title} | StreamVault`;
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
      }
      document.title = 'StreamVault - Free Movies & TV Shows';
    };
  }, [currentEpisodeData, show, currentSeason, currentEpisode]);

  if (!show || !currentEpisodeData) {
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
  const PLACEHOLDER_IDS = ['1zcFHiGEOwgq2-j6hMqpsE0ov7qcIUqCd', 'PLACEHOLDER'];
  
  // Check if it's a placeholder URL or no URL at all
  const isPlaceholder = PLACEHOLDER_IDS.some(id => videoUrl?.includes(id));
  const driveId = (!videoUrl || isPlaceholder) ? null : extractDriveId(videoUrl);

  const episodeTitle = currentEpisodeData.title || `Episode ${currentEpisode}`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`${episodeTitle} - ${show.title} S${currentSeason}E${currentEpisode} | StreamVault`}</title>
        <meta name="description" content={currentEpisodeData.description || show.description} />
        <link rel="canonical" href={`https://streamvault.live/watch/${show.slug}?season=${currentSeason}&episode=${currentEpisode}`} />
        <meta property="og:type" content="video.episode" />
        <meta property="og:title" content={`${episodeTitle} - ${show.title}`} />
        <meta property="og:description" content={currentEpisodeData.description || show.description} />
        <meta property="og:image" content={currentEpisodeData.thumbnailUrl || show.backdropUrl} />
      </Helmet>
      <div className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <Link href={`/show/${slug}`}>
          <Button
            variant="ghost"
            className="mb-4 gap-2"
            data-testid="button-back-to-show"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to {show.title}
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="aspect-video bg-black rounded-md overflow-hidden">
              {driveId ? (
                <iframe
                  key={`${currentSeason}-${currentEpisode}`}
                  src={`https://drive.google.com/file/d/${driveId}/preview?autoplay=0&controls=1&modestbranding=1`}
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  data-testid="iframe-video-player"
                  style={{ border: 'none' }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white p-8 text-center">
                  <div className="mb-6">
                    <svg className="w-20 h-20 mx-auto mb-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      <line x1="4" y1="4" x2="20" y2="20" strokeLinecap="round" strokeWidth={2} />
                    </svg>
                    <h3 className="text-2xl font-bold mb-2">Episode Not Available</h3>
                    <p className="text-muted-foreground mb-6">
                      This episode is not available yet. We're working on adding it!
                    </p>
                  </div>
                  <Link href="/request">
                    <Button variant="default" size="lg" className="gap-2">
                      Request This Episode
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Episode Info */}
            <div className="mt-4">
              <h1
                className="text-2xl md:text-3xl font-bold mb-2"
                data-testid="text-episode-title"
              >
                {show.title}
              </h1>
              <h2 className="text-lg text-muted-foreground mb-3">
                S{currentSeason} E{currentEpisode}: {currentEpisodeData.title}
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
                      const url = `/watch/${slug}?season=${episode.season}&episode=${episode.episodeNumber}`;
                      console.log("Up Next - navigating to:", url);
                      window.location.replace(url);
                    }}
                  >
                      <div className="flex gap-3">
                        <div className="relative w-32 aspect-video flex-shrink-0">
                          <img
                            src={episode.thumbnailUrl}
                            alt={episode.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-6 h-6 text-primary fill-current" />
                          </div>
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
    </div>
  );
}
