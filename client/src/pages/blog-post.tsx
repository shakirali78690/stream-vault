import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { 
  Calendar, Clock, Star, Users, DollarSign, Globe, 
  Film, Tv, ChevronLeft, Share2, Play, Award, Lightbulb, Clapperboard, FileText, Youtube
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo";
import { useToast } from "@/hooks/use-toast";
import type { Show, Movie, BlogPost as BlogPostType } from "@shared/schema";

interface CastMember {
  name: string;
  character: string;
  profile_path?: string | null;
  profileUrl?: string | null;
}

export default function BlogPost() {
  const [, params] = useRoute("/blog/:type/:slug");
  const type = params?.type as "movie" | "show";
  const slug = params?.slug;
  const { toast } = useToast();

  const { data: movie, isLoading: movieLoading } = useQuery<Movie>({
    queryKey: [`/api/movies/${slug}`],
    enabled: type === "movie" && !!slug,
  });

  const { data: show, isLoading: showLoading } = useQuery<Show>({
    queryKey: [`/api/shows/${slug}`],
    enabled: type === "show" && !!slug,
  });

  // Fetch blog post content for this movie/show if it exists
  const { data: blogPosts = [] } = useQuery<BlogPostType[]>({
    queryKey: ["/api/blog"],
  });

  const isLoading = movieLoading || showLoading;
  const content = type === "movie" ? movie : show;

  const handleShare = async () => {
    if (!content) return;

    const shareData = {
      title: `${content.title} - StreamVault Blog`,
      text: `Read about ${content.title} on StreamVault`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    } else {
      await navigator.clipboard.writeText(shareData.url);
      toast({
        title: "Link copied!",
        description: "Article link copied to clipboard.",
      });
    }
  };

  // Parse cast details if available
  let castDetails: CastMember[] = [];
  if (content?.castDetails) {
    try {
      castDetails = JSON.parse(content.castDetails);
    } catch {
      castDetails = [];
    }
  }

  // Find matching blog post for this content
  const blogPost = blogPosts.find(
    (post) => post.contentId === (type === "movie" ? movie?.id : show?.id) ||
              post.slug.startsWith(slug + "-") ||
              post.slug === slug
  );

  // Parse blog post JSON fields
  let boxOfficeData: Record<string, string> = {};
  let triviaData: string[] = [];
  let keywordsData: string[] = [];
  
  if (blogPost?.boxOffice) {
    try {
      boxOfficeData = JSON.parse(blogPost.boxOffice);
    } catch {}
  }
  
  if (blogPost?.trivia) {
    try {
      triviaData = JSON.parse(blogPost.trivia);
    } catch {}
  }

  if (blogPost?.keywords) {
    try {
      keywordsData = JSON.parse(blogPost.keywords);
    } catch {}
  }

  // Parse season details for shows
  interface SeasonDetail {
    seasonNumber: number;
    name: string;
    overview: string;
    airDate: string | null;
    episodeCount: number;
    posterPath: string | null;
    trailerKey: string | null;
    trailerName: string | null;
  }
  let seasonDetailsData: SeasonDetail[] = [];
  if (blogPost?.seasonDetails) {
    try {
      seasonDetailsData = JSON.parse(blogPost.seasonDetails);
    } catch {}
  }

  // Extract trailer URL from trivia
  let trailerUrl: string | null = null;
  const trailerItem = triviaData.find(item => item.includes('youtube.com/watch'));
  if (trailerItem) {
    const match = trailerItem.match(/https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    if (match) {
      trailerUrl = match[1]; // Just the video ID
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="w-full h-[50vh]" />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
          <Link href="/blog">
            <Button>Back to Blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isMovie = type === "movie";
  const movieData = content as Movie;
  const showData = content as Show;

  return (
    <div className="min-h-screen">
      <SEO
        title={`${content.title} (${content.year}) - Complete Guide, Cast & Reviews`}
        description={`Everything about ${content.title}: Plot, cast, ratings, and more. ${content.description.slice(0, 150)}...`}
        canonical={`https://streamvault.live/blog/${type}/${slug}`}
        image={content.backdropUrl}
        type={isMovie ? "video.movie" : "video.tv_show"}
      />

      {/* Hero Section */}
      <div className="relative">
        <div className="aspect-[21/9] md:aspect-[3/1] relative">
          <img
            src={content.backdropUrl}
            alt={content.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <Link href="/blog">
            <Button variant="secondary" size="sm" className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back to Blog
            </Button>
          </Link>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="container mx-auto">
            <Badge className="mb-3" variant="default">
              {isMovie ? <Film className="w-3 h-3 mr-1" /> : <Tv className="w-3 h-3 mr-1" />}
              {isMovie ? "Movie" : "TV Show"}
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold mb-2">
              {content.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {content.year}
              </span>
              {isMovie && movieData.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {movieData.duration} min
                </span>
              )}
              {!isMovie && showData.totalSeasons && (
                <span className="flex items-center gap-1">
                  <Tv className="w-4 h-4" />
                  {showData.totalSeasons} Season{showData.totalSeasons > 1 ? "s" : ""}
                </span>
              )}
              {content.imdbRating && (
                <span className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  {content.imdbRating}/10
                </span>
              )}
              <Badge variant="outline">{content.rating}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link href={isMovie ? `/watch-movie/${slug}` : `/show/${slug}`}>
                <Button size="lg" className="gap-2">
                  <Play className="w-5 h-5" />
                  {isMovie ? "Watch Movie" : "Watch Now"}
                </Button>
              </Link>
              <Button variant="outline" size="lg" onClick={handleShare} className="gap-2">
                <Share2 className="w-5 h-5" />
                Share
              </Button>
            </div>

            {/* Overview */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Film className="w-6 h-6 text-primary" />
                Overview
              </h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {content.description}
                </p>
              </div>
            </section>

            {/* YouTube Trailer */}
            {trailerUrl && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Youtube className="w-6 h-6 text-red-500" />
                  Official Trailer
                </h2>
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${trailerUrl}`}
                      title={`${content.title} - Official Trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Genres */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Genres</h2>
              <div className="flex flex-wrap gap-2">
                {content.genres.split(",").map((genre) => (
                  <Badge key={genre.trim()} variant="secondary" className="text-sm px-3 py-1">
                    {genre.trim()}
                  </Badge>
                ))}
              </div>
            </section>

            {/* ============ DETAILED BLOG CONTENT SECTIONS (after Genres) ============ */}

            {/* Season Details for Shows */}
            {!isMovie && seasonDetailsData.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Tv className="w-6 h-6 text-primary" />
                  Season Guide
                </h2>
                <div className="space-y-6">
                  {seasonDetailsData.map((season) => (
                    <div key={season.seasonNumber} className="bg-card border border-border rounded-lg overflow-hidden">
                      <div className="flex flex-col md:flex-row">
                        {/* Season Poster */}
                        {season.posterPath && (
                          <div className="md:w-48 flex-shrink-0">
                            <img
                              src={season.posterPath}
                              alt={season.name}
                              className="w-full h-48 md:h-full object-cover"
                            />
                          </div>
                        )}
                        
                        {/* Season Info */}
                        <div className="flex-1 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-bold">{season.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {season.airDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(season.airDate).getFullYear()}
                                </span>
                              )}
                              <Badge variant="outline">{season.episodeCount} Episodes</Badge>
                            </div>
                          </div>
                          
                          {season.overview && (
                            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                              {season.overview}
                            </p>
                          )}
                          
                          {/* Season Trailer */}
                          {season.trailerKey && (
                            <div className="mt-4">
                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Youtube className="w-4 h-4 text-red-500" />
                                {season.trailerName || `Season ${season.seasonNumber} Trailer`}
                              </h4>
                              <div className="aspect-video rounded-lg overflow-hidden">
                                <iframe
                                  src={`https://www.youtube.com/embed/${season.trailerKey}`}
                                  title={season.trailerName || `Season ${season.seasonNumber} Trailer`}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="w-full h-full"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            
            {/* Excerpt/Intro */}
            {blogPost?.excerpt && (
              <div className="bg-primary/5 border-l-4 border-primary p-6 rounded-r-lg">
                <p className="text-lg text-foreground italic">{blogPost.excerpt}</p>
              </div>
            )}

            {/* Main Article Content */}
            {blogPost?.content && (
              <article className="prose prose-lg dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                  {blogPost.content}
                </div>
              </article>
            )}

            {/* Plot Summary */}
            {blogPost?.plotSummary && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Film className="w-6 h-6 text-primary" />
                  Plot Summary
                </h2>
                <div className="bg-card border border-border rounded-lg p-6">
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {blogPost.plotSummary}
                  </p>
                </div>
              </section>
            )}

            {/* Review */}
            {blogPost?.review && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6 text-primary" />
                  Our Review
                </h2>
                <div className="bg-card border border-border rounded-lg p-6">
                  <div 
                    className="text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: blogPost.review
                        .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                        .replace(/---/g, '<hr class="my-4 border-border">')
                        .replace(/\n/g, '<br>')
                    }}
                  />
                </div>
              </section>
            )}

            {/* Box Office */}
            {Object.keys(boxOfficeData).length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-primary" />
                  Box Office
                </h2>
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(boxOfficeData).map(([key, value]) => (
                      <div key={key} className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                        <p className="text-xl font-bold text-primary">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Awards */}
            {blogPost?.awards && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6 text-primary" />
                  Awards & Recognition
                </h2>
                <div className="bg-card border border-border rounded-lg p-6">
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {blogPost.awards}
                  </p>
                </div>
              </section>
            )}

            {/* Trivia */}
            {triviaData.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Lightbulb className="w-6 h-6 text-primary" />
                  Fun Facts & Trivia
                </h2>
                <div className="bg-card border border-border rounded-lg p-6">
                  <ul className="space-y-3">
                    {triviaData.map((fact, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <span className="text-muted-foreground">{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Behind The Scenes */}
            {blogPost?.behindTheScenes && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Clapperboard className="w-6 h-6 text-primary" />
                  Behind The Scenes
                </h2>
                <div className="bg-card border border-border rounded-lg p-6">
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {blogPost.behindTheScenes}
                  </p>
                </div>
              </section>
            )}

            {/* Cast Section */}
            {(castDetails.length > 0 || content.cast) && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  Cast & Crew
                </h2>
                
                {castDetails.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {castDetails.slice(0, 8).map((member, index) => (
                      <div
                        key={index}
                        className="bg-card border border-border rounded-lg overflow-hidden text-center"
                      >
                        <div className="aspect-[3/4] bg-muted">
                          {(member.profileUrl || member.profile_path) ? (
                            <img
                              src={member.profileUrl || `https://image.tmdb.org/t/p/w185${member.profile_path}`}
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Users className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="font-medium text-sm line-clamp-1">{member.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {member.character}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : content.cast ? (
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex flex-wrap gap-2">
                      {content.cast.split(",").map((actor) => (
                        <Badge key={actor.trim()} variant="outline" className="text-sm">
                          {actor.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            )}

            {/* Directors/Creators */}
            {(isMovie ? movieData.directors : showData.creators) && (
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6 text-primary" />
                  {isMovie ? "Directors" : "Creators"}
                </h2>
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex flex-wrap gap-2">
                    {(isMovie ? movieData.directors : showData.creators)?.split(",").map((person) => (
                      <Badge key={person.trim()} variant="secondary" className="text-sm px-3 py-1">
                        {person.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Additional Info for SEO */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Globe className="w-6 h-6 text-primary" />
                Additional Information
              </h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Original Language</p>
                    <p className="font-medium capitalize">{content.language}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Release Year</p>
                    <p className="font-medium">{content.year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Content Rating</p>
                    <p className="font-medium">{content.rating}</p>
                  </div>
                  {content.imdbRating && (
                    <div>
                      <p className="text-sm text-muted-foreground">IMDb Rating</p>
                      <p className="font-medium text-yellow-500">★ {content.imdbRating}/10</p>
                    </div>
                  )}
                  {isMovie && movieData.duration && (
                    <div>
                      <p className="text-sm text-muted-foreground">Runtime</p>
                      <p className="font-medium">{movieData.duration} minutes</p>
                    </div>
                  )}
                  {!isMovie && showData.totalSeasons && (
                    <div>
                      <p className="text-sm text-muted-foreground">Total Seasons</p>
                      <p className="font-medium">{showData.totalSeasons}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Watch CTA */}
            <section className="bg-primary/10 border border-primary/20 rounded-lg p-6 text-center">
              <h3 className="text-xl font-bold mb-2">Ready to Watch?</h3>
              <p className="text-muted-foreground mb-4">
                Stream {content.title} now in HD quality, completely free!
              </p>
              <Link href={isMovie ? `/watch-movie/${slug}` : `/show/${slug}`}>
                <Button size="lg" className="gap-2">
                  <Play className="w-5 h-5" />
                  {isMovie ? "Watch Movie Free" : "Start Watching"}
                </Button>
              </Link>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Poster */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <img
                src={content.posterUrl}
                alt={content.title}
                className="w-full aspect-[2/3] object-cover"
              />
            </div>

            {/* Quick Facts */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-bold mb-4">Quick Facts</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{isMovie ? "Movie" : "TV Series"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Year</span>
                  <span className="font-medium">{content.year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rating</span>
                  <span className="font-medium">{content.rating}</span>
                </div>
                {content.imdbRating && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IMDb</span>
                    <span className="font-medium text-yellow-500">★ {content.imdbRating}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Language</span>
                  <span className="font-medium capitalize">{content.language}</span>
                </div>
                {isMovie && movieData.duration && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{movieData.duration} min</span>
                  </div>
                )}
                {!isMovie && showData.totalSeasons && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seasons</span>
                    <span className="font-medium">{showData.totalSeasons}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags for SEO */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-bold mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  {isMovie ? "movie" : "tv show"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {content.year}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {content.language}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  free streaming
                </Badge>
                <Badge variant="outline" className="text-xs">
                  HD quality
                </Badge>
                {content.genres.split(",").slice(0, 3).map((genre) => (
                  <Badge key={genre.trim()} variant="outline" className="text-xs">
                    {genre.trim().toLowerCase()}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Keywords from TMDB */}
            {keywordsData.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-bold mb-4">Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {keywordsData.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
