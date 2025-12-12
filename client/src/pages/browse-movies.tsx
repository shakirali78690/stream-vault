import { useQuery } from "@tanstack/react-query";
import { MovieCard } from "@/components/movie-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo";
import { AdsterraNativeBanner } from "@/components/adsterra-banner";
import type { Movie } from "@shared/schema";

export default function BrowseMovies() {
  const { data: movies, isLoading } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  return (
    <div className="min-h-screen">
      <SEO 
        title="Browse All Movies"
        description="Browse our complete collection of movies. Watch Hollywood blockbusters, indie films, and international cinema free in HD."
        canonical="https://streamvault.live/browse/movies"
      />
      {/* Adsterra Native Banner */}
      <AdsterraNativeBanner />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">All Movies</h1>
          <p className="text-muted-foreground">
            Browse all {movies?.length || 0} movies in our collection
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
            {[...Array(20)].map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3]" />
            ))}
          </div>
        ) : movies && movies.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No movies available</p>
          </div>
        )}
      </div>
    </div>
  );
}
