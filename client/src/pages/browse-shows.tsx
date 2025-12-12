import { useQuery } from "@tanstack/react-query";
import { ShowCard } from "@/components/show-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo";
import { AdsterraNativeBanner } from "@/components/adsterra-banner";
import type { Show } from "@shared/schema";

export default function BrowseShows() {
  const { data: shows, isLoading } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  return (
    <div className="min-h-screen">
      <SEO 
        title="Browse All TV Shows"
        description="Browse our complete collection of TV shows. Watch popular series, new releases, and classic shows free in HD."
        canonical="https://streamvault.live/browse/shows"
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">All Shows</h1>
          <p className="text-muted-foreground">
            Browse all {shows?.length || 0} shows in our collection
          </p>
        </div>

        {/* Adsterra Native Banner */}
        <AdsterraNativeBanner className="mb-6" />

        {isLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
            {[...Array(20)].map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3]" />
            ))}
          </div>
        ) : shows && shows.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
            {shows.map((show) => (
              <ShowCard key={show.id} show={show} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No shows available</p>
          </div>
        )}
      </div>
    </div>
  );
}
