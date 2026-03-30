import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import './AuthPage.css';

type Mode = 'signin' | 'signup';

interface AuthPageProps {
  /** Called when sign-in succeeds (session already set by listener in App) */
  onSignIn(): void;
  /** Called when sign-up succeeds — triggers profile setup */
  onSignUp(): void;
}

export function AuthPage({ onSignIn, onSignUp }: AuthPageProps) {
  const [mode, setMode]       = useState<Mode>('signup');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      onSignUp();
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      onSignIn();
    }

    setLoading(false);
  };

  const toggle = () => {
    setMode((m) => (m === 'signup' ? 'signin' : 'signup'));
    setError(null);
  };

  const content = (
    <div className="auth-root">
      <div className="auth-paper">
        {/* Brand mark */}
        <div className="auth-brand">
          <FeatherMark />
          <span className="auth-brand-name">BirdDex</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            <h1 className="auth-heading">
              {mode === 'signup' ? 'Start your field journal' : 'Welcome back'}
            </h1>
            <p className="auth-sub">
              {mode === 'signup'
                ? 'Create an account to save your sightings and find birding friends.'
                : 'Sign in to pick up where you left off.'}
            </p>
          </motion.div>
        </AnimatePresence>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="auth-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="auth-input"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPass(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 6 characters' : ''}
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                className="auth-error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button className="auth-btn-primary" type="submit" disabled={loading || !email || !password}>
            {loading
              ? 'Please wait…'
              : mode === 'signup'
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        <button className="auth-toggle" type="button" onClick={toggle}>
          {mode === 'signup'
            ? 'Already have an account? Sign in'
            : "Don't have an account? Sign up"}
        </button>

        {mode === 'signin' && (
          <button
            className="auth-forgot"
            type="button"
            onClick={async () => {
              if (!email) { setError('Enter your email first.'); return; }
              const { error: err } = await supabase.auth.resetPasswordForEmail(email);
              setError(err ? err.message : 'Check your email for a reset link.');
            }}
          >
            Forgot password?
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

function FeatherMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.5 3C20.5 3 14 4 10 8C6 12 5 19 5 19L8 16C9 17 10.5 18 12 18C16 18 20.5 10 20.5 3Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      />
      <path d="M5 19C5 19 8 13 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
