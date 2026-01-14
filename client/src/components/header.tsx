import { Link, useLocation } from "wouter";
import { Search, Moon, Sun, Play, Menu, X, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "./theme-provider";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Show, Movie, Anime } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: shows } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  const { data: movies } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  const { data: anime } = useQuery<Anime[]>({
    queryKey: ["/api/anime"],
  });

  const navigation = [
    { name: "Home", path: "/" },
    { name: "Web Series", path: "/series" },
    { name: "Movies", path: "/movies" },
    { name: "Anime", path: "/anime" },
    { name: "Trending", path: "/trending" },
  ];

  const categories = [
    { name: "Action & Thriller", path: "/category/action" },
    { name: "Drama & Romance", path: "/category/drama" },
    { name: "Comedy", path: "/category/comedy" },
    { name: "Horror & Mystery", path: "/category/horror" },
  ];

  // Filter shows, movies, and anime based on search query
  const searchResults = searchQuery.trim()
    ? [
      ...(shows?.filter((show) =>
        show.title.toLowerCase().includes(searchQuery.toLowerCase())
      ).map(show => ({ ...show, type: 'show' as const })) || []),
      ...(movies?.filter((movie) =>
        movie.title.toLowerCase().includes(searchQuery.toLowerCase())
      ).map(movie => ({ ...movie, type: 'movie' as const })) || []),
      ...(anime?.filter((a) =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase())
      ).map(a => ({ ...a, type: 'anime' as const })) || [])
    ].slice(0, 8)
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
      setShowResults(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowResults(value.trim().length > 0);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link href="/">
          <div
            className="flex items-center gap-2 text-xl font-bold tracking-tight hover-elevate active-elevate-2 rounded-md px-3 py-2 cursor-pointer"
            data-testid="link-home-logo"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded bg-primary">
              <Play className="w-4 h-4 text-primary-foreground fill-current" />
            </div>
            <span className="hidden sm:inline">StreamVault</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navigation.map((item) => (
            <Link key={item.path} href={item.path}>
              <div
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors hover-elevate active-elevate-2 cursor-pointer ${location === item.path
                  ? "text-foreground"
                  : "text-muted-foreground"
                  }`}
                data-testid={`link-nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {item.name}
              </div>
            </Link>
          ))}

          {/* Categories Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="px-3"
                data-testid="button-categories-dropdown"
              >
                Categories
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {categories.map((category) => (
                <DropdownMenuItem key={category.path} asChild>
                  <Link href={category.path}>
                    <div
                      className="w-full cursor-pointer"
                      data-testid={`link-category-${category.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {category.name}
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Watchlist */}
          <Link href="/watchlist">
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex"
              data-testid="button-watchlist"
            >
              <Bookmark className="h-5 w-5" />
            </Button>
          </Link>

          {/* Search */}
          {searchOpen ? (
            <div ref={searchRef} className="hidden sm:block relative">
              <form
                onSubmit={handleSearch}
                className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5 duration-200"
              >
                <Input
                  type="search"
                  placeholder="Search shows..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-64"
                  autoFocus
                  data-testid="input-search"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSearchOpen(false);
                    setShowResults(false);
                    setSearchQuery("");
                  }}
                  data-testid="button-close-search"
                >
                  <X className="h-5 w-5" />
                </Button>
              </form>

              {/* Live Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full mt-2 w-96 bg-background border border-border rounded-lg shadow-lg overflow-hidden z-50">
                  {searchResults.map((item) => (
                    <Link key={item.id} href={item.type === 'anime' ? `/anime/${item.slug}` : item.type === 'show' ? `/show/${item.slug}` : `/movie/${item.slug}`}>
                      <div
                        className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => {
                          setShowResults(false);
                          setSearchQuery("");
                        }}
                      >
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {item.year} • {item.type === 'anime' ? 'Anime' : item.type === 'show' ? 'TV Series' : 'Movie'}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {searchQuery.trim() && (
                    <Link href={`/search?q=${encodeURIComponent(searchQuery)}`}>
                      <div
                        className="p-3 text-center text-sm text-primary hover:bg-accent cursor-pointer border-t border-border"
                        onClick={() => {
                          setShowResults(false);
                          setSearchQuery("");
                        }}
                      >
                        View all results for "{searchQuery}"
                      </div>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex"
              data-testid="button-open-search"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
            data-testid="button-mobile-menu-toggle"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {/* Mobile Search */}
            <div className="mb-4 relative">
              <form onSubmit={handleSearch}>
                <Input
                  type="search"
                  placeholder="Search shows..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  data-testid="input-mobile-search"
                />
              </form>

              {/* Mobile Live Search Results */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-background border border-border rounded-lg shadow-lg overflow-hidden z-50">
                  {searchResults.map((item) => (
                    <Link key={item.id} href={item.type === 'show' ? `/show/${item.slug}` : `/movie/${item.slug}`}>
                      <div
                        className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => {
                          setShowResults(false);
                          setSearchQuery("");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {item.year} • {item.type === 'show' ? 'TV Series' : 'Movie'}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {searchQuery.trim() && (
                    <Link href={`/search?q=${encodeURIComponent(searchQuery)}`}>
                      <div
                        className="p-3 text-center text-sm text-primary hover:bg-accent cursor-pointer border-t border-border"
                        onClick={() => {
                          setShowResults(false);
                          setSearchQuery("");
                          setMobileMenuOpen(false);
                        }}
                      >
                        View all results for "{searchQuery}"
                      </div>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {navigation.map((item) => (
              <Link key={item.path} href={item.path}>
                <div
                  className={`block px-3 py-2 text-sm font-medium rounded-md hover-elevate active-elevate-2 cursor-pointer ${location === item.path
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground"
                    }`}
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`link-mobile-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {item.name}
                </div>
              </Link>
            ))}

            {/* Watchlist Link */}
            <Link href="/watchlist">
              <div
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover-elevate active-elevate-2 cursor-pointer ${location === "/watchlist"
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground"
                  }`}
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-watchlist"
              >
                <Bookmark className="h-4 w-4" />
                My Watchlist
              </div>
            </Link>

            <div className="pt-2 border-t border-border">
              <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                Categories
              </p>
              {categories.map((category) => (
                <Link key={category.path} href={category.path}>
                  <div
                    className="block px-3 py-2 text-sm text-muted-foreground rounded-md hover-elevate active-elevate-2 cursor-pointer"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`link-mobile-category-${category.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {category.name}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
