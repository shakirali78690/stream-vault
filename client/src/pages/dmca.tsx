import { Mail, AlertTriangle } from "lucide-react";
import { SEO } from "@/components/seo";
import { AdBanner } from "@/components/ad-banner";

export default function DMCA() {
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="DMCA Policy"
        description="StreamVault's DMCA policy. Learn how to report copyright infringement and our process for handling takedown requests."
        canonical="https://streamvault.live/dmca"
      />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">DMCA Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Important Notice</h3>
              <p className="text-sm">
                StreamVault respects the intellectual property rights of others and expects its users to do the same. 
                We respond to notices of alleged copyright infringement that comply with the Digital Millennium Copyright Act (DMCA).
              </p>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Copyright Infringement Notice</h2>
            <p>
              If you believe that your copyrighted work has been copied in a way that constitutes copyright 
              infringement and is accessible on StreamVault, please notify our copyright agent as set forth below.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">DMCA Takedown Request</h2>
            <p>
              For your complaint to be valid under the DMCA, you must provide the following information in writing:
            </p>
            <ol className="list-decimal pl-6 space-y-3">
              <li>
                <strong>Identification of the copyrighted work:</strong> A description of the copyrighted work 
                that you claim has been infringed.
              </li>
              <li>
                <strong>Location of infringing material:</strong> The URL or other specific location on StreamVault 
                where the material you claim is infringing is located.
              </li>
              <li>
                <strong>Your contact information:</strong> Your name, address, telephone number, and email address.
              </li>
              <li>
                <strong>Good faith statement:</strong> A statement that you have a good faith belief that the 
                disputed use is not authorized by the copyright owner, its agent, or the law.
              </li>
              <li>
                <strong>Accuracy statement:</strong> A statement, made under penalty of perjury, that the above 
                information in your notice is accurate and that you are the copyright owner or authorized to act 
                on the copyright owner's behalf.
              </li>
              <li>
                <strong>Physical or electronic signature:</strong> An electronic or physical signature of the 
                person authorized to act on behalf of the owner of the copyright interest.
              </li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">How to Submit a DMCA Notice</h2>
            <div className="p-6 bg-card border border-border rounded-lg">
              <div className="flex items-start gap-4 mb-4">
                <Mail className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Copyright Agent Contact</h3>
                  <p className="mb-2">Send your DMCA notice to:</p>
                  <div className="space-y-1 text-sm">
                    <p><strong>Email:</strong> <a href="mailto:contact@streamvault.live" className="text-primary hover:underline">contact@streamvault.live</a></p>
                    <p><strong>Subject Line:</strong> DMCA Takedown Request</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Please allow 24-48 hours for us to process your request.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Counter-Notification</h2>
            <p>
              If you believe that your content was removed by mistake or misidentification, you may file a 
              counter-notification with us. To be effective, a counter-notification must include:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your physical or electronic signature</li>
              <li>Identification of the material that has been removed and the location where it appeared</li>
              <li>A statement under penalty of perjury that you have a good faith belief that the material was removed as a result of mistake or misidentification</li>
              <li>Your name, address, and telephone number</li>
              <li>A statement that you consent to the jurisdiction of the federal court in your district</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Repeat Infringer Policy</h2>
            <p>
              In accordance with the DMCA and other applicable law, StreamVault has adopted a policy of 
              terminating, in appropriate circumstances, users who are deemed to be repeat infringers.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Content Hosting Disclaimer</h2>
            <p>
              StreamVault does not host any video content on its servers. All content is embedded from 
              third-party sources such as Google Drive and other video hosting platforms. We act as a search 
              engine and aggregator of publicly available content.
            </p>
            <p>
              If you are a copyright owner and believe that content accessible through StreamVault infringes 
              your copyright, please contact us immediately with a proper DMCA notice, and we will remove 
              the links to the infringing content.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Response Time</h2>
            <p>
              We take copyright infringement seriously and will respond to all valid DMCA notices within 
              24-48 hours. Upon receiving a valid notice, we will:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Remove or disable access to the allegedly infringing material</li>
              <li>Notify the user who posted the material</li>
              <li>Provide the user with a copy of the DMCA notice</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">False Claims</h2>
            <p>
              Please note that under Section 512(f) of the DMCA, any person who knowingly materially 
              misrepresents that material or activity is infringing may be subject to liability for damages.
            </p>
          </section>

          <section className="mt-12 p-6 bg-muted rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Need Help?</h3>
            <p className="mb-4">
              If you have questions about our DMCA policy or need assistance with filing a notice, 
              please contact us through our{" "}
              <a href="/contact" className="text-primary hover:underline">contact page</a>.
            </p>
            <p className="text-sm text-muted-foreground">
              We are committed to protecting intellectual property rights and will work with copyright 
              owners to resolve any issues promptly.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
