import { useQuery } from "@tanstack/react-query";
import { HeroCarousel } from "@/components/hero-carousel";
import { ContentRow } from "@/components/content-row";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo";
import type { Anime } from "@shared/schema";

export default function AnimePage() {
    const { data: anime, isLoading } = useQuery<Anime[]>({
        queryKey: ["/api/anime"],
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

    const featured = anime?.filter((a) => a.featured) || [];
    const trending = anime?.filter((a) => a.trending) || [];
    const action = anime?.filter((a) => a.genres?.toLowerCase().includes("action")) || [];
    const romance = anime?.filter((a) => a.genres?.toLowerCase().includes("romance")) || [];
    const shonen = anime?.filter((a) => a.genres?.toLowerCase().includes("shonen") || a.genres?.toLowerCase().includes("shounen")) || [];
    const fantasy = anime?.filter((a) => a.genres?.toLowerCase().includes("fantasy")) || [];
    const comedy = anime?.filter((a) => a.genres?.toLowerCase().includes("comedy")) || [];
    const horror = anime?.filter((a) => a.genres?.toLowerCase().includes("horror")) || [];

    return (
        <div className="min-h-screen">
            <SEO
                title="Watch Anime Free Online | Subbed & Dubbed Anime Streaming"
                description="Stream 100+ anime series free in HD. Watch popular anime subbed and dubbed. Shonen, Romance, Action, Fantasy and more. No registration required."
                canonical="https://streamvault.live/anime"
            />

            {/* Hero Carousel */}
            {featured.length > 0 && <HeroCarousel shows={featured} />}

            {/* Content Rows */}
            <div className="container mx-auto py-8 space-y-12">
                {trending.length > 0 && (
                    <ContentRow
                        title="Trending Anime"
                        shows={trending}
                        orientation="landscape"
                    />
                )}

                {action.length > 0 && (
                    <ContentRow title="Action & Adventure" shows={action} />
                )}

                {shonen.length > 0 && (
                    <ContentRow title="Shonen" shows={shonen} />
                )}

                {romance.length > 0 && <ContentRow title="Romance" shows={romance} />}

                {fantasy.length > 0 && <ContentRow title="Fantasy" shows={fantasy} />}

                {comedy.length > 0 && <ContentRow title="Comedy" shows={comedy} />}

                {horror.length > 0 && (
                    <ContentRow title="Horror & Dark" shows={horror} />
                )}

                {anime && anime.length > 0 && (
                    <ContentRow
                        title="Recently Added"
                        shows={anime.slice(0, 12)}
                        orientation="landscape"
                    />
                )}
            </div>
        </div>
    );
}
