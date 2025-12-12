import { SEO } from "@/components/seo";
import { AdBanner } from "@/components/ad-banner";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Terms of Service"
        description="Read StreamVault's Terms of Service. Understand your rights and responsibilities when using our free streaming platform."
        canonical="https://streamvault.live/terms"
      />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
            <p>
              By accessing and using StreamVault ("the Service"), you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Use License</h2>
            <p>
              Permission is granted to temporarily access the materials (information or software) on StreamVault 
              for personal, non-commercial transitory viewing only.
            </p>
            <p>This is the grant of a license, not a transfer of title, and under this license you may not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to reverse engineer any software contained on StreamVault</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. User Conduct</h2>
            <p>You agree to use StreamVault only for lawful purposes. You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Upload, post, or transmit any content that is illegal, harmful, or offensive</li>
              <li>Impersonate any person or entity</li>
              <li>Interfere with or disrupt the service or servers</li>
              <li>Attempt to gain unauthorized access to any portion of the service</li>
              <li>Use any automated means to access the service</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Content</h2>
            <p>
              StreamVault provides access to streaming content. We do not host any content on our servers. 
              All content is embedded from third-party sources. We are not responsible for the content 
              provided by these third-party sources.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Intellectual Property</h2>
            <p>
              All content displayed on StreamVault, including but not limited to text, graphics, logos, 
              and software, is the property of StreamVault or its content suppliers and is protected by 
              copyright and intellectual property laws.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Disclaimer</h2>
            <p>
              The materials on StreamVault are provided on an 'as is' basis. StreamVault makes no warranties, 
              expressed or implied, and hereby disclaims and negates all other warranties including, without 
              limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, 
              or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Limitations</h2>
            <p>
              In no event shall StreamVault or its suppliers be liable for any damages (including, without 
              limitation, damages for loss of data or profit, or due to business interruption) arising out 
              of the use or inability to use the materials on StreamVault.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Accuracy of Materials</h2>
            <p>
              The materials appearing on StreamVault could include technical, typographical, or photographic errors. 
              StreamVault does not warrant that any of the materials on its website are accurate, complete, or current.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Links</h2>
            <p>
              StreamVault has not reviewed all of the sites linked to its website and is not responsible for 
              the contents of any such linked site. The inclusion of any link does not imply endorsement by 
              StreamVault of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Modifications</h2>
            <p>
              StreamVault may revise these terms of service at any time without notice. By using this website, 
              you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">11. Termination</h2>
            <p>
              We reserve the right to terminate or suspend access to our service immediately, without prior 
              notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">12. Governing Law</h2>
            <p>
              These terms and conditions are governed by and construed in accordance with the laws and you 
              irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">13. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us through our{" "}
              <a href="/contact" className="text-primary hover:underline">contact page</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
