import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { ShowCard } from "./show-card";
import type { Show, Movie, Anime } from "@shared/schema";

interface ContentRowProps {
  title: string;
  shows: (Show | Movie | Anime)[];
  orientation?: "portrait" | "landscape";
  showProgress?: Map<string, number>;
}

export function ContentRow({
  title,
  shows,
  orientation = "portrait",
  showProgress,
}: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 300);
    }
  };

  if (shows.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Title */}
      <h2
        className="text-xl md:text-2xl font-semibold px-4 md:px-6"
        data-testid={`text-row-title-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {title}
      </h2>

      {/* Scrollable Row */}
      <div className="relative group">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-full bg-gradient-to-r from-background to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-start pl-2"
            aria-label="Scroll left"
            data-testid={`button-scroll-left-${title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover-elevate active-elevate-2">
              <ChevronLeft className="w-6 h-6" />
            </div>
          </button>
        )}

        {/* Content */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-4 md:px-6 scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {shows.map((show) => (
            <div
              key={show.id}
              className={`flex-shrink-0 ${orientation === "portrait" ? "w-40 md:w-48" : "w-72 md:w-80"
                }`}
            >
              <ShowCard
                show={show}
                orientation={orientation}
                showProgress={showProgress?.get(show.id)}
              />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-full bg-gradient-to-l from-background to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end pr-2"
            aria-label="Scroll right"
            data-testid={`button-scroll-right-${title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover-elevate active-elevate-2">
              <ChevronRight className="w-6 h-6" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
