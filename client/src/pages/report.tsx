import { AlertTriangle, Bug, Video, FileX, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SEO } from "@/components/seo";
import { AdsterraNativeBanner } from "@/components/adsterra-banner";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ReportIssue() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    issueType: "",
    title: "",
    description: "",
    url: "",
    email: "",
  });

  const issueTypes = [
    {
      value: "video",
      icon: Video,
      label: "Video Not Playing",
      description: "Video won't load or has playback issues",
    },
    {
      value: "broken",
      icon: FileX,
      label: "Broken Link",
      description: "Link leads to error or missing content",
    },
    {
      value: "bug",
      icon: Bug,
      label: "Technical Bug",
      description: "Something isn't working correctly",
    },
    {
      value: "content",
      icon: Shield,
      label: "Inappropriate Content",
      description: "Report offensive or inappropriate material",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.issueType || !formData.title || !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/report-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Report Submitted!",
          description: "Thank you for your report. We'll investigate this issue.",
        });

        // Reset form
        setFormData({
          issueType: "",
          title: "",
          description: "",
          url: "",
          email: "",
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your report. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Report an Issue"
        description="Report broken videos, playback issues, or other problems on StreamVault. Help us improve your streaming experience."
        canonical="https://streamvault.live/report"
      />
      {/* Adsterra Native Banner */}
      <AdsterraNativeBanner />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">Report an Issue</h1>
            <p className="text-xl text-muted-foreground">
              Help us improve StreamVault by reporting problems you encounter
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Issue Type Selection */}
            <div>
              <Label className="text-lg font-semibold mb-4 block">
                What type of issue are you reporting? *
              </Label>
              <div className="grid md:grid-cols-2 gap-4">
                {issueTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, issueType: type.value })
                    }
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.issueType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <type.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{type.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Issue Title */}
            <div>
              <Label htmlFor="title" className="text-base font-semibold">
                Issue Title *
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="Brief description of the issue"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="mt-2"
                required
              />
            </div>

            {/* URL */}
            <div>
              <Label htmlFor="url" className="text-base font-semibold">
                Page URL (Optional)
              </Label>
              <Input
                id="url"
                type="url"
                placeholder="https://streamvault.up.railway.app/show/..."
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                The URL where you encountered the issue
              </p>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-base font-semibold">
                Detailed Description *
              </Label>
              <Textarea
                id="description"
                placeholder="Please provide as much detail as possible about the issue..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="mt-2 min-h-[150px]"
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Include steps to reproduce, error messages, or any other relevant information
              </p>
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
                We'll only use this to follow up on your report if needed
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button type="submit" size="lg" className="flex-1">
                Submit Report
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() =>
                  setFormData({
                    issueType: "",
                    title: "",
                    description: "",
                    url: "",
                    email: "",
                  })
                }
              >
                Clear Form
              </Button>
            </div>
          </form>

          {/* Additional Info */}
          <div className="mt-12 p-6 rounded-lg bg-muted">
            <h3 className="font-semibold mb-3">What happens next?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• We'll review your report within 24-48 hours</li>
              <li>• Critical issues (security, inappropriate content) are prioritized</li>
              <li>• If you provided an email, we may contact you for more information</li>
              <li>• We'll work to resolve the issue as quickly as possible</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
