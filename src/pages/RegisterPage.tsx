import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/common/Logo';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import {
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { UserRole } from '../types';

export const RegisterPage: React.FC = () => {
  const { currentUser, register, loginWithGoogle, redirectAuthUser, clearRedirectAuthUser, logout } =
    useAuth();
  const { registerNewTechnician } = useApp();
  const { isBangla } = useLanguage();
  const { showToast, triggerConfettiBurst } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!redirectAuthUser) return;
    triggerConfettiBurst();
    showToast(
      isBangla
        ? `অভিনন্দন, ${redirectAuthUser.name}! একাউন্ট তৈরি হয়েছে 🎉`
        : `Welcome, ${redirectAuthUser.name}! Account ready 🎉`,
      'success'
    );
    const signedUser = redirectAuthUser;
    clearRedirectAuthUser();
    if (signedUser.role === 'ADMIN') {
      navigate('/admin/dashboard');
    } else if (signedUser.role === 'TECHNICIAN') {
      registerNewTechnician(signedUser, null);
      navigate('/technician/dashboard?tab=profile&onboarding=1');
    } else {
      navigate('/customer/dashboard?tab=profile&onboarding=1');
    }
  }, [redirectAuthUser]);

  const handleGoogleSignUp = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await loginWithGoogle(role);
    if (res.redirected) {
      return;
    }
    if (!res.success || !res.user) {
      setErrorMsg(
        res.error ||
          (isBangla
            ? 'Google সাইন-আপ সম্পন্ন করা যায়নি।'
            : 'Google registration could not be completed.')
      );
      setIsSubmitting(false);
      return;
    }

    triggerConfettiBurst();
    showToast(
      isBangla
        ? `অভিনন্দন, ${res.user.name}! একাউন্ট তৈরি হয়েছে 🎉`
        : `Welcome, ${res.user.name}! Account ready 🎉`,
      'success'
    );

    if (res.user.role === 'ADMIN') {
      setIsSubmitting(false);
      navigate('/admin/dashboard');
      return;
    }

    if (res.user.role === 'TECHNICIAN') {
      registerNewTechnician(res.user, null);
      setIsSubmitting(false);
      navigate('/technician/dashboard?tab=profile&onboarding=1');
    } else {
      setIsSubmitting(false);
      navigate('/customer/dashboard?tab=profile&onboarding=1');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (password.trim().length < 6) {
      setErrorMsg(
        isBangla
          ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'
          : 'Password must be at least 6 characters.'
      );
      return;
    }

    setIsSubmitting(true);
    const res = await register({ name, email, password, role });
    if (!res.success || !res.user) {
      setErrorMsg(res.error || (isBangla ? 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।' : 'Registration failed.'));
      setIsSubmitting(false);
      return;
    }

    triggerConfettiBurst();
    showToast(
      isBangla
        ? `অভিনন্দন, ${res.user.name}! রেজিস্ট্রেশন সফল হয়েছে 🎉`
        : `Congratulations, ${res.user.name}! Registration complete 🎉`,
      'success'
    );

    if (role === 'TECHNICIAN') {
      registerNewTechnician(res.user, res.serverTechnicianId);
      setIsSubmitting(false);
      navigate('/technician/dashboard?tab=profile&onboarding=1');
    } else {
      setIsSubmitting(false);
      navigate('/customer/dashboard?tab=profile&onboarding=1');
    }
  };

  if (currentUser) {
    const dashPath =
      currentUser.role === 'TECHNICIAN'
        ? '/technician/dashboard'
        : currentUser.role === 'ADMIN'
        ? '/admin/dashboard'
        : '/customer/dashboard';
    return (
      <div className="py-12 max-w-md mx-auto px-4 sm:px-6">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-5 text-center">
          <Logo size="lg" className="justify-center" />
          <h1 className="text-lg font-extrabold text-zinc-900 dark:text-white">
            {isBangla ? 'নতুন একাউন্ট খুলতে আগে লগআউট করুন' : 'Sign Out to Create a New Account'}
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {isBangla
              ? `আপনি বর্তমানে ${currentUser.name} (${currentUser.role}) হিসেবে লগইন আছেন। নতুন কোনো রোল বা একাউন্ট দিয়ে রেজিস্ট্রেশন করতে আগে বর্তমান একাউন্ট থেকে লগআউট করুন।`
              : `You are currently signed in as ${currentUser.name} (${currentUser.role}). Please sign out first to register a new account or role.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => navigate(dashPath)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{isBangla ? 'ড্যাশবোর্ড' : 'Dashboard'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                showToast(isBangla ? 'লগআউট সম্পন্ন হয়েছে।' : 'Signed out.', 'info');
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
            {isBangla ? 'নতুন Servexa একাউন্ট খুলুন' : 'Create an Account'}
          </h1>
          <p className="text-xs text-zinc-500">
            {isBangla ? 'সারা বাংলাদেশ থেকে সহজেই যোগ দিন' : 'Join from anywhere in Bangladesh'}
          </p>
        </div>

        {/* Role Segmented Switch */}
        <div className="flex p-1 bg-stone-100 dark:bg-zinc-800 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setRole('CUSTOMER')}
            className={`flex-1 py-2.5 rounded-lg transition-all cursor-pointer ${
              role === 'CUSTOMER'
                ? 'bg-white dark:bg-zinc-700 text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            👤 {isBangla ? 'গ্রাহক (Customer)' : 'Customer'}
          </button>
          <button
            type="button"
            onClick={() => setRole('TECHNICIAN')}
            className={`flex-1 py-2.5 rounded-lg transition-all cursor-pointer ${
              role === 'TECHNICIAN'
                ? 'bg-white dark:bg-zinc-700 text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            👷 {isBangla ? 'মিস্ত্রি (Technician)' : 'Technician'}
          </button>
        </div>

        {/* Google 1-Click Register */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs hover:border-orange-500 transition-colors flex items-center justify-center gap-2.5 shadow-2xs cursor-pointer disabled:opacity-60"
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
          <span>
            {isBangla
              ? role === 'TECHNICIAN'
                ? 'Google দিয়ে মিস্ত্রি একাউন্ট তৈরি করুন'
                : 'Google দিয়ে গ্রাহক একাউন্ট তৈরি করুন'
              : role === 'TECHNICIAN'
                ? 'Sign up as Technician with Google'
                : 'Sign up as Customer with Google'}
          </span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-zinc-200 dark:border-zinc-800 w-full" />
          <span className="bg-white dark:bg-zinc-900 px-3 text-[11px] text-zinc-400 absolute">
            {isBangla ? 'অথবা তথ্য পূরণ করে' : 'or fill form'}
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {isBangla ? 'আপনার নাম' : 'Full Name'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isBangla ? 'যেমন: সাকিব হাসান' : 'e.g. Sakib Hasan'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {isBangla ? 'ইমেইল' : 'Email'}
            </label>
            <input
              type="email"
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isBangla ? 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন' : 'At least 6 characters'}
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

          {role === 'TECHNICIAN' ? (
            <div className="p-3 rounded-2xl bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 text-[11px] text-orange-900 dark:text-orange-200 flex items-start gap-2 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <span>
                {isBangla
                  ? 'রেজিস্ট্রেশনের পর সরাসরি ড্যাশবোর্ডে গিয়ে আপনার সম্পূর্ণ বায়োডাটা, মোবাইল নম্বর ও NID ছবি (সামনে ও পেছনে) আপলোড করুন। অ্যাডমিন "দক্ষতা উত্তীর্ণ" অনুমোদন দিলে কাজ শুরু করতে পারবেন।'
                  : 'After signup, complete your biodata, phone number, and NID front/back photos on your dashboard for Admin skill-test approval.'}
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                {isBangla
                  ? 'রেজিস্ট্রেশনের পর আপনার প্রোফাইল সেকশন থেকে মোবাইল নম্বর, বিভাগ, জেলা ও বিস্তারিত ঠিকানা যোগ করতে পারবেন।'
                  : 'After signup, you can add your phone number and Bangladesh address from your profile dashboard.'}
              </span>
            </div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>
                {isSubmitting
                  ? isBangla
                    ? 'একাউন্ট তৈরি হচ্ছে...'
                    : 'Creating account...'
                  : isBangla
                    ? 'রেজিস্ট্রেশন সম্পন্ন করুন'
                    : 'Complete Registration'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="text-center text-xs text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <span>{isBangla ? 'ইতিমধ্যে একাউন্ট আছে? ' : 'Already have an account? '}</span>
          <Link to="/login" className="text-orange-600 dark:text-orange-400 font-bold hover:underline">
            {isBangla ? 'লগইন করুন' : 'Sign In'}
          </Link>
        </div>
      </div>
    </div>
  );
};
