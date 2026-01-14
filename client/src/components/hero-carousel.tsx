import { useState, useEffect, useRef } from "react";
import { Play, Info, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Show, Movie, Anime } from "@shared/schema";
import { Link } from "wouter";

type ContentItem = Show | Movie | Anime;

interface HeroCarouselProps {
  shows: ContentItem[];
}

// Helper to check content type
function isMovie(item: ContentItem): item is Movie {
  return 'googleDriveUrl' in item && !('totalSeasons' in item);
}

function isAnime(item: ContentItem): item is Anime {
  return 'malRating' in item || 'studio' in item;
}

export function HeroCarousel({ shows }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  useEffect(() => {
    if (!isAutoPlaying || shows.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % shows.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, shows.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + shows.length) % shows.length);
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % shows.length);
    setIsAutoPlaying(false);
  };

  // Touch/Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 50) {
      // Swipe left - next slide
      goToNext();
    }

    if (touchStartX.current - touchEndX.current < -50) {
      // Swipe right - previous slide
      goToPrevious();
    }
  };

  if (shows.length === 0) return null;

  const currentShow = shows[currentIndex];

  return (
    <div
      className="relative w-full h-[70vh] min-h-[500px] max-h-[800px] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Image with Gradient - Poster on mobile, Backdrop on desktop */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{
          backgroundImage: `url(${currentShow.posterUrl})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent hidden md:block" />
      </div>
      {/* Backdrop for desktop only */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 hidden md:block"
        style={{ backgroundImage: `url(${currentShow.backdropUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full container mx-auto px-4 flex items-end pb-20 md:pb-24">
        <div className="max-w-2xl space-y-4">
          {/* Title */}
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground drop-shadow-lg"
            data-testid={`text-hero-title-${currentShow.id}`}
          >
            {currentShow.title}
          </h1>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {currentShow.imdbRating && (
              <div className="flex items-center gap-1 text-foreground">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{currentShow.imdbRating}</span>
              </div>
            )}
            <span className="text-foreground font-medium">{currentShow.year}</span>
            <span className="text-foreground">{currentShow.rating}</span>
            {!isMovie(currentShow) && (
              <span className="text-foreground">
                {currentShow.totalSeasons} Season{currentShow.totalSeasons > 1 ? "s" : ""}
              </span>
            )}
            {isMovie(currentShow) && (
              <span className="text-foreground">Movie</span>
            )}
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-2">
            {currentShow.genres?.split(',').slice(0, 3).map((genre) => (
              <Badge
                key={genre.trim()}
                variant="secondary"
                className="bg-background/80 backdrop-blur-sm"
                data-testid={`badge-genre-${genre.trim().toLowerCase()}`}
              >
                {genre.trim()}
              </Badge>
            ))}
          </div>

          {/* Description */}
          <p className="text-foreground text-base md:text-lg line-clamp-3 max-w-xl">
            {currentShow.description}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={isAnime(currentShow) ? `/watch-anime/${currentShow.slug}` : isMovie(currentShow) ? `/watch-movie/${currentShow.slug}` : `/watch/${currentShow.slug}`}>
              <Button
                size="lg"
                className="gap-2 min-h-11"
                data-testid={`button-play-${currentShow.id}`}
              >
                <Play className="w-5 h-5 fill-current" />
                Play Now
              </Button>
            </Link>
            <Link href={isAnime(currentShow) ? `/anime/${currentShow.slug}` : isMovie(currentShow) ? `/movie/${currentShow.slug}` : `/show/${currentShow.slug}`}>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 bg-background/20 backdrop-blur-sm border-foreground/20 hover:bg-background/30 min-h-11"
                data-testid={`button-info-${currentShow.id}`}
              >
                <Info className="w-5 h-5" />
                More Info
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {shows.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${index === currentIndex
              ? "bg-primary w-8"
              : "bg-foreground/40 hover:bg-foreground/60"
              }`}
            aria-label={`Go to slide ${index + 1}`}
            data-testid={`button-hero-dot-${index}`}
          />
        ))}
      </div>
    </div>
  );
}
