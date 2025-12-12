import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShowCard } from "@/components/show-card";
import { MovieCard } from "@/components/movie-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo";
import { AdsterraNativeBanner } from "@/components/adsterra-banner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Show, Movie } from "@shared/schema";

export default function Search() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1]);
  const initialQuery = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, 2030]);

  const { data: shows, isLoading: showsLoading } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  const { data: movies, isLoading: moviesLoading } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  const isLoading = showsLoading || moviesLoading;

  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    
    shows?.forEach((show) => {
      const showGenres = show.genres?.split(',').map(g => g.trim()).filter(g => g.length > 0) || [];
      showGenres.forEach((g) => genres.add(g));
    });
    
    movies?.forEach((movie) => {
      const movieGenres = movie.genres?.split(',').map(g => g.trim()).filter(g => g.length > 0) || [];
      movieGenres.forEach((g) => genres.add(g));
    });
    
    return Array.from(genres).filter(g => g.length > 0).sort();
  }, [shows, movies]);

  const filteredShows = useMemo(() => {
    if (!shows) return [];

    return shows.filter((show) => {
      const genres = show.genres?.split(',').map(g => g.trim()) || [];
      
      const matchesQuery =
        !searchQuery ||
        show.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        show.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        genres.some((g) =>
          g.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesGenre =
        selectedGenres.length === 0 ||
        genres.some((g) => selectedGenres.includes(g));

      const matchesYear =
        show.year >= yearRange[0] && show.year <= yearRange[1];

      return matchesQuery && matchesGenre && matchesYear;
    });
  }, [shows, searchQuery, selectedGenres, yearRange]);

  const filteredMovies = useMemo(() => {
    if (!movies) return [];

    return movies.filter((movie) => {
      const genres = movie.genres?.split(',').map(g => g.trim()) || [];
      
      const matchesQuery =
        !searchQuery ||
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        genres.some((g) =>
          g.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesGenre =
        selectedGenres.length === 0 ||
        genres.some((g) => selectedGenres.includes(g));

      const matchesYear =
        movie.year >= yearRange[0] && movie.year <= yearRange[1];

      return matchesQuery && matchesGenre && matchesYear;
    });
  }, [movies, searchQuery, selectedGenres, yearRange]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Genres */}
      <div>
        <h3 className="font-semibold mb-3">Genres</h3>
        <div className="space-y-2">
          {allGenres.map((genre) => (
            <div key={genre} className="flex items-center space-x-2">
              <Checkbox
                id={`genre-${genre}`}
                checked={selectedGenres.includes(genre)}
                onCheckedChange={() => toggleGenre(genre)}
                data-testid={`checkbox-genre-${genre.toLowerCase()}`}
              />
              <Label
                htmlFor={`genre-${genre}`}
                className="cursor-pointer text-sm"
              >
                {genre}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Year Range */}
      <div>
        <h3 className="font-semibold mb-3">Year Range</h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="number"
              min="1900"
              max="2030"
              value={yearRange[0]}
              onChange={(e) =>
                setYearRange([parseInt(e.target.value) || 1900, yearRange[1]])
              }
              className="w-24"
              data-testid="input-year-from"
            />
            <span className="flex items-center">to</span>
            <Input
              type="number"
              min="1900"
              max="2030"
              value={yearRange[1]}
              onChange={(e) =>
                setYearRange([yearRange[0], parseInt(e.target.value) || 2030])
              }
              className="w-24"
              data-testid="input-year-to"
            />
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setSelectedGenres([]);
          setYearRange([1900, 2030]);
        }}
        data-testid="button-clear-filters"
      >
        Clear Filters
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen">
      <SEO 
        title="Search Movies & TV Shows"
        description="Search for your favorite movies and TV shows on StreamVault. Filter by genre, year, and more."
        canonical="https://streamvault.live/search"
      />
      {/* Adsterra Native Banner */}
      <AdsterraNativeBanner />

      <div className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Search</h1>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1 max-w-2xl">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for shows, movies, genres, actors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-query"
              />
            </div>

            {/* Mobile Filter Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="lg:hidden gap-2"
                  data-testid="button-mobile-filters"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
          </form>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              <h2 className="font-semibold mb-4">Filters</h2>
              <FilterContent />
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="all">
                  All ({filteredShows.length + filteredMovies.length})
                </TabsTrigger>
                <TabsTrigger value="shows">
                  Shows ({filteredShows.length})
                </TabsTrigger>
                <TabsTrigger value="movies">
                  Movies ({filteredMovies.length})
                </TabsTrigger>
              </TabsList>

              {/* All Tab */}
              <TabsContent value="all">
                {isLoading ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                    {[...Array(12)].map((_, i) => (
                      <Skeleton key={i} className="aspect-[2/3]" />
                    ))}
                  </div>
                ) : filteredShows.length + filteredMovies.length > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                    {filteredShows.map((show) => (
                      <ShowCard key={`show-${show.id}`} show={show} />
                    ))}
                    {filteredMovies.map((movie) => (
                      <MovieCard key={`movie-${movie.id}`} movie={movie} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No results found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search or filters
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Shows Tab */}
              <TabsContent value="shows">
                {isLoading ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                    {[...Array(12)].map((_, i) => (
                      <Skeleton key={i} className="aspect-[2/3]" />
                    ))}
                  </div>
                ) : filteredShows.length > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                    {filteredShows.map((show) => (
                      <ShowCard key={show.id} show={show} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No shows found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search or filters
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Movies Tab */}
              <TabsContent value="movies">
                {isLoading ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                    {[...Array(12)].map((_, i) => (
                      <Skeleton key={i} className="aspect-[2/3]" />
                    ))}
                  </div>
                ) : filteredMovies.length > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                    {filteredMovies.map((movie) => (
                      <MovieCard key={movie.id} movie={movie} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No movies found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search or filters
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
