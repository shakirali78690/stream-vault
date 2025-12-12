import { useQuery } from "@tanstack/react-query";
import { ShowCard } from "@/components/show-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo";
import { AdsterraNativeBanner } from "@/components/adsterra-banner";
import type { Show, Movie } from "@shared/schema";
import { Flame } from "lucide-react";

export default function Trending() {
  const { data: shows, isLoading: showsLoading } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  const { data: movies, isLoading: moviesLoading } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  const isLoading = showsLoading || moviesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3]" />
          ))}
        </div>
      </div>
    );
  }

  // Combine shows and movies, filter trending
  const allContent: (Show | Movie)[] = [...(shows || []), ...(movies || [])];
  const trendingContent = allContent.filter((item) => item.trending);

  return (
    <div className="min-h-screen container mx-auto px-4 py-8">
      <SEO 
        title="Trending Movies & TV Shows | What's Popular Now"
        description="Discover the most popular movies and TV shows streaming right now. Updated daily with trending content."
        canonical="https://streamvault.live/trending"
      />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Flame className="w-8 h-8 text-orange-500" />
          <h1 className="text-3xl md:text-4xl font-bold">Trending Now</h1>
        </div>
        <p className="text-muted-foreground">
          The most popular shows and movies right now
        </p>
      </div>

      {/* Adsterra Native Banner */}
      <AdsterraNativeBanner className="mb-6" />

      {/* Content Grid */}
      {trendingContent.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
          {trendingContent.map((item) => (
            <ShowCard key={item.id} show={item} orientation="portrait" />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            No trending content available at the moment.
          </p>
        </div>
      )}
    </div>
  );
}
