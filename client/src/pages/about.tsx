import { Play, Users, Tv, Heart } from "lucide-react";
import { SEO } from "@/components/seo";
import { AdsterraNativeBanner } from "@/components/adsterra-banner";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="About StreamVault"
        description="Learn about StreamVault - your premium destination for streaming movies and TV shows in HD quality. Free, fast, and user-friendly."
        canonical="https://streamvault.live/about"
      />
      {/* Adsterra Native Banner */}
      <AdsterraNativeBanner />

      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-primary">
              <Play className="w-8 h-8 text-primary-foreground fill-current" />
            </div>
            <h1 className="text-5xl font-bold">StreamVault</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your premium destination for streaming the best web series, TV shows, and movies in HD quality.
          </p>
        </div>

        {/* Mission Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-4">
            StreamVault was created with a simple mission: to provide entertainment lovers with easy access 
            to their favorite web series and shows. We believe that great content should be accessible to everyone, 
            which is why we've built a platform that's free, fast, and user-friendly.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Whether you're looking to binge-watch the latest season of Game of Thrones, discover new fantasy 
            series like The Witcher, or explore trending shows, StreamVault has you covered.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="text-center p-6 rounded-lg bg-card border border-border">
            <div className="flex justify-center mb-4">
              <Tv className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">HD Quality</h3>
            <p className="text-muted-foreground">
              Stream all content in high-definition quality for the best viewing experience.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card border border-border">
            <div className="flex justify-center mb-4">
              <Play className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Unlimited Streaming</h3>
            <p className="text-muted-foreground">
              Watch as much as you want, whenever you want. No limits, no restrictions.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card border border-border">
            <div className="flex justify-center mb-4">
              <Users className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">User-Friendly</h3>
            <p className="text-muted-foreground">
              Simple, intuitive interface designed for the best user experience.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card border border-border">
            <div className="flex justify-center mb-4">
              <Heart className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Personalized</h3>
            <p className="text-muted-foreground">
              Track your progress, create watchlists, and get personalized recommendations.
            </p>
          </div>
        </div>

        {/* What We Offer */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-6">What We Offer</h2>
          <div className="space-y-4">
            <div className="p-6 rounded-lg bg-card border border-border">
              <h3 className="text-xl font-semibold mb-2">📺 Popular Web Series</h3>
              <p className="text-muted-foreground">
                From Game of Thrones to The Witcher, access the most popular and trending web series.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border border-border">
              <h3 className="text-xl font-semibold mb-2">🎬 Movies & Shows</h3>
              <p className="text-muted-foreground">
                Discover a wide range of movies and TV shows across all genres.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border border-border">
              <h3 className="text-xl font-semibold mb-2">🔍 Easy Discovery</h3>
              <p className="text-muted-foreground">
                Browse by category, search for specific titles, or explore trending content.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border border-border">
              <h3 className="text-xl font-semibold mb-2">💾 Progress Tracking</h3>
              <p className="text-muted-foreground">
                Never lose your place. We remember where you left off in every episode.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-8 mb-16 text-center">
          <div className="p-6">
            <div className="text-4xl font-bold text-primary mb-2">100+</div>
            <div className="text-muted-foreground">Episodes Available</div>
          </div>
          <div className="p-6">
            <div className="text-4xl font-bold text-primary mb-2">HD</div>
            <div className="text-muted-foreground">Quality Streaming</div>
          </div>
          <div className="p-6">
            <div className="text-4xl font-bold text-primary mb-2">Free</div>
            <div className="text-muted-foreground">No Subscription Needed</div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="max-w-2xl mx-auto text-center p-8 rounded-lg bg-card border border-border">
          <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
          <p className="text-muted-foreground mb-6">
            Have questions, suggestions, or feedback? We'd love to hear from you!
          </p>
          <a 
            href="/contact" 
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
}
