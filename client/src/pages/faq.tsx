import { ChevronDown } from "lucide-react";
import { SEO } from "@/components/seo";
import { AdBanner } from "@/components/ad-banner";
import { useState } from "react";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      category: "General",
      questions: [
        {
          q: "What is StreamVault?",
          a: "StreamVault is a free streaming platform that provides access to popular web series, TV shows, and movies in HD quality. We aggregate content from various sources to give you a seamless viewing experience.",
        },
        {
          q: "Is StreamVault really free?",
          a: "Yes! StreamVault is completely free to use. We're supported by advertisements, which allows us to keep the service free for all users.",
        },
        {
          q: "Do I need to create an account?",
          a: "No account is required to use StreamVault. Your watchlist and watch progress are automatically saved in your browser's local storage.",
        },
      ],
    },
    {
      category: "Watching Content",
      questions: [
        {
          q: "How do I watch a show or movie?",
          a: "Simply browse or search for the content you want to watch, click on it, and press the play button. The video will start streaming immediately.",
        },
        {
          q: "What video quality is available?",
          a: "Most content is available in HD quality (720p or 1080p). The video quality may vary depending on the source and your internet connection.",
        },
        {
          q: "Why isn't a video playing?",
          a: "If a video isn't playing, try refreshing the page, clearing your browser cache, or trying a different browser. If the issue persists, the video source may be temporarily unavailable.",
        },
        {
          q: "Can I download videos?",
          a: "No, StreamVault is a streaming-only platform. We don't offer download functionality to comply with content licensing and copyright regulations.",
        },
      ],
    },
    {
      category: "Features",
      questions: [
        {
          q: "How does the watchlist work?",
          a: "Click the '+' button on any show to add it to your watchlist. Your watchlist is saved locally in your browser and persists across sessions.",
        },
        {
          q: "Does StreamVault remember where I left off?",
          a: "Yes! Your watch progress is automatically saved. When you return to a show, you can continue from where you left off.",
        },
        {
          q: "How do I search for content?",
          a: "Use the search bar at the top of the page to find shows, movies, or specific episodes. You can also browse by category or genre.",
        },
        {
          q: "Can I request a show or movie?",
          a: "Yes! Visit our Contact page and send us your content request. We'll do our best to add it to our library.",
        },
      ],
    },
    {
      category: "Technical",
      questions: [
        {
          q: "What browsers are supported?",
          a: "StreamVault works best on modern browsers like Chrome, Firefox, Safari, and Edge. Make sure your browser is updated to the latest version for the best experience.",
        },
        {
          q: "Does StreamVault work on mobile devices?",
          a: "Yes! StreamVault is fully responsive and works on smartphones and tablets. Simply visit our website from your mobile browser.",
        },
        {
          q: "Why is the video buffering?",
          a: "Buffering is usually caused by slow internet connection. Try lowering your video quality, pausing the video to let it buffer, or checking your internet speed.",
        },
        {
          q: "How do I clear my watch history?",
          a: "Your watch history is stored locally in your browser. To clear it, you can clear your browser's local storage or use your browser's privacy settings.",
        },
      ],
    },
    {
      category: "Content",
      questions: [
        {
          q: "How often is new content added?",
          a: "We regularly update our library with new episodes and shows. Popular series are updated as soon as new episodes are available.",
        },
        {
          q: "Where does the content come from?",
          a: "StreamVault aggregates content from various third-party sources and video hosting platforms. We don't host any content on our own servers.",
        },
        {
          q: "What if a show or episode is missing?",
          a: "If you notice missing content, please report it through our Contact page. We'll investigate and try to add it as soon as possible.",
        },
        {
          q: "Are subtitles available?",
          a: "Subtitle availability depends on the video source. Many videos come with embedded subtitles that you can enable in the video player.",
        },
      ],
    },
    {
      category: "Privacy & Safety",
      questions: [
        {
          q: "Is my data safe?",
          a: "Yes! We don't collect personal information. Your watchlist and preferences are stored locally in your browser and never transmitted to our servers.",
        },
        {
          q: "Do you use cookies?",
          a: "We use minimal cookies for essential functionality and analytics. See our Privacy Policy for more details.",
        },
        {
          q: "How do I report inappropriate content?",
          a: "If you encounter inappropriate content, please use the 'Report Issue' link in the footer to notify us immediately.",
        },
      ],
    },
  ];

  const toggleQuestion = (categoryIndex: number, questionIndex: number) => {
    const index = categoryIndex * 100 + questionIndex;
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="FAQ - Frequently Asked Questions"
        description="Get answers to frequently asked questions about StreamVault. Learn about streaming, account features, content availability, and troubleshooting."
        canonical="https://streamvault.live/faq"
      />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-xl text-muted-foreground mb-12">
            Find quick answers to common questions about StreamVault
          </p>

          <div className="space-y-8">
            {faqs.map((category, categoryIndex) => (
              <div key={category.category}>
                <h2 className="text-2xl font-bold mb-4">{category.category}</h2>
                <div className="space-y-3">
                  {category.questions.map((faq, questionIndex) => {
                    const index = categoryIndex * 100 + questionIndex;
                    const isOpen = openIndex === index;

                    return (
                      <div
                        key={questionIndex}
                        className="rounded-lg bg-card border border-border overflow-hidden"
                      >
                        <button
                          onClick={() => toggleQuestion(categoryIndex, questionIndex)}
                          className="w-full p-6 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-semibold pr-4">{faq.q}</span>
                          <ChevronDown
                            className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${
                              isOpen ? "transform rotate-180" : ""
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-6">
                            <p className="text-muted-foreground">{faq.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 p-8 rounded-lg bg-card border border-border text-center">
            <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
            <p className="text-muted-foreground mb-6">
              Can't find the answer you're looking for? Reach out to our support team.
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
    </div>
  );
}
