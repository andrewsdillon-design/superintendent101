export const metadata = {
  title: 'Privacy Policy | ProFieldHub',
}

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#0a1628] text-gray-300 px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-10">Effective Date: February 24, 2026</p>

      <section className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">1. Who We Are</h2>
          <p>ProFieldHub ("we", "us", "our") operates the platform at profieldhub.com, a construction management and field documentation tool built for superintendents and project managers.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">2. Information We Collect</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-white">Account data:</strong> name, email address, username, and password (hashed — never stored in plain text)</li>
            <li><strong className="text-white">Profile data:</strong> location, bio, skills, years of experience</li>
            <li><strong className="text-white">Field logs:</strong> project name, address, tags, and structured log content you create</li>
            <li><strong className="text-white">Audio:</strong> voice recordings submitted for transcription are sent to OpenAI Whisper and are never stored on our servers</li>
            <li><strong className="text-white">Integration tokens:</strong> OAuth tokens for Notion and Google Drive, stored encrypted in our database</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>To provide and operate the ProFieldHub platform</li>
            <li>To transcribe and structure your field logs using OpenAI</li>
            <li>To sync your logs to Notion or Google Drive when you enable those integrations</li>
            <li>To authenticate your account and protect access to your data</li>
            <li>To contact you about your account if necessary</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">4. Third-Party Services</h2>
          <p className="mb-2">We use the following third-party services to operate the platform:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-white">OpenAI</strong> — audio transcription (Whisper) and log structuring (GPT-4o). Audio is processed in memory and not retained by us. See OpenAI's privacy policy at openai.com/privacy.</li>
            <li><strong className="text-white">Notion</strong> — optional integration to sync your logs to your own Notion workspace. We store your OAuth token to enable this.</li>
            <li><strong className="text-white">Google Drive</strong> — optional integration to upload logs to your own Google Drive. We store your OAuth token to enable this.</li>
            <li><strong className="text-white">Neon</strong> — our PostgreSQL database provider. Your data is stored on Neon-managed infrastructure.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">5. Data Retention</h2>
          <p>We retain your account and log data for as long as your account is active. You may request deletion of your account and all associated data at any time by contacting us.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">6. Data Security</h2>
          <p>Passwords are hashed using bcrypt and never stored in plain text. OAuth tokens are stored in a secured database. We use HTTPS for all data in transit.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">7. Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at the email below.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibent text-white mb-2">8. Contact</h2>
          <p>Questions about this policy? Email us at <a href="mailto:support@profieldhub.com" className="text-cyan-400 underline">support@profieldhub.com</a>.</p>
        </div>
      </section>
    </main>
  )
}
