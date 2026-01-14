import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { ShowCard } from "@/components/show-card";
import { MovieCard } from "@/components/movie-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEO } from "@/components/seo";
import type { Show, Movie, Anime } from "@shared/schema";

const categoryMap: Record<string, string> = {
  action: "Action & Thriller",
  drama: "Drama & Romance",
  comedy: "Comedy",
  horror: "Horror & Mystery",
  romance: "Romance",
  thriller: "Thriller",
  "sci-fi": "Sci-Fi & Fantasy",
  crime: "Crime & Mystery",
  adventure: "Adventure",
  mystery: "Mystery",
  medical: "Medical",
  animation: "Animation",
};

const genreKeywords: Record<string, string[]> = {
  action: ["action"],
  drama: ["drama"],
  comedy: ["comedy"],
  horror: ["horror"],
  romance: ["romance"],
  thriller: ["thriller"],
  "sci-fi": ["sci-fi", "science fiction", "fantasy"],
  crime: ["crime"],
  adventure: ["adventure"],
  mystery: ["mystery"],
  medical: ["medical"],
  animation: ["animation", "anime"],
};

export default function Category() {
  const [, params] = useRoute("/category/:slug");
  const slug = params?.slug || "";

  const { data: shows, isLoading: showsLoading } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  const { data: movies, isLoading: moviesLoading } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  const { data: anime, isLoading: animeLoading } = useQuery<Anime[]>({
    queryKey: ["/api/anime"],
  });

  const isLoading = showsLoading || moviesLoading || animeLoading;
  const categoryName = categoryMap[slug];
  const keywords = genreKeywords[slug] || [];

  const categoryShows = shows?.filter((show) => {
    const genres = show.genres?.toLowerCase() || "";
    return keywords.some(keyword => genres.includes(keyword.toLowerCase()));
  }) || [];

  const categoryMovies = movies?.filter((movie) => {
    const genres = movie.genres?.toLowerCase() || "";
    return keywords.some(keyword => genres.includes(keyword.toLowerCase()));
  }) || [];

  const categoryAnime = anime?.filter((a) => {
    const genres = a.genres?.toLowerCase() || "";
    return keywords.some(keyword => genres.includes(keyword.toLowerCase()));
  }) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
            {[...Array(15)].map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!categoryName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Category not found</h1>
        </div>
      </div>
    );
  }

  const totalCount = categoryShows.length + categoryMovies.length + categoryAnime.length;

  return (
    <div className="min-h-screen">
      <SEO
        title={`${categoryName} Movies, TV Shows & Anime`}
        description={`Watch the best ${categoryName} movies, TV shows, and anime free in HD on StreamVault. Stream ${categoryName.toLowerCase()} content instantly.`}
        canonical={`https://streamvault.live/category/${slug}`}
      />
      <div className="container mx-auto px-4 py-8">
        <h1
          className="text-3xl md:text-4xl font-bold mb-8"
          data-testid="text-category-title"
        >
          {categoryName}
        </h1>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              All ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="shows">
              Shows ({categoryShows.length})
            </TabsTrigger>
            <TabsTrigger value="movies">
              Movies ({categoryMovies.length})
            </TabsTrigger>
            <TabsTrigger value="anime">
              Anime ({categoryAnime.length})
            </TabsTrigger>
          </TabsList>

          {/* All Tab */}
          <TabsContent value="all">
            {totalCount > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
                {categoryShows.map((show) => (
                  <ShowCard key={`show-${show.id}`} show={show} />
                ))}
                {categoryMovies.map((movie) => (
                  <MovieCard key={`movie-${movie.id}`} movie={movie} />
                ))}
                {categoryAnime.map((a) => (
                  <ShowCard key={`anime-${a.id}`} show={a} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No content found in this category.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Shows Tab */}
          <TabsContent value="shows">
            {categoryShows.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
                {categoryShows.map((show) => (
                  <ShowCard key={show.id} show={show} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No shows found in this category.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Movies Tab */}
          <TabsContent value="movies">
            {categoryMovies.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
                {categoryMovies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No movies found in this category.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Anime Tab */}
          <TabsContent value="anime">
            {categoryAnime.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
                {categoryAnime.map((a) => (
                  <ShowCard key={a.id} show={a} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No anime found in this category.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
