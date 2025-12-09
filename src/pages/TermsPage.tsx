import { Link } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { FileText, ArrowRight } from 'lucide-react'

export default function TermsPage() {
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
                Terms of Service
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-text mt-6 font-sans leading-[0.95]">
                Terms of Service
              </h1>

              <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto mt-6 leading-relaxed">
                Last updated: December 2025. Please read these terms carefully before using NutriScope.
              </p>
            </div>
          </section>

          {/* Content Section */}
          <section className="border-t border-border bg-surface/30 relative">
            <div className="max-w-4xl mx-auto pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
              <div className="prose prose-lg max-w-none">
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">1. Acceptance of Terms</h2>
                    <p className="text-base text-dim font-mono leading-relaxed">
                      By accessing or using NutriScope, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this service.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">2. Description of Service</h2>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      NutriScope is an AI-powered health and fitness tracking application that provides:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-base text-dim font-mono ml-4">
                      <li>Meal and nutrition logging with AI assistance</li>
                      <li>Workout tracking with exercise library and METs-based calorie calculation</li>
                      <li>Water intake and weight tracking</li>
                      <li>Analytics and data visualization</li>
                      <li>AI chat assistant with voice and image support</li>
                      <li>Daily summaries and insights</li>
                    </ul>
                    <p className="text-base text-dim font-mono leading-relaxed mt-4">
                      Permission is granted to use NutriScope for personal, non-commercial use only. This license does not include modifying, copying, reverse engineering, or using the service for commercial purposes.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">3. User Accounts</h2>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      When you create an account with us, you must provide accurate, complete, and current information. You are responsible for:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-base text-dim font-mono ml-4">
                      <li>Maintaining the security of your account and password</li>
                      <li>All activities that occur under your account</li>
                      <li>Notifying us immediately of any unauthorized use</li>
                      <li>Ensuring you are at least 13 years old to use the service</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">4. User Content</h2>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      You retain ownership of any content you submit, post, or display on NutriScope. By submitting content, you grant us a license to:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-base text-dim font-mono ml-4">
                      <li>Use, reproduce, and modify your content to provide our services</li>
                      <li>Display your content on NutriScope</li>
                      <li>Generate insights and analytics based on your data</li>
                    </ul>
                    <p className="text-base text-dim font-mono leading-relaxed mt-4">
                      You are responsible for ensuring your content does not violate any laws or infringe on the rights of others.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">5. Prohibited Uses</h2>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      You agree not to:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-base text-dim font-mono ml-4">
                      <li>Use the service for any illegal purpose</li>
                      <li>Violate any laws in your jurisdiction</li>
                      <li>Transmit any worms, viruses, or malicious code</li>
                      <li>Attempt to gain unauthorized access to our systems</li>
                      <li>Interfere with or disrupt the service</li>
                      <li>Use automated systems to access the service without permission</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">6. Health Information Disclaimer</h2>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      <strong className="text-text">Important:</strong> NutriScope is not a medical service. The information provided is for general health and fitness purposes only and should not be considered medical advice.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-base text-dim font-mono ml-4 mb-4">
                      <li>Always consult with a healthcare professional before making significant changes to your diet or exercise routine</li>
                      <li>Nutrition and calorie information are estimates and may not be 100% accurate</li>
                      <li>AI-generated insights are suggestions, not medical recommendations</li>
                      <li>We are not responsible for any health outcomes resulting from use of this service</li>
                    </ul>
                    <p className="text-base text-dim font-mono leading-relaxed">
                      NutriScope is provided "as is" without any warranties, expressed or implied. We do not guarantee that the service will be uninterrupted, error-free, or that results will be accurate or reliable.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">7. AI Features</h2>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      NutriScope uses AI services (OpenAI) for various features:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-base text-dim font-mono ml-4 mb-4">
                      <li>AI responses are generated by third-party services and may contain errors</li>
                      <li>We are not responsible for the accuracy of AI-generated content</li>
                      <li>AI features may be unavailable due to service outages or API limits</li>
                      <li>Your data sent to AI services is used only for processing your requests</li>
                    </ul>
                    <p className="text-base text-dim font-mono leading-relaxed">
                      You acknowledge that AI features are provided "as is" and may not always be accurate or available.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">8. Limitation of Liability</h2>
                    <p className="text-base text-dim font-mono leading-relaxed">
                      In no event shall NutriScope or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use NutriScope, even if we have been notified of the possibility of such damage.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">9. Termination</h2>
                    <p className="text-base text-dim font-mono leading-relaxed">
                      We may terminate or suspend your account and access to the service immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">10. Changes to Terms</h2>
                    <p className="text-base text-dim font-mono leading-relaxed">
                      We reserve the right to modify these terms at any time. We will notify users of any material changes by posting the new Terms of Service on this page and updating the "Last updated" date. Your continued use of the service after such changes constitutes acceptance of the new terms.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">11. Contact</h2>
                    <p className="text-base text-dim font-mono leading-relaxed">
                      If you have any questions about these Terms of Service, please contact us at{' '}
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

