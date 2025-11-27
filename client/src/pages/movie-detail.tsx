import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Play, Clock, Calendar, Star, Plus, Check, Share2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Movie } from "@shared/schema";

export default function MovieDetail() {
  const [, params] = useRoute("/movie/:slug");
  const slug = params?.slug;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: movie, isLoading } = useQuery<Movie>({
    queryKey: [`/api/movies/${slug}`],
    enabled: !!slug,
  });

  const { data: watchlist = [] } = useQuery<any[]>({
    queryKey: ["/api/watchlist"],
  });

  const isInWatchlist = movie ? watchlist.some((item) => item.movieId === movie.id) : false;

  const addToWatchlistMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/watchlist", {
        movieId: movie!.id,
        addedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Added to Watchlist",
        description: `${movie!.title} has been added to your watchlist.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add to watchlist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeFromWatchlistMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/watchlist/movie/${movie!.id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Removed from Watchlist",
        description: `${movie!.title} has been removed from your watchlist.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove from watchlist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleWatchlist = () => {
    if (isInWatchlist) {
      removeFromWatchlistMutation.mutate();
    } else {
      addToWatchlistMutation.mutate();
    }
  };

  const handleShare = async () => {
    if (!movie) return;

    const shareData = {
      title: movie.title,
      text: `Watch ${movie.title} on StreamVault`,
      url: window.location.href,
    };

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

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="w-full h-[60vh]" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Movie Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The movie you're looking for doesn't exist.
          </p>
          <Link href="/movies">
            <Button>Browse Movies</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Poster on mobile, Backdrop on desktop */}
      <div className="relative h-[60vh] overflow-hidden">
        {/* Poster for mobile */}
        <div
          className="absolute inset-0 bg-cover bg-center md:hidden"
          style={{
            backgroundImage: `url(${movie.posterUrl})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
        {/* Backdrop for desktop */}
        <div
          className="absolute inset-0 bg-cover bg-center hidden md:block"
          style={{
            backgroundImage: `url(${movie.backdropUrl})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>

        {/* Back Button - Overlaid on image */}
        <div className="absolute top-4 left-4 z-10">
          <Link href="/movies">
            <Button variant="ghost" className="gap-2 bg-background/20 backdrop-blur-sm hover:bg-background/40">
              <ChevronLeft className="w-4 h-4" />
              Back to Movies
            </Button>
          </Link>
        </div>

        <div className="relative container mx-auto px-4 h-full flex items-end pb-12">
          <div className="flex gap-6 items-end max-w-6xl">
            {/* Poster */}
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="w-48 h-72 object-cover rounded-lg shadow-2xl hidden md:block"
            />

            {/* Movie Info */}
            <div className="flex-1 pb-4">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {movie.title}
              </h1>

              <div className="flex flex-wrap gap-4 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{movie.year}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{movie.duration} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{movie.rating}</Badge>
                </div>
                {movie.imdbRating && (
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{movie.imdbRating}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mb-6 flex-wrap">
                {movie.genres?.split(',').map((genre) => (
                  <Badge key={genre.trim()} variant="secondary">
                    {genre.trim()}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-3 flex-wrap">
                <Link href={`/watch-movie/${movie.slug}`}>
                  <Button size="lg" className="gap-2">
                    <Play className="w-5 h-5" />
                    Watch Now
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  onClick={toggleWatchlist}
                  disabled={addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending}
                >
                  {isInWatchlist ? (
                    <>
                      <Check className="w-5 h-5" />
                      In Watchlist
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Add to Watchlist
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  onClick={handleShare}
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl">
          {/* Description */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              {movie.description}
            </p>
          </div>

          {/* Cast */}
          {movie.cast && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Cast</h2>
              <p className="text-muted-foreground">{movie.cast}</p>
            </div>
          )}

          {/* Directors */}
          {movie.directors && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Directors</h2>
              <p className="text-muted-foreground">{movie.directors}</p>
            </div>
          )}

          {/* Details */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Language:</span>{" "}
                <span className="font-medium">{movie.language}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Year:</span>{" "}
                <span className="font-medium">{movie.year}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>{" "}
                <span className="font-medium">{movie.duration} minutes</span>
              </div>
              <div>
                <span className="text-muted-foreground">Rating:</span>{" "}
                <span className="font-medium">{movie.rating}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
