import { Film, Tv, Star, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SEO } from "@/components/seo";
import { AdsterraNativeBanner } from "@/components/adsterra-banner";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export default function RequestContent() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    contentType: "",
    title: "",
    year: "",
    genre: "",
    description: "",
    reason: "",
    email: "",
  });

  // Fetch top requests
  const { data: topRequests = [], refetch } = useQuery({
    queryKey: ['/api/top-requests'],
    queryFn: async () => {
      const response = await fetch('/api/top-requests');
      if (!response.ok) throw new Error('Failed to fetch top requests');
      return response.json();
    },
  });

  const contentTypes = [
    {
      value: "series",
      icon: Tv,
      label: "TV Series",
      description: "Request a complete TV series or web series",
    },
    {
      value: "movie",
      icon: Film,
      label: "Movie",
      description: "Request a specific movie",
    },
    {
      value: "episode",
      icon: Star,
      label: "Missing Episode",
      description: "Report a missing episode from an existing series",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contentType || !formData.title) {
      toast({
        title: "Missing Information",
        description: "Please fill in the required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/request-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Request Submitted!",
          description: data.requestCount > 1 
            ? `${data.requestCount} people have requested this!` 
            : "Thank you! We'll review your content request.",
        });

        // Refetch top requests to update the list
        refetch();

        // Reset form
        setFormData({
          contentType: "",
          title: "",
          year: "",
          genre: "",
          description: "",
          reason: "",
          email: "",
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your request. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Request Content"
        description="Request movies or TV shows to be added to StreamVault. We listen to our community and add popular requests."
        canonical="https://streamvault.live/request"
      />
      {/* Adsterra Native Banner */}
      <AdsterraNativeBanner />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Send className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">Request Content</h1>
            <p className="text-xl text-muted-foreground">
              Can't find what you're looking for? Let us know and we'll try to add it!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Content Type Selection */}
            <div>
              <Label className="text-lg font-semibold mb-4 block">
                What would you like to request? *
              </Label>
              <div className="grid md:grid-cols-3 gap-4">
                {contentTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, contentType: type.value })
                    }
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.contentType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <type.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{type.label}</h3>
                        <p className="text-xs text-muted-foreground">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-base font-semibold">
                Title *
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="e.g., Breaking Bad, The Matrix, etc."
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="mt-2"
                required
              />
            </div>

            {/* Year and Genre */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year" className="text-base font-semibold">
                  Year (Optional)
                </Label>
                <Input
                  id="year"
                  type="text"
                  placeholder="2024"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: e.target.value })
                  }
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="genre" className="text-base font-semibold">
                  Genre (Optional)
                </Label>
                <Input
                  id="genre"
                  type="text"
                  placeholder="Action, Drama, Comedy, etc."
                  value={formData.genre}
                  onChange={(e) =>
                    setFormData({ ...formData, genre: e.target.value })
                  }
                  className="mt-2"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-base font-semibold">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Brief description or plot summary..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="mt-2 min-h-[100px]"
              />
            </div>

            {/* Reason */}
            <div>
              <Label htmlFor="reason" className="text-base font-semibold">
                Why do you want this content? (Optional)
              </Label>
              <Textarea
                id="reason"
                placeholder="Tell us why you'd like to see this on StreamVault..."
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                className="mt-2 min-h-[100px]"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-base font-semibold">
                Your Email (Optional)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                We'll notify you if we add your requested content
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button type="submit" size="lg" className="flex-1">
                <Send className="w-4 h-4 mr-2" />
                Submit Request
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() =>
                  setFormData({
                    contentType: "",
                    title: "",
                    year: "",
                    genre: "",
                    description: "",
                    reason: "",
                    email: "",
                  })
                }
              >
                Clear Form
              </Button>
            </div>
          </form>

          {/* Popular Requests */}
          {topRequests.length > 0 && (
            <div className="mt-12 p-6 rounded-lg bg-card border border-border">
              <h3 className="font-semibold mb-4">📊 Most Requested Content</h3>
              <div className="space-y-2 text-sm">
                {topRequests.map((request: any) => (
                  <div key={request.id} className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      {request.contentType === 'series' && <Tv className="w-4 h-4" />}
                      {request.contentType === 'movie' && <Film className="w-4 h-4" />}
                      {request.contentType === 'episode' && <Star className="w-4 h-4" />}
                      {request.title}
                      {request.year && <span className="text-muted-foreground">({request.year})</span>}
                    </span>
                    <span className="text-muted-foreground">
                      {request.requestCount} {request.requestCount === 1 ? 'request' : 'requests'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-8 p-6 rounded-lg bg-muted">
            <h3 className="font-semibold mb-3">What happens next?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• We review all content requests regularly</li>
              <li>• Popular requests are prioritized</li>
              <li>• We'll try to add the content if it's available</li>
              <li>• If you provided an email, we'll notify you when it's added</li>
              <li>• Please note: We can only add legally available content</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
