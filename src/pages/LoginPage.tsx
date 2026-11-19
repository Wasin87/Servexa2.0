import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/common/Logo';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { ArrowRight, Eye, EyeOff, AlertCircle, LogOut, LayoutDashboard } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { currentUser, login, loginWithGoogle, redirectAuthUser, clearRedirectAuthUser, logout } =
    useAuth();
  const { isBangla } = useLanguage();
  const { showToast, triggerConfettiBurst } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigateByRole = (role: string) => {
    if (role === 'TECHNICIAN') navigate('/technician/dashboard');
    else if (role === 'ADMIN') navigate('/admin/dashboard');
    else navigate('/customer/dashboard');
  };

  useEffect(() => {
    if (!redirectAuthUser) return;
    triggerConfettiBurst();
    showToast(
      isBangla
        ? `স্বাগতম, ${redirectAuthUser.name}! লগইন সফল হয়েছে 🎉`
        : `Welcome back, ${redirectAuthUser.name}! Signed in 🎉`,
      'success'
    );
    const signedUser = redirectAuthUser;
    clearRedirectAuthUser();
    navigateByRole(signedUser.role);
  }, [redirectAuthUser]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await login(email, password);
    setIsSubmitting(false);

    if (!res.success || !res.user) {
      setErrorMsg(
        res.error || (isBangla ? 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।' : 'Invalid email or password.')
      );
      return;
    }

    triggerConfettiBurst();
    showToast(
      isBangla ? `স্বাগতম, ${res.user.name}! লগইন সফল হয়েছে 🎉` : `Welcome back, ${res.user.name}! Signed in 🎉`,
      'success'
    );
    navigateByRole(res.user.role);
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await loginWithGoogle();
    if (res.redirected) {
      return;
    }
    setIsSubmitting(false);

    if (!res.success || !res.user) {
      setErrorMsg(
        res.error ||
          (isBangla ? 'Google লগইন সম্পন্ন করা যায়নি।' : 'Google login could not be completed.')
      );
      return;
    }

    triggerConfettiBurst();
    showToast(
      isBangla ? `স্বাগতম, ${res.user.name}! লগইন সফল হয়েছে 🎉` : `Welcome, ${res.user.name}! Signed in 🎉`,
      'success'
    );
    navigateByRole(res.user.role);
  };

  if (currentUser) {
    return (
      <div className="py-12 max-w-md mx-auto px-4 sm:px-6">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-5 text-center">
          <Logo size="lg" className="justify-center" />
          <h1 className="text-lg font-extrabold text-zinc-900 dark:text-white">
            {isBangla ? 'আপনি ইতিমধ্যে লগইন আছেন' : 'Already Signed In'}
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {isBangla
              ? `বর্তমান একাউন্ট: ${currentUser.name} (${currentUser.role})। রোল বা একাউন্ট পরিবর্তন করতে অনুগ্রহ করে আগে লগআউট করুন।`
              : `Currently signed in as ${currentUser.name} (${currentUser.role}). Please sign out first to switch accounts or roles.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => navigateByRole(currentUser.role)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{isBangla ? 'ড্যাশবোর্ডে যান' : 'Go to Dashboard'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                showToast(
                  isBangla ? 'সফলভাবে লগআউট হয়েছে।' : 'Signed out successfully.',
                  'info'
                );
              }}
              className="flex-1 py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{isBangla ? 'লগআউট করুন' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 max-w-md mx-auto px-4 sm:px-6">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <Logo size="lg" className="justify-center" />
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white pt-2">
            {isBangla ? 'Servexa একাউন্টে লগইন করুন' : 'Sign in to Servexa'}
          </h1>
          <p className="text-xs text-zinc-500">
            {isBangla
              ? 'আপনার একাউন্টে প্রবেশ করে সার্ভিস বুকিং পরিচালনা করুন'
              : 'Access your account to manage bookings and services'}
          </p>
        </div>

        {/* Google One-Click Firebase Login */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs hover:border-orange-500 transition-colors flex items-center justify-center gap-2.5 shadow-2xs cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isBangla ? 'Google দিয়ে সাইন ইন করুন' : 'Sign in with Google'}</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-zinc-200 dark:border-zinc-800 w-full" />
          <span className="bg-white dark:bg-zinc-900 px-3 text-[11px] text-zinc-400 absolute">
            {isBangla ? 'অথবা ইমেইল দিয়ে' : 'or with email'}
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {isBangla ? 'ইমেইল বা ফোন নম্বর' : 'Email or Phone'}
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {isBangla ? 'পাসওয়ার্ড' : 'Password'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>
              {isSubmitting
                ? isBangla
                  ? 'লগইন হচ্ছে...'
                  : 'Signing in...'
                : isBangla
                  ? 'লগইন করুন'
                  : 'Sign In'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <span>{isBangla ? 'নতুন ব্যবহারকারী? ' : 'New to Servexa? '}</span>
          <Link to="/register" className="font-bold text-orange-600 hover:text-orange-500 underline ml-1">
            {isBangla ? 'এখানে রেজিস্ট্রেশন করুন' : 'Register here'}
          </Link>
        </div>
      </div>
    </div>
  );
};
