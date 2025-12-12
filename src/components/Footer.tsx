import { Link } from 'react-router-dom'
import { ThemeSwitcher } from './ThemeSwitcher'

export function Footer() {
  return (
    <footer className="text-text bg-surface border-t border-border relative">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Brand & Description */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-flex items-center gap-0">
              <span className="text-lg tracking-tight font-semibold font-sans text-text flex items-center">
                NutriSc
                <span className="relative inline-block ml-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-teal-500 shadow-md shadow-orange-500/30"></span>
                pe
              </span>
            </Link>
            <p className="mt-4 text-sm text-dim font-mono max-w-sm leading-relaxed">
              AI-powered health tracking platform. Track meals, workouts, water, and weight. Plan meals, manage recipes, and unlock achievements with advanced analytics—all in one place.
            </p>
          </div>

          {/* Links Grid */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-6">
            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold text-text font-mono tracking-tight">
                Product
              </h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link
                    to="/product"
                    className="text-sm !text-blue-500 dark:!text-blue-400 hover:!text-blue-600 dark:hover:!text-blue-300 transition font-mono"
                  >
                    How it works
                  </Link>
                </li>
                <li>
                  <Link
                    to="/about"
                    className="text-sm !text-blue-500 dark:!text-blue-400 hover:!text-blue-600 dark:hover:!text-blue-300 transition font-mono"
                  >
                    About
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-sm font-semibold text-text font-mono tracking-tight">
                Resources
              </h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link
                    to="/documentation"
                    className="text-sm !text-blue-500 dark:!text-blue-400 hover:!text-blue-600 dark:hover:!text-blue-300 transition font-mono"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    to="/help"
                    className="text-sm !text-blue-500 dark:!text-blue-400 hover:!text-blue-600 dark:hover:!text-blue-300 transition font-mono"
                  >
                    Help Center
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-sm font-semibold text-text font-mono tracking-tight">
                Legal
              </h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link
                    to="/privacy"
                    className="text-sm !text-blue-500 dark:!text-blue-400 hover:!text-blue-600 dark:hover:!text-blue-300 transition font-mono"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-sm !text-blue-500 dark:!text-blue-400 hover:!text-blue-600 dark:hover:!text-blue-300 transition font-mono"
                  >
                    Terms
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cookies"
                    className="text-sm !text-blue-500 dark:!text-blue-400 hover:!text-blue-600 dark:hover:!text-blue-300 transition font-mono"
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2">
              <p className="text-xs text-dim font-mono whitespace-nowrap">
              © {new Date().getFullYear()} NutriScope. All rights reserved.
            </p>
              <div className="flex items-center gap-2 text-xs text-dim font-mono whitespace-nowrap">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-success flex-shrink-0 animate-pulse"></span>
                <span>All systems normal</span>
              </div>
            </div>
            <div className="flex items-center">
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
