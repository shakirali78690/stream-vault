import { useQuery } from "@tanstack/react-query";
import { MovieHeroCarousel } from "@/components/movie-hero-carousel";
import { MovieContentRow } from "@/components/movie-content-row";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo";
import { AdBanner } from "@/components/ad-banner";
import type { Movie } from "@shared/schema";

export default function MoviesPage() {
  const { data: movies, isLoading } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="w-full h-[70vh]" />
        <div className="container mx-auto px-4 py-8 space-y-8">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-4 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="w-48 aspect-[2/3] flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const featured = movies?.filter((movie) => movie.featured) || [];
  const trending = movies?.filter((movie) => movie.trending) || [];
  const action = movies?.filter((movie) => movie.genres?.toLowerCase().includes("action")) || [];
  const drama = movies?.filter((movie) => movie.genres?.toLowerCase().includes("drama")) || [];
  const comedy = movies?.filter((movie) => movie.genres?.toLowerCase().includes("comedy")) || [];
  const horror = movies?.filter((movie) => movie.genres?.toLowerCase().includes("horror")) || [];

  return (
    <div className="min-h-screen">
      <SEO 
        title="Watch Movies Free Online | HD Movies Streaming"
        description="Stream 200+ movies free in HD quality. Action, Drama, Comedy, Horror and more. No registration required."
        canonical="https://streamvault.live/movies"
      />
      
      {/* Hero Carousel */}
      {featured.length > 0 && <MovieHeroCarousel movies={featured} />}

      {/* Content Rows */}
      <div className="container mx-auto py-8 space-y-12">
        {trending.length > 0 && (
          <MovieContentRow
            title="Trending Now"
            movies={trending}
            orientation="landscape"
          />
        )}

        {action.length > 0 && (
          <MovieContentRow title="Action & Thriller" movies={action} />
        )}

        {/* Ad Banner */}
        <AdBanner />

        {drama.length > 0 && <MovieContentRow title="Drama & Romance" movies={drama} />}

        {comedy.length > 0 && <MovieContentRow title="Comedy" movies={comedy} />}

        {horror.length > 0 && (
          <MovieContentRow title="Horror & Mystery" movies={horror} />
        )}

        {/* Ad Banner */}
        <AdBanner />

        {movies && movies.length > 0 && (
          <MovieContentRow
            title="Recently Added"
            movies={movies.slice(0, 12)}
            orientation="landscape"
          />
        )}
      </div>
    </div>
  );
}
