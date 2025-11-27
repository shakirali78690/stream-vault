import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Play, Plus, Check, Star, Share2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Show, Episode } from "@shared/schema";
import { useState, useEffect } from "react";
import { ContentRow } from "@/components/content-row";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Extract Google Drive ID from URL and generate thumbnail
const getEpisodeThumbnail = (episode: Episode, showBackdrop?: string) => {
  // Priority 1: Use custom thumbnail if it's NOT the show backdrop
  if (episode.thumbnailUrl && episode.thumbnailUrl !== showBackdrop) {
    return episode.thumbnailUrl;
  }
  
  // Priority 2: Auto-generate from Google Drive video
  const driveIdMatch = episode.googleDriveUrl?.match(/\/d\/([^/]+)/);
  if (driveIdMatch && driveIdMatch[1] !== 'PLACEHOLDER_VIDEO_ID') {
    return `https://drive.google.com/thumbnail?id=${driveIdMatch[1]}&sz=w1000`;
  }
  
  // Priority 3: Fallback to episode's thumbnail or show backdrop
  return episode.thumbnailUrl;
};

export default function ShowDetail() {
  const [, params] = useRoute("/show/:slug");
  const [, setLocation] = useLocation();
  const slug = params?.slug;

  const { data: show, isLoading: showLoading } = useQuery<Show>({
    queryKey: ["/api/shows", slug],
    enabled: !!slug,
  });

  const { data: episodes, isLoading: episodesLoading } = useQuery<Episode[]>({
    queryKey: ["/api/episodes", show?.id],
    enabled: !!show?.id,
  });

  const { data: allShows } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  const [selectedSeason, setSelectedSeason] = useState(1);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: watchlist = [] } = useQuery<any[]>({
    queryKey: ["/api/watchlist"],
  });

  const isInWatchlist = show ? watchlist.some((item) => item.showId === show.id) : false;

  const addToWatchlistMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/watchlist", {
        showId: show!.id,
        addedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
  });

  const removeFromWatchlistMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/watchlist/${show!.id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
  });

  const toggleWatchlist = () => {
    if (!show) return;

    if (isInWatchlist) {
      removeFromWatchlistMutation.mutate();
    } else {
      addToWatchlistMutation.mutate();
    }
  };

  const handleShare = async () => {
    if (!show) return;

    const shareData = {
      title: `${show.title} - StreamVault`,
      text: `Watch ${show.title} online free in HD! ${show.description.slice(0, 100)}...`,
      url: `https://streamvault.live/show/${show.slug}`,
    };

    // Try native share API first (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast({
          title: "Shared successfully!",
          description: "Thanks for sharing StreamVault!",
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link copied!",
          description: "Share link copied to clipboard",
        });
      } catch (err) {
        console.error('Error copying to clipboard:', err);
        toast({
          title: "Share link",
          description: shareData.url,
          variant: "default",
        });
      }
    }
  };

  // Update meta tags dynamically for social sharing
  useEffect(() => {
    if (!show) return;

    // Update page title
    document.title = `${show.title} - Watch Online Free | StreamVault`;

    // Update or create meta tags
    const updateMetaTag = (property: string, content: string, isProperty = true) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${property}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, property);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    // Update Open Graph tags
    updateMetaTag('og:title', `${show.title} - Watch Online Free | StreamVault`);
    updateMetaTag('og:description', show.description);
    updateMetaTag('og:image', show.backdropUrl);
    updateMetaTag('og:url', `https://streamvault.live/show/${show.slug}`);
    updateMetaTag('og:type', 'video.tv_show');

    // Update Twitter Card tags
    updateMetaTag('twitter:title', `${show.title} - Watch Online Free`, false);
    updateMetaTag('twitter:description', show.description, false);
    updateMetaTag('twitter:image', show.backdropUrl, false);
    updateMetaTag('twitter:card', 'summary_large_image', false);

    // Update description meta tag
    updateMetaTag('description', show.description, false);

    // Cleanup function to reset to default on unmount
    return () => {
      document.title = 'StreamVault - Online Movie Streaming | Watch TV Shows Free | Stream Movies HD';
    };
  }, [show]);

  if (showLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="w-full h-96" />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Show not found</h1>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const seasonEpisodes = episodes?.filter((ep) => ep.season === selectedSeason) || [];
  const seasons = Array.from(
    new Set(episodes?.map((ep) => ep.season) || [])
  ).sort((a, b) => a - b);

  const similarShows =
    allShows?.filter(
      (s) => {
        if (s.id === show.id) return false;
        const sGenres = s.genres?.split(',').map(g => g.trim().toLowerCase()) || [];
        const showGenres = show.genres?.split(',').map(g => g.trim().toLowerCase()) || [];
        return sGenres.some((genre) => showGenres.includes(genre));
      }
    ).slice(0, 12) || [];

  return (
    <div className="min-h-screen">
      {/* Hero Section - Poster on mobile, Backdrop on desktop */}
      <div className="relative w-full h-96 md:h-[500px] overflow-hidden">
        {/* Poster for mobile */}
        <div
          className="absolute inset-0 bg-cover bg-center md:hidden"
          style={{ backgroundImage: `url(${show.posterUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        </div>
        {/* Backdrop for desktop */}
        <div
          className="absolute inset-0 bg-cover bg-center hidden md:block"
          style={{ backgroundImage: `url(${show.backdropUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        </div>

        {/* Back Button - Overlaid on image */}
        <div className="absolute top-4 left-4 z-10">
          <Link href="/series">
            <Button variant="ghost" className="gap-2 bg-background/20 backdrop-blur-sm hover:bg-background/40">
              <ChevronLeft className="w-4 h-4" />
              Back to Series
            </Button>
          </Link>
        </div>

        <div className="relative h-full container mx-auto px-4 flex items-end pb-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full">
            {/* Poster - Hidden on mobile */}
            <div className="flex-shrink-0 hidden md:block">
              <img
                src={show.posterUrl}
                alt={show.title}
                className="w-48 md:w-64 rounded-md shadow-xl"
                data-testid="img-show-poster"
              />
            </div>

            {/* Info */}
            <div className="flex-1 space-y-2 md:space-y-4">
              <h1
                className="text-2xl md:text-5xl font-bold"
                data-testid="text-show-title"
              >
                {show.title}
              </h1>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm">
                {show.imdbRating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{show.imdbRating}</span>
                  </div>
                )}
                <span>{show.year}</span>
                <span>{show.rating}</span>
                <span>
                  {show.totalSeasons} Season{show.totalSeasons > 1 ? "s" : ""}
                </span>
                <span>{show.language}</span>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {show.genres?.split(',').map((genre) => (
                  <Badge key={genre.trim()} variant="secondary" className="text-xs md:text-sm">
                    {genre.trim()}
                  </Badge>
                ))}
              </div>

              {/* Description - Hidden on mobile */}
              <p className="text-base max-w-3xl hidden md:block">{show.description}</p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-2 md:gap-3 pt-1 md:pt-2">
                <Link href={`/watch/${show.slug}`}>
                  <Button size="default" className="gap-1.5 md:gap-2 text-sm md:text-base h-9 md:h-11" data-testid="button-play-episode-1">
                    <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                    Play Episode 1
                  </Button>
                </Link>
                <Button
                  size="default"
                  variant="outline"
                  className="gap-1.5 md:gap-2 text-sm md:text-base h-9 md:h-11"
                  onClick={toggleWatchlist}
                  data-testid="button-add-to-watchlist"
                >
                  {isInWatchlist ? (
                    <>
                      <Check className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden sm:inline">In Watchlist</span>
                      <span className="sm:hidden">Watchlist</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden sm:inline">Add to Watchlist</span>
                      <span className="sm:hidden">Watchlist</span>
                    </>
                  )}
                </Button>
                <Button
                  size="default"
                  variant="outline"
                  className="gap-1.5 md:gap-2 text-sm md:text-base h-9 md:h-11"
                  onClick={handleShare}
                  data-testid="button-share-show"
                >
                  <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="episodes" className="w-full">
          <TabsList className="mb-4 md:mb-6">
            <TabsTrigger value="episodes" data-testid="tab-episodes" className="text-xs md:text-sm">
              Episodes
            </TabsTrigger>
            <TabsTrigger value="about" data-testid="tab-about" className="text-xs md:text-sm">
              About
            </TabsTrigger>
            <TabsTrigger value="similar" data-testid="tab-similar" className="text-xs md:text-sm">
              Similar Shows
            </TabsTrigger>
          </TabsList>

          {/* Episodes Tab */}
          <TabsContent value="episodes" className="space-y-6">
            {/* Season Selector */}
            {seasons.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {seasons.map((season) => (
                  <Button
                    key={season}
                    variant={selectedSeason === season ? "default" : "outline"}
                    onClick={() => setSelectedSeason(season)}
                    data-testid={`button-season-${season}`}
                    className="text-xs md:text-sm h-8 md:h-10"
                  >
                    Season {season}
                  </Button>
                ))}
              </div>
            )}

            {/* Episodes List */}
            {episodesLoading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="w-64 aspect-video flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {seasonEpisodes.map((episode) => (
                  <div
                    key={episode.id}
                    onClick={() => {
                      const url = `/watch/${show.slug}?season=${episode.season}&episode=${episode.episodeNumber}`;
                      console.log("Clicking episode - navigating to:", url);
                      window.location.replace(url);
                    }}
                  >
                    <Card className="overflow-hidden cursor-pointer group hover-elevate active-elevate-2 transition-all">
                      <div className="flex gap-3 md:gap-4 p-0">
                        {/* Thumbnail */}
                        <div className="relative w-32 md:w-64 flex-shrink-0 aspect-video">
                          <img
                            src={getEpisodeThumbnail(episode, show.backdropUrl)}
                            alt={episode.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-8 md:w-12 h-8 md:h-12 text-primary fill-current" />
                          </div>
                        </div>
                        
                        {/* Episode Info */}
                        <div className="flex-1 py-3 md:py-4 pr-3 md:pr-4">
                          <h3
                            className="text-base md:text-xl font-semibold mb-1 md:mb-2 line-clamp-1"
                            data-testid={`text-episode-title-${episode.id}`}
                          >
                            {episode.title}
                          </h3>
                          <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3">
                            S{episode.season} E{episode.episodeNumber} • {episode.airDate} • {episode.duration}m
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                            {episode.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <div className="max-w-3xl space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{show.description}</p>
              </div>

              {show.cast && show.cast.trim() && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Cast</h3>
                  <p className="text-muted-foreground">{show.cast}</p>
                </div>
              )}

              {show.creators && show.creators.trim() && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Creators</h3>
                  <p className="text-muted-foreground">
                    {show.creators}
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-2">Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Year:</span>{" "}
                    <span className="font-medium">{show.year}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rating:</span>{" "}
                    <span className="font-medium">{show.rating}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Language:</span>{" "}
                    <span className="font-medium">{show.language}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Seasons:</span>{" "}
                    <span className="font-medium">{show.totalSeasons}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Similar Shows Tab */}
          <TabsContent value="similar">
            {similarShows.length > 0 ? (
              <ContentRow title="" shows={similarShows} orientation="landscape" />
            ) : (
              <p className="text-muted-foreground">No similar shows found.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
