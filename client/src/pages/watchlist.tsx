import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Bookmark, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShowCard } from "@/components/show-card";
import { MovieCard } from "@/components/movie-card";
import { SEO } from "@/components/seo";
import { AdsterraNativeBanner } from "@/components/adsterra-banner";
import type { Show, Movie } from "@shared/schema";

interface WatchlistItem {
  id: string;
  showId?: string;
  movieId?: string;
  addedAt: string;
}

export default function Watchlist() {
  const { data: watchlistItems = [], isLoading: watchlistLoading } = useQuery<WatchlistItem[]>({
    queryKey: ["/api/watchlist"],
  });

  const { data: allShows = [], isLoading: showsLoading } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  const { data: allMovies = [], isLoading: moviesLoading } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  const isLoading = watchlistLoading || showsLoading || moviesLoading;

  // Get the actual show objects from watchlist IDs
  const watchlistShows = watchlistItems
    .filter(item => item.showId)
    .map((item) => allShows.find((show) => show.id === item.showId))
    .filter((show): show is Show => show !== undefined);

  // Get the actual movie objects from watchlist IDs
  const watchlistMovies = watchlistItems
    .filter(item => item.movieId)
    .map((item) => allMovies.find((movie) => movie.id === item.movieId))
    .filter((movie): movie is Movie => movie !== undefined);

  const totalItems = watchlistShows.length + watchlistMovies.length;

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="My Watchlist"
        description="Your personal watchlist on StreamVault. Keep track of movies and TV shows you want to watch."
        canonical="https://streamvault.live/watchlist"
      />
      {/* Adsterra Native Banner */}
      <AdsterraNativeBanner />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Bookmark className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">My Watchlist</h1>
              <p className="text-muted-foreground mt-1">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} saved
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-md" />
            ))}
          </div>
        ) : totalItems > 0 ? (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="all">
                All ({totalItems})
              </TabsTrigger>
              <TabsTrigger value="shows">
                Shows ({watchlistShows.length})
              </TabsTrigger>
              <TabsTrigger value="movies">
                Movies ({watchlistMovies.length})
              </TabsTrigger>
            </TabsList>

            {/* All Tab */}
            <TabsContent value="all">
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
                {watchlistShows.map((show) => (
                  <ShowCard key={`show-${show.id}`} show={show} />
                ))}
                {watchlistMovies.map((movie) => (
                  <MovieCard key={`movie-${movie.id}`} movie={movie} />
                ))}
              </div>
            </TabsContent>

            {/* Shows Tab */}
            <TabsContent value="shows">
              {watchlistShows.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
                  {watchlistShows.map((show) => (
                    <ShowCard key={show.id} show={show} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">No shows in your watchlist</p>
                </div>
              )}
            </TabsContent>

            {/* Movies Tab */}
            <TabsContent value="movies">
              {watchlistMovies.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
                  {watchlistMovies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">No movies in your watchlist</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex p-4 bg-muted rounded-full mb-4">
              <Bookmark className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Your watchlist is empty</h2>
            <p className="text-muted-foreground mb-6">
              Add shows and movies to your watchlist to watch them later
            </p>
            <Link href="/">
              <Button>Browse Content</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
