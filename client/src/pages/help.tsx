import { Search, Play, Bookmark, Settings, HelpCircle, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SEO } from "@/components/seo";
import { AdsterraNativeBanner } from "@/components/adsterra-banner";
import { useState } from "react";

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");

  const helpTopics = [
    {
      icon: Play,
      title: "Getting Started",
      description: "Learn how to use StreamVault",
      articles: [
        "How to watch shows and movies",
        "Creating and managing your watchlist",
        "Understanding video quality options",
        "Keyboard shortcuts and controls",
      ],
    },
    {
      icon: Search,
      title: "Finding Content",
      description: "Discover shows and movies",
      articles: [
        "How to search for content",
        "Browse by category and genre",
        "Using filters and sorting",
        "Trending and popular content",
      ],
    },
    {
      icon: Bookmark,
      title: "Watchlist & Progress",
      description: "Manage your viewing",
      articles: [
        "Adding shows to your watchlist",
        "Tracking watch progress",
        "Removing items from watchlist",
        "Continue watching feature",
      ],
    },
    {
      icon: Settings,
      title: "Account & Settings",
      description: "Customize your experience",
      articles: [
        "Browser compatibility",
        "Clearing cache and cookies",
        "Video playback issues",
        "Mobile device support",
      ],
    },
  ];

  const faqs = [
    // Getting Started
    {
      question: "How to watch shows and movies",
      answer: "Browse or search for content, click on a show or movie, then click the Play button. The video will start streaming immediately. You can pause, rewind, or fast-forward using the video controls.",
    },
    {
      question: "Creating and managing your watchlist",
      answer: "Click the '+' button on any show card to add it to your watchlist. Access your watchlist from the navigation menu. To remove items, click the checkmark button on the show card or use the remove button in your watchlist.",
    },
    {
      question: "Understanding video quality options",
      answer: "Most content is available in HD quality (720p or 1080p). Video quality automatically adjusts based on your internet speed. For best quality, ensure you have a stable internet connection of at least 5 Mbps.",
    },
    {
      question: "Keyboard shortcuts and controls",
      answer: "Use Space to play/pause, Arrow keys to skip forward/backward, F for fullscreen, M to mute/unmute, and +/- to adjust volume. These shortcuts work when the video player is focused.",
    },
    // Finding Content
    {
      question: "How to search for content",
      answer: "Use the search bar at the top of the page. Type the show name, actor, or genre. Results appear as you type. Click on any result to view details or start watching.",
    },
    {
      question: "Browse by category and genre",
      answer: "Click on 'Categories' in the navigation menu to see all available genres (Action, Drama, Comedy, etc.). Each category page shows all shows in that genre, sorted by popularity.",
    },
    {
      question: "Using filters and sorting",
      answer: "On category pages, you can sort by popularity, newest, or rating. Use the filter options to narrow down results by year, rating, or content type.",
    },
    {
      question: "Trending and popular content",
      answer: "Visit the 'Trending' page to see what's popular right now. The homepage also features trending shows and new releases. Popular content is updated daily based on viewing activity.",
    },
    // Watchlist & Progress
    {
      question: "Adding shows to your watchlist",
      answer: "Click the '+' icon on any show card. The icon will change to a checkmark to confirm it's added. Your watchlist is saved locally in your browser and persists across sessions.",
    },
    {
      question: "Tracking watch progress",
      answer: "Your watch progress is automatically saved as you watch. When you return to a show, you'll see a progress bar and can continue from where you left off. Progress is saved every 10 seconds.",
    },
    {
      question: "Removing items from watchlist",
      answer: "Click the checkmark icon on a show card to remove it from your watchlist. You can also manage your watchlist from the Watchlist page, where you can remove multiple items at once.",
    },
    {
      question: "Continue watching feature",
      answer: "Shows you've started watching appear in the 'Continue Watching' section on the homepage. Click any show to resume from where you left off. Progress is shown as a percentage bar.",
    },
    // Account & Settings
    {
      question: "Browser compatibility",
      answer: "StreamVault works on Chrome, Firefox, Safari, Edge, and other modern browsers. For best experience, use the latest browser version. Mobile browsers are also fully supported.",
    },
    {
      question: "Clearing cache and cookies",
      answer: "To clear cache: Chrome (Ctrl+Shift+Delete), Firefox (Ctrl+Shift+Delete), Safari (Cmd+Option+E). Note: Clearing cache will remove your watchlist and watch progress.",
    },
    {
      question: "Video playback issues",
      answer: "If videos won't play: 1) Refresh the page, 2) Clear browser cache, 3) Try a different browser, 4) Check your internet connection, 5) Disable browser extensions. If issues persist, report it to us.",
    },
    {
      question: "Mobile device support",
      answer: "StreamVault is fully responsive and works on all mobile devices. Simply visit the website from your mobile browser. For best experience on mobile, use landscape mode for watching videos.",
    },
    // General
    {
      question: "Is StreamVault free to use?",
      answer: "Yes! StreamVault is completely free. We're supported by advertisements to keep the service free for everyone.",
    },
    {
      question: "Do I need to create an account?",
      answer: "No account is required! Your watch progress and watchlist are saved locally in your browser.",
    },
    {
      question: "Why isn't a video playing?",
      answer: "Try refreshing the page or clearing your browser cache. If the issue persists, the video source may be temporarily unavailable.",
    },
    {
      question: "Can I download content?",
      answer: "StreamVault is a streaming-only platform. We don't offer download functionality at this time.",
    },
    {
      question: "How often is new content added?",
      answer: "We regularly update our library with new episodes and shows. Check back often for the latest content!",
    },
    {
      question: "What browsers are supported?",
      answer: "StreamVault works best on modern browsers like Chrome, Firefox, Safari, and Edge. Make sure your browser is up to date.",
    },
  ];

  const filteredFAQs = faqs.filter(
    (faq) =>
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Help Center"
        description="Get help with StreamVault. Find answers to common questions about streaming, playback issues, watchlist management, and more."
        canonical="https://streamvault.live/help"
      />
      {/* Adsterra Native Banner */}
      <AdsterraNativeBanner />

      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Help Center</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Find answers to common questions and learn how to use StreamVault
          </p>

          {/* Search */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        {/* Help Topics */}
        {searchQuery === "" && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Browse Topics</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {helpTopics.map((topic) => (
                <div
                  key={topic.title}
                  className="p-6 rounded-lg bg-card border border-border hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <topic.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold">{topic.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {topic.description}
                  </p>
                  <ul className="space-y-2">
                    {topic.articles.map((article) => (
                      <li key={article}>
                        <button
                          onClick={() => setSearchQuery(article)}
                          className="text-sm text-primary hover:underline text-left"
                        >
                          {article}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQs */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            {searchQuery ? "Search Results" : "Frequently Asked Questions"}
          </h2>
          <div className="space-y-4">
            {filteredFAQs.length > 0 ? (
              filteredFAQs.map((faq, index) => (
                <div
                  key={index}
                  className="p-6 rounded-lg bg-card border border-border"
                >
                  <h3 className="text-lg font-semibold mb-2 flex items-start gap-2">
                    <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    {faq.question}
                  </h3>
                  <p className="text-muted-foreground pl-7">{faq.answer}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No results found for "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Support */}
        <div className="max-w-2xl mx-auto mt-16 text-center p-8 rounded-lg bg-card border border-border">
          <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Still Need Help?</h2>
          <p className="text-muted-foreground mb-6">
            Can't find what you're looking for? Our support team is here to help!
          </p>
          <a
            href="/contact"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
