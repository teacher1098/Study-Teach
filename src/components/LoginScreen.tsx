import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon,
  CheckCircle2,
} from 'lucide-react';

/**
 * Approved access keys repository.
 * Supports email IDs, phone numbers, and username handles.
 */
export const APPROVED_ACCESS_KEYS: Record<string, string> = {
  'test@school.com': 'KEY-2026',
  'demo': 'PASS-1234',
  'teacher1098@gmail.com': 'TEACH-2026',
  'admin@edu.org': 'MASTER-9999',
  'instructor@stem.edu': 'STEM-2026',
  '+1-555-0199': 'KEY-5555',
  '9876543210': 'KEY-9876',
};

export interface SessionData {
  identifier: string;
  loggedInAt: string;
}

interface LoginScreenProps {
  onLoginSuccess: (session: SessionData) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  isDarkMode,
  onToggleTheme,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanId = identifier.trim();
    const cleanKey = accessKey.trim();

    if (!cleanId || !cleanKey) {
      setErrorMessage('Please provide both your Email / Phone Number and your Access Key.');
      return;
    }

    setIsSubmitting(true);

    // Validate against approved list of keys
    // Normalize identifier to lower case for case-insensitive matching
    const normalizedTarget = cleanId.toLowerCase();
    const matchedKeyEntry = Object.entries(APPROVED_ACCESS_KEYS).find(
      ([approvedId]) => approvedId.trim().toLowerCase() === normalizedTarget
    );

    if (matchedKeyEntry && matchedKeyEntry[1] === cleanKey) {
      // Valid credentials!
      const session: SessionData = {
        identifier: matchedKeyEntry[0], // canonical ID
        loggedInAt: new Date().toISOString(),
      };
      // Save session in localStorage
      try {
        localStorage.setItem('study_companion_session', JSON.stringify(session));
      } catch (err) {
        console.error('Failed to save session to localStorage:', err);
      }
      setIsSubmitting(false);
      onLoginSuccess(session);
    } else {
      // Invalid credentials
      setIsSubmitting(false);
      setErrorMessage('Invalid identifier or access key. Please verify your credentials and try again.');
    }
  };

  const fillQuickDemo = (id: string, key: string) => {
    setIdentifier(id);
    setAccessKey(key);
    setErrorMessage(null);
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors duration-200 ${
        isDarkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
      }`}
    >
      {/* Header bar */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-zinc-800/60 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-md shadow-cyan-500/10">
            <div className="w-full h-full bg-zinc-950 rounded-[6px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white">Lyra Study & Teaching</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-400 border border-zinc-700">
                Gatekeeper
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition"
            title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            type="button"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Gatekeeper Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all">
            {/* Shield Icon & Badge */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-3 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
                Authorized Access Required
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xs">
                Enter your approved Email ID or Phone Number along with your Access Key to unlock the companion workspace.
              </p>
            </div>

            {/* Error Message banner */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-snug">{errorMessage}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Email ID or Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="e.g. test@school.com or demo"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/70 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 transition outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Access Key
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showKey ? 'text' : 'password'}
                    required
                    value={accessKey}
                    onChange={(e) => {
                      setAccessKey(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Enter security access key"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-2.5 bg-zinc-950/70 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 font-mono transition outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition"
                    title={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50"
              >
                <span>Unlock Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Credentials Panel */}
            <div className="mt-6 pt-5 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2.5">
                <span className="font-medium text-zinc-300">Quick Test Credentials</span>
                <span className="text-[11px] text-zinc-500">Click to autofill</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => fillQuickDemo('test@school.com', 'KEY-2026')}
                  className="w-full text-left px-3 py-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-cyan-500/40 text-xs font-mono text-zinc-300 flex items-center justify-between transition group"
                >
                  <span className="truncate">test@school.com</span>
                  <span className="text-cyan-400 font-semibold group-hover:underline">KEY-2026</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickDemo('demo', 'PASS-1234')}
                  className="w-full text-left px-3 py-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-cyan-500/40 text-xs font-mono text-zinc-300 flex items-center justify-between transition group"
                >
                  <span className="truncate">demo</span>
                  <span className="text-cyan-400 font-semibold group-hover:underline">PASS-1234</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickDemo('teacher1098@gmail.com', 'TEACH-2026')}
                  className="w-full text-left px-3 py-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-cyan-500/40 text-xs font-mono text-zinc-300 flex items-center justify-between transition group"
                >
                  <span className="truncate">teacher1098@gmail.com</span>
                  <span className="text-cyan-400 font-semibold group-hover:underline">TEACH-2026</span>
                </button>
              </div>
            </div>
          </div>

          {/* Security note below card */}
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Session stored securely in local browser storage</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-3 px-6 text-center text-xs text-zinc-600 border-t border-zinc-800/40">
        Live AI Study & Teaching Companion · Multimodal Socratic Question & Paper Generator
      </footer>
    </div>
  );
};
