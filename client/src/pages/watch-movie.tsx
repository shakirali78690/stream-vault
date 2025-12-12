import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useEffect } from "react";
import { ChevronLeft, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentsSection } from "@/components/comments-section";
import { Helmet } from "react-helmet-async";
import type { Movie } from "@shared/schema";

export default function WatchMovie() {
  const [, params] = useRoute("/watch-movie/:slug");
  const slug = params?.slug;

  const { data: movie } = useQuery<Movie>({
    queryKey: [`/api/movies/${slug}`],
    enabled: !!slug,
  });

  const { data: allMovies } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  // Set Media Session metadata for browser controls
  useEffect(() => {
    if ('mediaSession' in navigator && movie) {
      const metadata = {
        title: movie.title,
        artist: 'StreamVault',
        album: `${movie.year}`,
        artwork: [
          {
            src: movie.posterUrl || '',
            sizes: '512x512',
            type: 'image/jpeg',
          },
          {
            src: movie.posterUrl || '',
            sizes: '256x256',
            type: 'image/jpeg',
          },
        ],
      };

      navigator.mediaSession.metadata = new MediaMetadata(metadata);
      
      // Update document title
      document.title = `${movie.title} (${movie.year}) | StreamVault`;
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
      }
      document.title = 'StreamVault - Free Movies & TV Shows';
    };
  }, [movie]);

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-full max-w-5xl aspect-video" />
      </div>
    );
  }

  const extractDriveId = (url: string) => {
    const match = url.match(/\/d\/([^/]+)/);
    return match ? match[1] : null;
  };

  const PLACEHOLDER_IDS = ['1zcFHiGEOwgq2-j6hMqpsE0ov7qcIUqCd', 'PLACEHOLDER'];
  
  // Check if it's a placeholder URL or no URL at all
  const isPlaceholder = PLACEHOLDER_IDS.some(id => movie.googleDriveUrl?.includes(id));
  const driveId = (!movie.googleDriveUrl || isPlaceholder) ? null : extractDriveId(movie.googleDriveUrl);

  // Get recommended movies based on genre and category
  const recommendedMovies = allMovies
    ?.filter((m) => {
      if (m.id === movie.id) return false;
      
      // Match by genre or category
      const movieGenres = movie.genres?.toLowerCase().split(',').map(g => g.trim()) || [];
      const otherGenres = m.genres?.toLowerCase().split(',').map(g => g.trim()) || [];
      const hasMatchingGenre = movieGenres.some(genre => otherGenres.includes(genre));
      const hasMatchingCategory = m.category === movie.category;
      
      return hasMatchingGenre || hasMatchingCategory;
    })
    .slice(0, 8) || [];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`Watch ${movie.title} (${movie.year}) Free | StreamVault`}</title>
        <meta name="description" content={movie.description} />
        <link rel="canonical" href={`https://streamvault.live/watch-movie/${movie.slug}`} />
        <meta property="og:type" content="video.movie" />
        <meta property="og:title" content={`Watch ${movie.title} Free`} />
        <meta property="og:description" content={movie.description} />
        <meta property="og:image" content={movie.backdropUrl} />
      </Helmet>
      <div className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <Link href={`/movie/${slug}`}>
          <Button
            variant="ghost"
            className="mb-4 gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to {movie.title}
          </Button>
        </Link>

        <div className="grid grid-cols-1 gap-6">
          {/* Video Player */}
          <div className="bg-card rounded-lg overflow-hidden shadow-lg">
            <div className="aspect-video bg-black">
              {driveId ? (
                <iframe
                  src={`https://drive.google.com/file/d/${driveId}/preview?autoplay=0&controls=1&modestbranding=1`}
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  title={movie.title}
                  style={{ border: 'none' }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white p-8 text-center">
                  <div className="mb-6">
                    <svg className="w-20 h-20 mx-auto mb-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      <line x1="4" y1="4" x2="20" y2="20" strokeLinecap="round" strokeWidth={2} />
                    </svg>
                    <h3 className="text-2xl font-bold mb-2">Movie Not Available</h3>
                    <p className="text-muted-foreground mb-6">
                      This movie is not available yet. We're working on adding it!
                    </p>
                  </div>
                  <Link href="/request">
                    <Button variant="default" size="lg" className="gap-2">
                      Request This Movie
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Movie Info Below Player */}
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-2">{movie.title}</h1>
              <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                <span>{movie.year}</span>
                <span>•</span>
                <span>{movie.duration} min</span>
                <span>•</span>
                <span>{movie.rating}</span>
                {movie.imdbRating && (
                  <>
                    <span>•</span>
                    <span>⭐ {movie.imdbRating}</span>
                  </>
                )}
              </div>
              <p className="text-muted-foreground">{movie.description}</p>
            </div>
          </div>

          {/* Recommended Movies Section */}
          {recommendedMovies.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Recommended Movies</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {recommendedMovies.map((recMovie) => (
                  <Link key={recMovie.id} href={`/movie/${recMovie.slug}`}>
                    <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer group">
                      <div className="relative aspect-[2/3]">
                        <img
                          src={recMovie.posterUrl}
                          alt={recMovie.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-12 h-12 text-white" />
                        </div>
                        {recMovie.imdbRating && (
                          <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-semibold">
                            ⭐ {recMovie.imdbRating}
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-sm line-clamp-1">{recMovie.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{recMovie.year}</p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Adsterra Native Banner - Above Comments */}
          <div className="mt-8 flex justify-center">
            <div id="container-326e4e570b95e9b55f432cac93890441"></div>
          </div>

          {/* Comments Section at Bottom */}
          <div className="mt-8">
            <CommentsSection movieId={movie.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
