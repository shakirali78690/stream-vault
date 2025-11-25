import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import type { Show, Movie } from "@shared/schema";
import { Link } from "wouter";

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  suggestions?: string[];
  showLinks?: Array<{ title: string; slug: string; type: 'show' | 'movie' }>;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "👋 Hi! I'm your StreamVault assistant. How can I help you today?",
      isBot: true,
      suggestions: [
        "Find a movie",
        "Find a show to watch",
        "Browse by genre",
        "What's trending?",
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: shows } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  const { data: movies } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findShows = (query: string): Show[] => {
    if (!shows) return [];
    const lowerQuery = query.toLowerCase();
    return shows.filter(
      (show) => {
        const genres = show.genres?.split(',').map(g => g.trim().toLowerCase()) || [];
        return show.title.toLowerCase().includes(lowerQuery) ||
          genres.some((g) => g.includes(lowerQuery)) ||
          show.category?.toLowerCase().includes(lowerQuery);
      }
    );
  };

  const findMovies = (query: string): Movie[] => {
    if (!movies) return [];
    const lowerQuery = query.toLowerCase();
    return movies.filter(
      (movie) => {
        const genres = movie.genres?.toLowerCase() || '';
        return movie.title.toLowerCase().includes(lowerQuery) ||
          genres.includes(lowerQuery);
      }
    );
  };

  const generateResponse = (userMessage: string): Message => {
    const lowerMessage = userMessage.toLowerCase();

    // Check for movies specifically
    const matchedMovies = findMovies(userMessage);
    const matchedShows = findShows(userMessage);
    
    // If user mentions "movie" or "film", prioritize movies
    if ((lowerMessage.includes("movie") || lowerMessage.includes("film")) && matchedMovies.length > 0) {
      return {
        id: Date.now().toString(),
        text: `I found ${matchedMovies.length} movie(s) for you! Click any to watch:`,
        isBot: true,
        showLinks: matchedMovies.slice(0, 5).map((m) => ({
          title: m.title,
          slug: m.slug,
          type: 'movie' as const,
        })),
        suggestions: ["Show me more movies", "Browse shows", "What's trending?"],
      };
    }
    
    // Combined search for both shows and movies
    if ((matchedShows.length > 0 || matchedMovies.length > 0) && userMessage.length > 3) {
      const combinedResults = [
        ...matchedShows.slice(0, 3).map(s => ({ title: s.title, slug: s.slug, type: 'show' as const })),
        ...matchedMovies.slice(0, 3).map(m => ({ title: m.title, slug: m.slug, type: 'movie' as const }))
      ].slice(0, 5);
      
      if (combinedResults.length > 0) {
        return {
          id: Date.now().toString(),
          text: `I found ${combinedResults.length} result(s) for you! Click any to watch:`,
          isBot: true,
          showLinks: combinedResults,
          suggestions: ["Show me more", "Browse by genre", "What's trending?"],
        };
      }
    }

    // Generic find/watch queries without specific show/movie name
    if (
      (lowerMessage.includes("find") ||
      lowerMessage.includes("watch") ||
      lowerMessage.includes("show me")) &&
      matchedShows.length === 0 &&
      matchedMovies.length === 0
    ) {
      return {
        id: Date.now().toString(),
        text: "What would you like to watch? Try:\n• Typing a show name (e.g., 'Stranger Things')\n• Typing a movie name (e.g., 'The Godfather')\n• Browsing by category\n• Checking what's trending",
        isBot: true,
        suggestions: ["Action movies", "Drama series", "Comedy shows", "Trending now"],
      };
    }

    // Episode navigation - handle specific episode requests
    const episodeMatch = userMessage.match(/(.*?)\s*(?:season|s)(\d+)\s*(?:episode|e)(\d+)/i);
    if (episodeMatch) {
      const showName = episodeMatch[1].trim();
      const season = episodeMatch[2];
      const episode = episodeMatch[3];
      
      const foundShow = shows?.find(s => 
        s.title.toLowerCase().includes(showName.toLowerCase())
      );
      
      if (foundShow) {
        return {
          id: Date.now().toString(),
          text: `Found ${foundShow.title}! Click below to watch Season ${season}, Episode ${episode}:`,
          isBot: true,
          showLinks: [{
            title: `${foundShow.title} - S${season}E${episode}`,
            slug: `${foundShow.slug}?season=${season}&episode=${episode}`,
            type: 'show' as const,
          }],
          suggestions: ["Show all episodes", "Find another show", "Browse shows"],
        };
      }
    }
    
    if (
      lowerMessage.includes("episode") ||
      lowerMessage.includes("season") ||
      lowerMessage.includes("s0") ||
      lowerMessage.includes("e0")
    ) {
      return {
        id: Date.now().toString(),
        text: "To play a specific episode, try:\n• 'Stranger Things season 1 episode 1'\n• 'Breaking Bad s5e16'\n• Or search for the show and select the episode\n\nWhich show are you looking for?",
        isBot: true,
        suggestions: ["Stranger Things s1e1", "Breaking Bad s5e16", "Browse shows"],
      };
    }

    // Playback issues
    if (
      lowerMessage.includes("play") ||
      lowerMessage.includes("video") ||
      lowerMessage.includes("not working") ||
      lowerMessage.includes("error") ||
      lowerMessage.includes("loading")
    ) {
      return {
        id: Date.now().toString(),
        text: "🔧 Playback troubleshooting:\n\n1. Refresh the page (F5)\n2. Clear browser cache\n3. Try a different browser\n4. Check your internet connection\n5. Disable ad blockers\n\nStill having issues? Report it to our team!",
        isBot: true,
        suggestions: ["Report an issue", "Try another show", "Contact support"],
      };
    }

    // Watchlist help
    if (
      lowerMessage.includes("watchlist") ||
      lowerMessage.includes("save") ||
      lowerMessage.includes("bookmark") ||
      lowerMessage.includes("favorite")
    ) {
      return {
        id: Date.now().toString(),
        text: "📚 To add shows or movies to your watchlist:\n\n1. Go to any show or movie page\n2. Click the 'Add to Watchlist' button\n3. Access your watchlist from the header\n\nYour watchlist is saved in your browser!",
        isBot: true,
        suggestions: ["Browse shows", "Browse movies", "View trending"],
      };
    }

    // Browse categories - show category list
    if (
      lowerMessage.includes("browse categor") ||
      lowerMessage.includes("show categor") ||
      lowerMessage.includes("all categor") ||
      lowerMessage === "browse" ||
      lowerMessage === "categories"
    ) {
      return {
        id: Date.now().toString(),
        text: "🎭 Browse by category:\n• Action & Thriller\n• Drama & Romance\n• Comedy\n• Horror & Mystery\n• Crime & Romance\n• Sci-Fi & Fantasy\n\nClick any category below:",
        isBot: true,
        suggestions: ["Action shows", "Drama series", "Comedy shows", "Horror shows"],
      };
    }

    // Specific category searches
    if (
      lowerMessage.includes("action") ||
      lowerMessage.includes("thriller")
    ) {
      const categoryShows = shows?.filter(s => {
        const genres = s.genres?.toLowerCase() || '';
        return s.category === "action" || 
          genres.includes("action") || genres.includes("thriller");
      }).slice(0, 3) || [];
      
      const categoryMovies = movies?.filter(m => {
        const genres = m.genres?.toLowerCase() || '';
        return genres.includes("action") || genres.includes("thriller");
      }).slice(0, 3) || [];
      
      const combined = [
        ...categoryShows.map(s => ({ title: s.title, slug: s.slug, type: 'show' as const })),
        ...categoryMovies.map(m => ({ title: m.title, slug: m.slug, type: 'movie' as const }))
      ];
      
      if (combined.length > 0) {
        return {
          id: Date.now().toString(),
          text: `🎬 Found ${combined.length} action/thriller titles:`,
          isBot: true,
          showLinks: combined,
          suggestions: ["Drama shows", "Comedy shows", "What's trending?"],
        };
      }
    }

    if (
      lowerMessage.includes("drama") ||
      lowerMessage.includes("romance")
    ) {
      const categoryShows = shows?.filter(s => {
        const genres = s.genres?.toLowerCase() || '';
        return s.category === "drama" || s.category === "romance" ||
          genres.includes("drama") || genres.includes("romance");
      }).slice(0, 5) || [];
      
      if (categoryShows.length > 0) {
        return {
          id: Date.now().toString(),
          text: `💕 Found ${categoryShows.length} drama/romance shows:`,
          isBot: true,
          showLinks: categoryShows.map((s) => ({
            title: s.title,
            slug: s.slug,
            type: 'show' as const,
          })),
          suggestions: ["Action shows", "Comedy shows", "What's trending?"],
        };
      }
    }

    if (lowerMessage.includes("comedy")) {
      const categoryShows = shows?.filter(s => {
        const genres = s.genres?.toLowerCase() || '';
        return s.category === "comedy" ||
          genres.includes("comedy");
      }).slice(0, 5) || [];
      
      if (categoryShows.length > 0) {
        return {
          id: Date.now().toString(),
          text: `😂 Found ${categoryShows.length} comedy shows:`,
          isBot: true,
          showLinks: categoryShows.map((s) => ({
            title: s.title,
            slug: s.slug,
            type: 'show' as const,
          })),
          suggestions: ["Action shows", "Drama shows", "What's trending?"],
        };
      }
    }

    if (lowerMessage.includes("horror") || lowerMessage.includes("mystery")) {
      const categoryShows = shows?.filter(s => {
        const genres = s.genres?.toLowerCase() || '';
        return s.category === "horror" || s.category === "mystery" ||
          genres.includes("horror") || genres.includes("mystery");
      }).slice(0, 5) || [];
      
      if (categoryShows.length > 0) {
        return {
          id: Date.now().toString(),
          text: `👻 Found ${categoryShows.length} horror/mystery shows:`,
          isBot: true,
          showLinks: categoryShows.map((s) => ({
            title: s.title,
            slug: s.slug,
            type: 'show' as const,
          })),
          suggestions: ["Action shows", "Comedy shows", "What's trending?"],
        };
      }
    }

    // Trending
    if (lowerMessage.includes("trending") || lowerMessage.includes("popular")) {
      const trendingShows = shows?.filter(s => s.trending).slice(0, 5) || [];
      
      if (trendingShows.length > 0) {
        return {
          id: Date.now().toString(),
          text: "🔥 Here are the trending shows right now:",
          isBot: true,
          showLinks: trendingShows.map((s) => ({
            title: s.title,
            slug: s.slug,
            type: 'show' as const,
          })),
          suggestions: ["Show more", "Browse categories", "Search shows"],
        };
      }
      
      return {
        id: Date.now().toString(),
        text: "🔥 Check out what's trending! Visit our Trending page to see the most popular shows right now.",
        isBot: true,
        suggestions: ["Browse all shows", "Search shows", "View categories"],
      };
    }

    // Browse movies
    if (
      lowerMessage.includes("browse movies") ||
      lowerMessage.includes("show movies") ||
      lowerMessage.includes("all movies") ||
      lowerMessage.includes("movie list")
    ) {
      const allMovies = movies?.slice(0, 10) || [];
      
      if (allMovies.length > 0) {
        return {
          id: Date.now().toString(),
          text: `🎬 Here are ${allMovies.length} popular movies:`,
          isBot: true,
          showLinks: allMovies.map((m) => ({
            title: m.title,
            slug: m.slug,
            type: 'movie' as const,
          })),
          suggestions: ["Browse shows", "What's trending?", "Browse categories"],
        };
      }
    }
    
    // Show more / Browse all
    if (
      lowerMessage.includes("show more") ||
      lowerMessage.includes("more shows") ||
      lowerMessage.includes("browse all") ||
      lowerMessage.includes("all shows")
    ) {
      const allShows = shows?.slice(0, 10) || [];
      
      if (allShows.length > 0) {
        return {
          id: Date.now().toString(),
          text: `📺 Here are ${allShows.length} popular shows:`,
          isBot: true,
          showLinks: allShows.map((s) => ({
            title: s.title,
            slug: s.slug,
            type: 'show' as const,
          })),
          suggestions: ["Browse movies", "Browse categories", "What's trending?"],
        };
      }
    }

    // Search help
    if (lowerMessage.includes("search") || lowerMessage.includes("how to find")) {
      return {
        id: Date.now().toString(),
        text: "🔍 To search for shows:\n\n1. Click the search icon in the header\n2. Type the show name\n3. See instant results as you type\n4. Click any result to watch\n\nTry searching now!",
        isBot: true,
        suggestions: ["Find a show", "Browse categories", "What's trending?"],
      };
    }

    // Default response
    return {
      id: Date.now().toString(),
      text: "I can help you with:\n• Finding shows and movies\n• Playing specific episodes (e.g., 'Stranger Things s1e1')\n• Fixing playback issues\n• Managing your watchlist\n• Browsing by genre\n\nWhat would you like to do?",
      isBot: true,
      suggestions: [
        "Find a movie",
        "Find a show",
        "Browse categories",
        "What's trending?",
      ],
    };
  };

  const handleSend = (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isBot: false,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Show typing indicator
    setIsTyping(true);

    // Generate bot response after delay
    setTimeout(() => {
      const botResponse = generateResponse(messageText);
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 800);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-[100]" style={{ position: 'fixed', bottom: '24px', right: '24px' }}>
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform"
          size="icon"
          data-testid="button-open-chatbot"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="w-[calc(100vw-2rem)] sm:w-96 max-w-[400px] h-[600px] max-h-[80vh] bg-background border border-border rounded-lg shadow-2xl flex flex-col z-[100] animate-in slide-in-from-bottom-5 duration-300"
      style={{ position: 'fixed', bottom: '24px', right: '24px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <div>
            <h3 className="font-semibold">StreamVault Assistant</h3>
            <p className="text-xs opacity-90">Always here to help</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
          data-testid="button-close-chatbot"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 chatbot-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isBot ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.isBot
                  ? "bg-muted text-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <p className="text-sm whitespace-pre-line">{message.text}</p>

              {/* Show/Movie links */}
              {message.showLinks && message.showLinks.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.showLinks.map((item) => {
                    // Handle different URL formats
                    let href;
                    if (item.type === 'movie') {
                      href = `/movie/${item.slug}`;
                    } else if (item.slug.includes('?season=')) {
                      // Episode link with query params
                      href = `/watch/${item.slug}`;
                    } else {
                      // Regular show link
                      href = `/show/${item.slug}`;
                    }
                    const icon = item.type === 'movie' ? '🎬' : '📺';
                    
                    return (
                      <Link key={item.slug} href={href}>
                        <div
                          className="text-sm bg-background hover:bg-accent p-2 rounded border border-border cursor-pointer transition-colors"
                          onClick={() => setIsOpen(false)}
                        >
                          {icon} {item.title}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs bg-background hover:bg-accent px-3 py-1 rounded-full border border-border transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            data-testid="input-chatbot"
          />
          <Button type="submit" size="icon" data-testid="button-send-message">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
