import { Link, useLocation } from "wouter";
import { Play, Plus, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Show, Movie } from "@shared/schema";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getHeaders } from "@/lib/api";

interface ShowCardProps {
  show: Show | Movie;
  orientation?: "portrait" | "landscape";
  showProgress?: number;
}

export function ShowCard({
  show,
  orientation = "portrait",
  showProgress,
}: ShowCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: watchlist = [] } = useQuery<any[]>({
    queryKey: ["/api/watchlist"],
  });

  const isInWatchlist = watchlist.some((item) => item.showId === show.id);

  const addToWatchlistMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/watchlist", {
        showId: show.id,
        addedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
  });

  const removeFromWatchlistMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/watchlist/${show.id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
  });

  const toggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isInWatchlist) {
      removeFromWatchlistMutation.mutate();
    } else {
      addToWatchlistMutation.mutate();
    }
  };

  const isMovie = 'googleDriveUrl' in show;
  
  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocation(isMovie ? `/watch-movie/${show.slug}` : `/watch/${show.slug}`);
  };

  const imageUrl = orientation === "portrait" ? show.posterUrl : show.backdropUrl;
  const aspectRatio = orientation === "portrait" ? "aspect-[2/3]" : "aspect-video";

  return (
    <Link href={isMovie ? `/movie/${show.slug}` : `/show/${show.slug}`}>
      <div
        className="group relative overflow-visible cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={`card-show-${show.id}`}
      >
        <div
          className={`relative ${aspectRatio} rounded-md overflow-hidden bg-muted transition-all duration-300 ${
            isHovered ? "scale-105 shadow-xl" : ""
          }`}
        >
          {/* Poster Image */}
          <img
            src={imageUrl}
            alt={show.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {/* Progress Bar */}
          {showProgress !== undefined && showProgress > 0 && (
            <div className="absolute bottom-0 left-0 right-0">
              <Progress value={showProgress} className="h-1 rounded-none" />
            </div>
          )}

          {/* Hover Overlay */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent transition-opacity duration-300 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              {/* Title */}
              <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2">
                {show.title}
              </h3>

              {/* Meta Info */}
              <div className="flex items-center gap-2 text-xs text-white/80 mb-3">
                <span>{show.year}</span>
                {!isMovie && 'totalSeasons' in show && show.totalSeasons && (
                  <>
                    <span>•</span>
                    <span>{show.totalSeasons}S</span>
                  </>
                )}
                {show.imdbRating && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{show.imdbRating}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={handlePlayClick}
                >
                  <Play className="w-4 h-4" />
                  Play
                </Button>
                <Button
                  size="sm"
                  variant={isInWatchlist ? "secondary" : "outline"}
                  className="px-2"
                  onClick={toggleWatchlist}
                >
                  {isInWatchlist ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Title below (when not hovered, for landscape) */}
        {orientation === "landscape" && !isHovered && (
          <div className="mt-2">
            <h3 className="font-medium text-sm line-clamp-1">{show.title}</h3>
          </div>
        )}
      </div>
    </Link>
  );
}
