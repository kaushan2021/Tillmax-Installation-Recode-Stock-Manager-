import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../firebase';
import { useAuth } from '../AuthProvider';
import { Logo } from './Logo';

export const Login = () => {
  const { user, profile, loading, login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (user && profile) {
      navigate('/');
    }
  }, [user, profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSent(false);
    setIsLoggingIn(true);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error("Login failed", err);
      if (err.code === 'auth/too-many-requests') {
        setError("Too many failed login attempts. Your account has been temporarily locked for security. Please try again in a few minutes or reset your password.");
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        if (email === 'pasi@tillmax.co.uk') {
          setError("Admin account not found or invalid credentials. If this is your first time, click below to bootstrap the system.");
        } else {
          setError("Invalid email or password. Please check your credentials and try again.");
        }
      } else {
        setError(err.message || "An unexpected error occurred during sign in.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleBootstrap = async () => {
    if (email !== 'pasi@tillmax.co.uk') return;
    setIsBootstrapping(true);
    setError(null);
    try {
      const { createUserWithEmailAndPassword } = await import('../firebase');
      await createUserWithEmailAndPassword(auth, email, password);
      // AuthProvider will handle profile creation
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("This admin account already exists. Please use the correct password to sign in. If you forgot it, use the 'Forgot Password' button.");
      } else {
        setError(err.message);
      }
    } finally {
      setIsBootstrapping(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) return setError("Please enter your email address first.");
    setIsResetting(true);
    setError(null);
    try {
      const { sendPasswordResetEmail } = await import('../firebase');
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-tillmax-blue mb-6"></div>
      <p className="text-slate-500 font-medium animate-pulse">Authenticating...</p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl shadow-slate-200 p-10 text-center border border-slate-100"
      >
        <Logo className="justify-center mb-10 scale-125" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h2>
        <p className="text-slate-500 mb-8">Sign in with your Tillmax credentials.</p>
        
        {user && !profile ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Access Denied</p>
              <p>Your account ({user.email}) is not authorized to access this system. Please contact an administrator.</p>
              <button onClick={logout} className="mt-2 font-bold underline">Sign Out</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Email Address</label>
              <input 
                type="email" 
                required
                className="input-field w-full" 
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Password</label>
              <input 
                type="password" 
                required
                className="input-field w-full" 
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {resetSent && (
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Password reset email sent! Please check your inbox.
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-tillmax-blue hover:bg-tillmax-blue/90 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-tillmax-blue/20 disabled:opacity-50"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="flex justify-center">
              <button 
                type="button"
                onClick={handleForgotPassword}
                disabled={isResetting}
                className="text-xs font-bold text-slate-400 hover:text-tillmax-blue transition-colors disabled:opacity-50"
              >
                {isResetting ? 'Sending...' : 'Forgot Password?'}
              </button>
            </div>

            {error?.includes('bootstrap') && (
              <button 
                type="button"
                onClick={handleBootstrap}
                disabled={isBootstrapping}
                className="w-full mt-4 border-2 border-tillmax-blue text-tillmax-blue hover:bg-tillmax-blue hover:text-white font-bold py-3 px-6 rounded-2xl transition-all disabled:opacity-50"
              >
                {isBootstrapping ? 'Bootstrapping...' : 'Create First Admin Account'}
              </button>
            )}
          </form>
        )}
        
        <div className="mt-10 pt-8 border-t border-slate-100">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Tillmax LTD &copy; 2026</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
