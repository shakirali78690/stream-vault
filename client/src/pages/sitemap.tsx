import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, Film, Tv, Home, Search, User, Heart, Clock, MessageSquare, AlertCircle, Info } from "lucide-react";
import { SEO } from "@/components/seo";
import { AdsterraNativeBanner } from "@/components/adsterra-banner";
import type { Show, Movie } from "@shared/schema";

export default function SitemapPage() {
  const { data: shows = [] } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  const { data: movies = [] } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  // Group shows by category
  const groupedShows = shows.reduce((acc, show) => {
    const category = show.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(show);
    return acc;
  }, {} as Record<string, Show[]>);

  // Group movies by category
  const groupedMovies = movies.reduce((acc, movie) => {
    const category = movie.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(movie);
    return acc;
  }, {} as Record<string, Movie[]>);

  const categoryNames: Record<string, string> = {
    action: 'Action & Thriller',
    drama: 'Drama & Romance',
    comedy: 'Comedy',
    horror: 'Horror & Mystery',
    'sci-fi': 'Sci-Fi & Fantasy',
    animation: 'Animation',
    documentary: 'Documentary',
    other: 'Other'
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Sitemap"
        description="Complete navigation guide to StreamVault. Find all pages, shows, movies, and categories available on our streaming platform."
        canonical="https://streamvault.live/sitemap"
      />
      {/* Adsterra Native Banner */}
      <AdsterraNativeBanner />

      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-2">Site Map</h1>
          <p className="text-muted-foreground">Complete navigation guide to StreamVault</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Main Pages Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-2">
              <Home className="w-5 h-5" />
              Main Pages
            </h2>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="flex items-center gap-2 text-primary hover:underline">
                  <ChevronRight className="w-4 h-4" />
                  Home
                </Link>
              </li>
              <li>
                <Link href="/shows" className="flex items-center gap-2 text-primary hover:underline">
                  <ChevronRight className="w-4 h-4" />
                  All Shows
                </Link>
              </li>
              <li>
                <Link href="/movies" className="flex items-center gap-2 text-primary hover:underline">
                  <ChevronRight className="w-4 h-4" />
                  All Movies
                </Link>
              </li>
              <li>
                <Link href="/search" className="flex items-center gap-2 text-primary hover:underline">
                  <ChevronRight className="w-4 h-4" />
                  Search
                </Link>
              </li>
              <li>
                <Link href="/watchlist" className="flex items-center gap-2 text-primary hover:underline">
                  <ChevronRight className="w-4 h-4" />
                  My Watchlist
                </Link>
              </li>
              <li>
                <Link href="/continue-watching" className="flex items-center gap-2 text-primary hover:underline">
                  <ChevronRight className="w-4 h-4" />
                  Continue Watching
                </Link>
              </li>
              <li>
                <Link href="/request" className="flex items-center gap-2 text-primary hover:underline">
                  <ChevronRight className="w-4 h-4" />
                  Request Content
                </Link>
              </li>
              <li>
                <Link href="/report" className="flex items-center gap-2 text-primary hover:underline">
                  <ChevronRight className="w-4 h-4" />
                  Report Issue
                </Link>
              </li>
              <li>
                <Link href="/about" className="flex items-center gap-2 text-primary hover:underline">
                  <ChevronRight className="w-4 h-4" />
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* TV Shows by Category */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-2">
              <Tv className="w-5 h-5" />
              TV Shows ({shows.length})
            </h2>
            <div className="space-y-4">
              {Object.entries(groupedShows).map(([category, categoryShows]) => (
                <div key={category}>
                  <h3 className="font-semibold text-sm mb-2 text-muted-foreground uppercase">
                    {categoryNames[category] || category} ({categoryShows.length})
                  </h3>
                  <ul className="space-y-1 ml-4">
                    {categoryShows.map((show) => (
                      <li key={show.id}>
                        <Link 
                          href={`/show/${show.slug}`} 
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <ChevronRight className="w-3 h-3" />
                          {show.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Movies by Category */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-2">
              <Film className="w-5 h-5" />
              Movies ({movies.length})
            </h2>
            <div className="space-y-4">
              {Object.entries(groupedMovies).map(([category, categoryMovies]) => (
                <div key={category}>
                  <h3 className="font-semibold text-sm mb-2 text-muted-foreground uppercase">
                    {categoryNames[category] || category} ({categoryMovies.length})
                  </h3>
                  <ul className="space-y-1 ml-4">
                    {categoryMovies.map((movie) => (
                      <li key={movie.id}>
                        <Link 
                          href={`/watch-movie/${movie.slug}`} 
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <ChevronRight className="w-3 h-3" />
                          {movie.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* User Features */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-2">
              <User className="w-5 h-5" />
              User Features
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-2 text-muted-foreground uppercase flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  My Content
                </h3>
                <ul className="space-y-1 ml-4">
                  <li>
                    <Link href="/watchlist" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ChevronRight className="w-3 h-3" />
                      Watchlist
                    </Link>
                  </li>
                  <li>
                    <Link href="/continue-watching" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ChevronRight className="w-3 h-3" />
                      Continue Watching
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2 text-muted-foreground uppercase flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Discovery
                </h3>
                <ul className="space-y-1 ml-4">
                  <li>
                    <Link href="/search" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ChevronRight className="w-3 h-3" />
                      Search Content
                    </Link>
                  </li>
                  <li>
                    <Link href="/?filter=featured" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ChevronRight className="w-3 h-3" />
                      Featured Content
                    </Link>
                  </li>
                  <li>
                    <Link href="/?filter=trending" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ChevronRight className="w-3 h-3" />
                      Trending Now
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2 text-muted-foreground uppercase flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Support
                </h3>
                <ul className="space-y-1 ml-4">
                  <li>
                    <Link href="/request" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ChevronRight className="w-3 h-3" />
                      Request Content
                    </Link>
                  </li>
                  <li>
                    <Link href="/report" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ChevronRight className="w-3 h-3" />
                      Report Issue
                    </Link>
                  </li>
                  <li>
                    <Link href="/about" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ChevronRight className="w-3 h-3" />
                      About Us
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2 text-muted-foreground uppercase flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Information
                </h3>
                <ul className="space-y-1 ml-4">
                  <li>
                    <Link href="/sitemap" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ChevronRight className="w-3 h-3" />
                      Site Map
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Stats */}
        <div className="mt-12 pt-8 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-card rounded-lg border">
              <div className="text-3xl font-bold text-primary">{shows.length}</div>
              <div className="text-sm text-muted-foreground">TV Shows</div>
            </div>
            <div className="p-4 bg-card rounded-lg border">
              <div className="text-3xl font-bold text-primary">{movies.length}</div>
              <div className="text-sm text-muted-foreground">Movies</div>
            </div>
            <div className="p-4 bg-card rounded-lg border">
              <div className="text-3xl font-bold text-primary">{Object.keys(groupedShows).length}</div>
              <div className="text-sm text-muted-foreground">Show Categories</div>
            </div>
            <div className="p-4 bg-card rounded-lg border">
              <div className="text-3xl font-bold text-primary">{Object.keys(groupedMovies).length}</div>
              <div className="text-sm text-muted-foreground">Movie Categories</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
