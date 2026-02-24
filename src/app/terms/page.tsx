export const metadata = {
  title: 'Terms of Use | ProFieldHub',
}

export default function TermsOfUse() {
  return (
    <main className="min-h-screen bg-[#0a1628] text-gray-300 px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Terms of Use</h1>
      <p className="text-sm text-gray-500 mb-10">Effective Date: February 24, 2026</p>

      <section className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">1. Acceptance of Terms</h2>
          <p>By creating an account or using ProFieldHub ("the Service"), you agree to these Terms of Use. If you do not agree, do not use the Service.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">2. Description of Service</h2>
          <p>ProFieldHub is a field documentation and construction management platform for superintendents and project managers. Features include voice-to-text daily logs, AI structuring, project tracking, mentorship, and integrations with Notion and Google Drive.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">3. Eligibility</h2>
          <p>You must be at least 18 years old and capable of entering a binding agreement to use this Service. By registering, you represent that you meet these requirements.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">4. Account Responsibilities</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>You are responsible for maintaining the security of your account credentials</li>
            <li>You are responsible for all activity that occurs under your account</li>
            <li>You must provide accurate information when registering</li>
            <li>You must notify us immediately of any unauthorized access to your account</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">5. Acceptable Use</h2>
          <p className="mb-2">You agree not to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Use the Service for any unlawful purpose</li>
            <li>Upload content that is abusive, harmful, or violates any third-party rights</li>
            <li>Attempt to reverse engineer, scrape, or disrupt the platform</li>
            <li>Share your account credentials with others</li>
            <li>Use the AI features to generate false or fraudulent field documentation</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">6. Subscriptions and Billing</h2>
          <p>Certain features (including Daily Logs AI) require a paid subscription. Subscription fees are billed in advance. Refunds are not provided for partial billing periods. We reserve the right to change pricing with 30 days notice.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">7. AI-Generated Content</h2>
          <p>ProFieldHub uses OpenAI to transcribe and structure your field logs. AI output may contain errors. You are responsible for reviewing all AI-generated content before relying on it for any official documentation, safety records, or compliance purposes.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">8. Third-Party Integrations</h2>
          <p>Integrations with Notion and Google Drive are provided as a convenience. We are not responsible for the availability or behavior of third-party services. Disconnecting an integration does not delete data already synced to those platforms.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">9. Intellectual Property</h2>
          <p>You retain ownership of all content you create on ProFieldHub. By using the Service, you grant us a limited license to store and process your content solely to provide the Service.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">10. Termination</h2>
          <p>We reserve the right to suspend or terminate your account for violations of these Terms. You may cancel your account at any time. Upon termination, your data will be deleted within 30 days.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">11. Disclaimer of Warranties</h2>
          <p>The Service is provided "as is" without warranties of any kind. We do not guarantee uptime, accuracy of AI output, or fitness for any particular purpose.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">12. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, ProFieldHub shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">13. Changes to Terms</h2>
          <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">14. Contact</h2>
          <p>Questions about these Terms? Email us at <a href="mailto:support@profieldhub.com" className="text-cyan-400 underline">support@profieldhub.com</a>.</p>
        </div>
      </section>
    </main>
  )
}
