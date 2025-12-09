import { Link } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Cookie, ArrowRight } from 'lucide-react'

export default function CookiePolicyPage() {
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
                Cookie Policy
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-text mt-6 font-sans leading-[0.95]">
                Cookie Policy
              </h1>

              <p className="text-base sm:text-lg text-dim font-mono max-w-2xl mx-auto mt-6 leading-relaxed">
                Last updated: December 2025. This policy explains how NutriScope uses cookies and similar technologies.
              </p>
            </div>
          </section>

          {/* Content Section */}
          <section className="border-t border-border bg-surface/30 relative">
            <div className="max-w-4xl mx-auto pt-16 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
              <div className="prose prose-lg max-w-none">
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">What Are Cookies?</h2>
                    <p className="text-base text-dim font-mono leading-relaxed">
                      Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to the website owners.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">How We Use Cookies</h2>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      NutriScope uses cookies for the following purposes:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-base text-dim font-mono ml-4">
                      <li><strong className="text-text">Essential Cookies:</strong> Required for the website to function properly, including user authentication and session management</li>
                      <li><strong className="text-text">Session Cookies:</strong> Maintain your login session while you use NutriScope</li>
                    </ul>
                    <p className="text-base text-dim font-mono leading-relaxed mt-4">
                      These cookies are set automatically by our authentication provider (Supabase) and are necessary for NutriScope to function properly.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">Types of Cookies We Use</h2>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight text-text mb-2 font-sans">Strictly Necessary Cookies</h3>
                        <p className="text-base text-dim font-mono leading-relaxed">
                          These cookies are essential for NutriScope to function. They are set by our authentication provider (Supabase) to manage your login session and authenticate your requests. These cookies cannot be disabled as they are required for the core functionality of the application.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">Third-Party Cookies</h2>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      We use the following third-party service that may set cookies:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-base text-dim font-mono ml-4">
                      <li><strong className="text-text">Supabase:</strong> Our authentication and database provider sets cookies to manage your login session and authenticate your requests to our backend services.</li>
                    </ul>
                    <p className="text-base text-dim font-mono leading-relaxed mt-4">
                      We do not control the setting of these cookies. For more information about Supabase's cookie practices, please refer to their privacy policy.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">Managing Cookies</h2>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      You can control and manage cookies in various ways:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-base text-dim font-mono ml-4">
                      <li><strong className="text-text">Browser Settings:</strong> Most browsers allow you to refuse or accept cookies. You can also delete cookies that have already been set.</li>
                      <li><strong className="text-text">Browser-Specific Instructions:</strong>
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li>Chrome: Settings → Privacy and security → Cookies</li>
                          <li>Firefox: Options → Privacy & Security → Cookies</li>
                          <li>Safari: Preferences → Privacy → Cookies</li>
                          <li>Edge: Settings → Privacy, search, and services → Cookies</li>
                        </ul>
                      </li>
                    </ul>
                    <p className="text-base text-dim font-mono leading-relaxed mt-4">
                      <strong className="text-text">Note:</strong> Disabling cookies may affect the functionality of NutriScope and prevent you from using certain features.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">Local Storage</h2>
                    <p className="text-base text-dim font-mono leading-relaxed mb-4">
                      In addition to cookies, NutriScope uses browser local storage to store:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-base text-dim font-mono ml-4">
                      <li>Your theme preference (dark mode)</li>
                      <li>Chat conversation state</li>
                      <li>Reminder notification preferences</li>
                      <li>UI state and preferences</li>
                    </ul>
                    <p className="text-base text-dim font-mono leading-relaxed mt-4">
                      <strong className="text-text">Note:</strong> Guest mode data is stored in Supabase (not local storage) using anonymous authentication. This data persists across sessions and can be migrated when converting to a full account.
                    </p>
                    <p className="text-base text-dim font-mono leading-relaxed mt-4">
                      This local storage data helps improve performance and maintain your preferences. You can clear local storage through your browser settings at any time.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">Updates to This Policy</h2>
                    <p className="text-base text-dim font-mono leading-relaxed">
                      We may update this Cookie Policy from time to time to reflect changes in technology or legal requirements. We will notify you of any material changes by posting the updated policy on this page.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text mb-4 font-sans">Contact Us</h2>
                    <p className="text-base text-dim font-mono leading-relaxed">
                      If you have any questions about our use of cookies, please contact us at{' '}
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

