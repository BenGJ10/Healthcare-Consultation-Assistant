"use client";

import Link from 'next/link';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { motion } from 'framer-motion'; // For subtle animations

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        {/* Navigation */}
        <nav className="flex justify-between items-center mb-12 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h1 className="text-5xl sm:text-5xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-400 text-transparent bg-clip-text">
            HealthLetter
          </h1>
          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 sm:px-6 rounded-lg transition-colors duration-200">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-3 sm:gap-4">
                <Link 
                  href="/product" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 sm:px-6 rounded-lg transition-colors duration-200"
                >
                  Go to App
                </Link>
                <UserButton 
                  showName={true} 
                  appearance={{
                    elements: {
                      userButtonBox: "text-gray-800 dark:text-gray-200",
                      userButtonTrigger: "hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    }
                  }}
                />
              </div>
            </SignedIn>
          </div>
        </nav>

        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-12 sm:py-20"
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-800 dark:text-gray-100 mb-6">
            Streamline Your
            <br />
            <span className="text-blue-600 dark:text-blue-400">Consultation Workflow</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto">
            Empower your practice with AI-driven summaries, actionable next steps, and patient-friendly communications crafted from your consultation notes.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {[
              {
                icon: "🩺",
                title: "AI-Tailored Visit Summaries",
                description: "Convert a doctor’s raw notes into warm, professional summaries patients can easily follow.",
                gradient: "from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-500"
              },
              {
                icon: "🧘",
                title: "Personalized Care Plans",
                description: "Recommends medicines, lifestyle tips, and safe alternatives and more.",
                gradient: "from-teal-500 to-teal-700"
              },
              {
                icon: "📨",
                title: "Seamless Patient Emails",
                description: "Send empathetic, easy-to-understand emails directly to patients.",
                gradient: "from-indigo-500 to-indigo-700"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative group flex"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300`}></div>
                <div className="relative bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex-1 flex flex-col">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm flex-1">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <SignedOut>
            <SignInButton mode="modal">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 sm:px-8 rounded-xl text-lg transition-colors duration-200"
              >
                Get Started
              </motion.button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/product">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 sm:px-8 rounded-xl text-lg transition-colors duration-200"
              >
                Open Consultation Assistant
              </motion.button>
            </Link>
          </SignedIn>
        </motion.div>

        {/* Trust Indicators */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          <p>HIPAA Compliant • Secure Encryption • Trusted by Professionals</p>
        </div>
      </div>
    </main>
  );
}

