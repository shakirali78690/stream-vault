import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Filter, Film, Tv, Grid, List, X } from "lucide-react";
import { SEO } from "@/components/seo";
import { AdsterraNativeBanner } from "@/components/adsterra-banner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Show, Movie } from "@shared/schema";

type ContentType = "all" | "shows" | "movies";
type SortOption = "title" | "year" | "rating";

export default function Browse() {
  const [searchQuery, setSearchQuery] = useState("");
  const [contentType, setContentType] = useState<ContentType>("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("title");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: shows, isLoading: showsLoading } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  const { data: movies, isLoading: moviesLoading } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  const isLoading = showsLoading || moviesLoading;

  // Extract all unique genres (filter out empty strings)
  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    shows?.forEach((show) => {
      show.genres?.split(",").forEach((g) => {
        const trimmed = g.trim();
        if (trimmed) genres.add(trimmed);
      });
    });
    movies?.forEach((movie) => {
      movie.genres?.split(",").forEach((g) => {
        const trimmed = g.trim();
        if (trimmed) genres.add(trimmed);
      });
    });
    return Array.from(genres).filter(g => g.length > 0).sort();
  }, [shows, movies]);

  // Filter and sort content
  const filteredContent = useMemo(() => {
    let content: (Show | Movie)[] = [];

    if (contentType === "all" || contentType === "shows") {
      content = [...content, ...(shows || [])];
    }
    if (contentType === "all" || contentType === "movies") {
      content = [...content, ...(movies || [])];
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      content = content.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.genres?.toLowerCase().includes(query) ||
          item.cast?.toLowerCase().includes(query)
      );
    }

    // Genre filter
    if (selectedGenre !== "all") {
      content = content.filter((item) =>
        item.genres?.toLowerCase().includes(selectedGenre.toLowerCase())
      );
    }

    // Sort
    content.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "year":
          return (b.year || 0) - (a.year || 0);
        case "rating":
          return (
            parseFloat(b.imdbRating || "0") - parseFloat(a.imdbRating || "0")
          );
        default:
          return 0;
      }
    });

    return content;
  }, [shows, movies, contentType, searchQuery, selectedGenre, sortBy]);

  // Helper to check if item is a movie
  const isMovie = (item: Show | Movie): item is Movie => {
    return "googleDriveUrl" in item;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setContentType("all");
    setSelectedGenre("all");
    setSortBy("title");
  };

  const hasActiveFilters =
    searchQuery || contentType !== "all" || selectedGenre !== "all";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Browse All Movies & TV Shows | StreamVault"
        description="Browse our complete collection of movies and TV shows. Filter by genre, sort by rating, and find your next favorite content."
        canonical="https://streamvault.live/browse"
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Browse</h1>
          <p className="text-muted-foreground">
            Explore our collection of {shows?.length || 0} shows and{" "}
            {movies?.length || 0} movies
          </p>
        </div>

        {/* Adsterra Native Banner */}
        <AdsterraNativeBanner className="mb-6" />

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-8">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, genre, cast..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Content Type */}
            <div className="flex gap-1 bg-card rounded-lg p-1">
              <Button
                size="sm"
                variant={contentType === "all" ? "default" : "ghost"}
                onClick={() => setContentType("all")}
                className="gap-1"
              >
                All
              </Button>
              <Button
                size="sm"
                variant={contentType === "shows" ? "default" : "ghost"}
                onClick={() => setContentType("shows")}
                className="gap-1"
              >
                <Tv className="w-4 h-4" />
                Shows
              </Button>
              <Button
                size="sm"
                variant={contentType === "movies" ? "default" : "ghost"}
                onClick={() => setContentType("movies")}
                className="gap-1"
              >
                <Film className="w-4 h-4" />
                Movies
              </Button>
            </div>

            {/* Genre Filter */}
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger className="w-[150px] bg-card">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {allGenres.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[140px] bg-card">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="year">Newest First</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode */}
            <div className="flex gap-1 bg-card rounded-lg p-1 ml-auto">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "default" : "ghost"}
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "ghost"}
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearFilters}
                className="gap-1 text-muted-foreground"
              >
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredContent.length} results
        </div>

        {/* Content Grid/List */}
        {filteredContent.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground mb-4">
              No results found
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
            {filteredContent.map((item) => (
              <Link
                key={item.id}
                href={isMovie(item) ? `/movie/${item.slug}` : `/show/${item.slug}`}
              >
                <div className="group cursor-pointer">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-card mb-2">
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                    <Badge
                      className="absolute top-2 right-2 text-xs"
                      variant="secondary"
                    >
                      {isMovie(item) ? "Movie" : "TV"}
                    </Badge>
                  </div>
                  <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {item.year}
                    {!isMovie(item) && ` • ${item.totalSeasons} Season${item.totalSeasons > 1 ? "s" : ""}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContent.map((item) => (
              <Link
                key={item.id}
                href={isMovie(item) ? `/movie/${item.slug}` : `/show/${item.slug}`}
              >
                <div className="flex gap-4 p-3 rounded-lg bg-card hover:bg-card/80 transition-colors cursor-pointer">
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    className="w-16 h-24 object-cover rounded"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{item.title}</h3>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {isMovie(item) ? "Movie" : "TV"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {item.year}
                      {!isMovie(item) && ` • ${item.totalSeasons} Season${item.totalSeasons > 1 ? "s" : ""}`}
                      {item.imdbRating && ` • ⭐ ${item.imdbRating}`}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
