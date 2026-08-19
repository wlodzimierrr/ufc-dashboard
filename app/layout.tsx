import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UFC Fight Prediction Dashboard',
  description: 'Live UFC fight predictions and accuracy analytics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-50">
        <div className="min-h-screen">
          <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <img src="/ufc_analytics_letters_transparent.svg" alt="UFC Analytics Logo" className="h-12" />
                </div>
                <nav className="hidden sm:flex gap-6">
                  <a href="/" className="text-gray-400 hover:text-white transition-colors">
                    Dashboard
                  </a>
                  <a href="/predictions/upcoming" className="text-gray-400 hover:text-white transition-colors">
                    Upcoming
                  </a>
                  <a href="/events" className="text-gray-400 hover:text-white transition-colors">
                    Events
                  </a>
                  <a href="/analytics" className="text-gray-400 hover:text-white transition-colors">
                    Analytics
                  </a>
                  <a href="/betting" className="text-gray-400 hover:text-white transition-colors">
                    Betting
                  </a>
                </nav>
              </div>
            </div>
          </header>

          <main className="flex-1">
            {children}
          </main>

          <footer className="bg-gray-900 border-t border-gray-800 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <p className="text-sm text-gray-500 text-center">
                Made by{" "}
                <a
                  href="https://wlodzimierrr.pl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-700"
                >
                  wlodzimierrr
                </a>
                , Codex and Claude • Powered by calibrated XGBoost model trained on UFCStats data
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
