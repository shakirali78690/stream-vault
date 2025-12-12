import { SEO } from "@/components/seo";
import { AdBanner } from "@/components/ad-banner";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Privacy Policy"
        description="Learn how StreamVault collects, uses, and protects your personal information. We value your privacy and are committed to transparency."
        canonical="https://streamvault.live/privacy"
      />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
            <p>
              StreamVault collects minimal information to provide you with the best streaming experience:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Viewing history and watch progress (stored locally in your browser)</li>
              <li>Watchlist preferences (stored locally)</li>
              <li>Usage data through Google Analytics (anonymized)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Remember your watch progress across sessions</li>
              <li>Provide personalized recommendations</li>
              <li>Improve our service and user experience</li>
              <li>Analyze site traffic and usage patterns</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Cookies and Tracking</h2>
            <p>
              StreamVault uses cookies and similar tracking technologies to enhance your experience:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for basic site functionality</li>
              <li><strong>Analytics Cookies:</strong> Google Analytics to understand user behavior</li>
              <li><strong>Advertising Cookies:</strong> Google AdSense to display relevant ads</li>
            </ul>
            <p className="mt-4">
              You can control cookies through your browser settings. Note that disabling cookies may affect site functionality.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Google Analytics:</strong> For traffic analysis and insights
                (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a>)
              </li>
              <li>
                <strong>Google AdSense:</strong> For displaying advertisements
                (<a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a>)
              </li>
              <li>
                <strong>Google Drive:</strong> For video hosting
                (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a>)
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Data Storage</h2>
            <p>
              Most of your data (watch progress, watchlist) is stored locally in your browser using localStorage. 
              This data never leaves your device and is not transmitted to our servers.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Delete your data (clear browser storage)</li>
              <li>Opt-out of analytics tracking</li>
              <li>Disable cookies in your browser</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Children's Privacy</h2>
            <p>
              StreamVault is not intended for children under 13. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Changes will be posted on this page with an updated revision date.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Contact Us</h2>
            <p>
              If you have questions about this privacy policy, please contact us through our{" "}
              <a href="/contact" className="text-primary hover:underline">contact page</a>.
            </p>
          </section>

          <section className="mt-12 p-6 bg-muted rounded-lg">
            <h3 className="text-xl font-semibold mb-3">GDPR Compliance</h3>
            <p>
              For users in the European Union, we comply with GDPR regulations. You have the right to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Request a copy of your data</li>
              <li>Request deletion of your data</li>
              <li>Object to data processing</li>
              <li>Data portability</li>
            </ul>
          </section>

          {/* Ad Banner */}
          <AdBanner />
        </div>
      </div>
    </div>
  );
}
