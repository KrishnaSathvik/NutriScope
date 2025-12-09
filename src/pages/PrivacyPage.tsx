import { Link } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ShieldCheck, ArrowRight } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-void relative">
      {/* Background */}
      <div className="fixed top-0 w-full -z-10 h-screen">
        <div className="absolute inset-0 bg-gradient-to-br from-void via-acid/5 to-acid/10"></div>
      </div>

      <div className="relative z-20">
        <Header />

        <main className="relative">
          {/* Hero Section */}
          <section className="max-w-7xl mx-auto pt-16 sm:pt-24 lg:pt-32 xl:pt-40 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 lg:pb-32 xl:pb-40">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 text-xs text-dim font-mono bg-surface/50 border border-border rounded-full px-3 py-1.5 backdrop-blur-md mb-6">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-acid"></span>
                Privacy Policy
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-text mt-6 font-sans leading-[0.95]">
                Your privacy is our priority
              </h1>

              <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto mt-6 leading-relaxed">
                Last updated: December 2025. We are committed to protecting your personal information and being transparent about how we collect, use, and share your data.
              </p>
            </div>
          </section>

          {/* Content Section */}
          <section className="border-t border-border bg-surface/30 relative">
            <div className="max-w-4xl mx-auto pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
              <div className="prose prose-lg max-w-none">
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">1. Information We Collect</h2>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      We collect information that you provide directly to us when you use NutriScope:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-base text-dim font-mono ml-4">
                      <li>Account information (email address, password)</li>
                      <li>Profile information (goals, dietary preferences, activity level)</li>
                      <li>Health and fitness data (meals, workouts, water intake, nutrition logs)</li>
                      <li>Usage data (how you interact with our services)</li>
                      <li>Device information (browser type, IP address, device identifiers)</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">2. How We Use Your Information</h2>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      We use the information we collect to:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-base text-dim font-mono ml-4">
                      <li>Provide, maintain, and improve our services</li>
                      <li>Process your meal and workout logs</li>
                      <li>Generate personalized insights and analytics</li>
                      <li>Enable AI-powered features like chat assistance</li>
                      <li>Send you important updates about our services</li>
                      <li>Respond to your questions and provide customer support</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">3. Data Storage and Security</h2>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      Your health data is encrypted and stored securely using industry-standard security measures:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-base text-dim font-mono ml-4">
                      <li>Data is encrypted in transit using TLS/SSL</li>
                      <li>Data is encrypted at rest in our secure databases</li>
                      <li>We use Supabase for secure backend infrastructure</li>
                      <li>Access to your data is restricted to authorized personnel only</li>
                      <li>We regularly update our security practices to protect against threats</li>
                    </ul>
                    <p className="text-base text-dim font-mono leading-relaxed mt-4 mb-4">
                      <strong className="text-text">Security Best Practices:</strong> We follow industry best practices including regular security audits, vulnerability assessments, secure coding practices, access logging and monitoring, and incident response procedures.
                    </p>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      <strong className="text-text">Your Role in Security:</strong> You can help keep your account secure by using a strong, unique password, not sharing your account credentials, logging out when using shared devices, keeping your email account secure, and reporting any suspicious activity immediately.
                    </p>
                    <p className="text-base text-dim font-mono leading-relaxed">
                      <strong className="text-text">Data Breach Response:</strong> In the unlikely event of a data breach, we will notify affected users as soon as possible and take immediate steps to secure the system. We maintain incident response procedures and regularly test our security measures.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">4. Data Sharing and Disclosure</h2>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-base text-dim font-mono ml-4">
                      <li>With your explicit consent</li>
                      <li>To comply with legal obligations or court orders</li>
                      <li>To protect our rights, privacy, safety, or property</li>
                      <li>With service providers who assist us in operating our services (under strict confidentiality agreements)</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">5. Your Rights and Choices</h2>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      You have the right to:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-base text-dim font-mono ml-4">
                      <li>Access your personal data at any time</li>
                      <li>Correct or update your information</li>
                      <li>Delete your account and all associated data</li>
                      <li>Export your data (coming soon)</li>
                      <li>Opt out of certain data processing activities</li>
                      <li>Withdraw consent where processing is based on consent</li>
                    </ul>
                    <p className="text-base text-dim font-mono leading-relaxed mt-6 mb-4">
                      <strong className="text-text">GDPR Compliance:</strong> For users in the European Union, we comply with the General Data Protection Regulation (GDPR). This includes your right to access, rectification, erasure ("right to be forgotten"), data portability, objection to processing, and restriction of processing.
                    </p>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      <strong className="text-text">CCPA Compliance:</strong> For California residents, we comply with the California Consumer Privacy Act (CCPA), providing your right to know what personal information is collected, right to delete personal information, right to opt-out of sale of personal information, right to non-discrimination, and transparent privacy notices.
                    </p>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      <strong className="text-text">Health Data Protection:</strong> We recognize that health data is particularly sensitive. We implement additional safeguards to protect your health information, including enhanced encryption, strict access controls, and regular security audits.
                    </p>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      <strong className="text-text">International Data Transfers:</strong> Your data may be processed and stored in the United States or other countries. We ensure that appropriate safeguards are in place to protect your data in accordance with applicable data protection laws, including standard contractual clauses where required.
                    </p>
                    <p className="text-base text-dim font-mono leading-relaxed">
                      <strong className="text-text">Exercising Your Rights:</strong> To exercise your rights under GDPR, CCPA, or other applicable laws, you can access your data through your account settings, request data deletion through account settings or by contacting support, export your data (feature coming soon), or contact us through our Help Center for assistance.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">6. Third-Party Services</h2>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      We use the following third-party services that may collect information:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-base text-dim font-mono ml-4">
                      <li><strong className="text-text">Supabase</strong>: Database, authentication (email + anonymous), and storage services. Your data is encrypted and stored securely with Row Level Security.</li>
                      <li><strong className="text-text">OpenAI</strong>: AI-powered features including GPT-4o-mini for chat, Whisper for voice transcription, and Vision for image analysis. Data sent to OpenAI is used only for processing your requests.</li>
                    </ul>
                    <p className="text-base text-dim font-mono leading-relaxed mt-4">
                      These services have their own privacy policies. We encourage you to review them.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">7. Children's Privacy</h2>
                    <p className="text-base text-dim font-mono leading-relaxed">
                      NutriScope is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">8. Changes to This Policy</h2>
                    <p className="text-base text-dim font-mono leading-relaxed">
                      We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">9. Contact Us</h2>
                    <p className="text-base text-dim font-mono leading-relaxed">
                      If you have any questions about this Privacy Policy or our data practices, please contact us at{' '}
                      <a href="mailto:nutriscopeteam@gmail.com" className="text-acid hover:opacity-80 transition">
                        nutriscopeteam@gmail.com
                      </a>
                      {' '}or through our Help Center.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </main>

        <Footer />
      </div>
    </div>
  )
}

