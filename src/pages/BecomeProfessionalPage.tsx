import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  CheckCircle2,
  ArrowRight,
  DollarSign,
  Users,
  Award,
  Eye,
  EyeOff,
  AlertCircle,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export const BecomeProfessionalPage: React.FC = () => {
  const { categories, registerNewTechnician, updateTechnicianProfile } = useApp();
  const { isBangla } = useLanguage();
  const { currentUser, register, logout } = useAuth();
  const { showToast, triggerConfettiBurst } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nidNumber, setNidNumber] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['electrical']);
  const [city] = useState('Dhaka');
  const [area, setArea] = useState('Mirpur');
  const [experienceYears, setExperienceYears] = useState('3');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const toggleSkill = (skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId) ? prev.filter((s) => s !== skillId) : [...prev, skillId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim()) {
      setErrorMsg(isBangla ? 'সঠিক ইমেইল দিন।' : 'Valid email is required.');
      return;
    }
    if (password.trim().length < 6) {
      setErrorMsg(
        isBangla ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' : 'Password must be at least 6 characters.'
      );
      return;
    }

    setIsSubmitting(true);
    const res = await register({
      name,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      role: 'TECHNICIAN',
      city,
      area,
    });

    if (!res.success || !res.user) {
      setErrorMsg(res.error || (isBangla ? 'আবেদন জমা দেওয়া যায়নি।' : 'Application failed.'));
      setIsSubmitting(false);
      return;
    }

    const tech = registerNewTechnician(res.user, res.serverTechnicianId);
    updateTechnicianProfile(tech.id, {
      phone: phone.trim(),
      nidNumber: nidNumber.trim(),
      skills: selectedSkills,
      primaryArea: area,
      serviceAreas: [area],
      city,
      district: city,
      division: 'Dhaka',
      experienceYears: Number(experienceYears) || 1,
    });

    setIsSubmitting(false);
    setSubmitted(true);
    triggerConfettiBurst();
    showToast(
      isBangla
        ? 'অভিনন্দন! টেকনিশিয়ান আবেদন সফলভাবে জমা হয়েছে 🎉'
        : 'Congratulations! Technician application submitted 🎉',
      'success'
    );
  };

  if (submitted) {
    return (
      <div className="py-20 max-w-lg mx-auto px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {isBangla ? 'আবেদন সফলভাবে গ্রহণ করা হয়েছে!' : 'Application Received Successfully!'}
        </h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {isBangla ? (
            <>
              আপনার প্রোফাইল ও এনআইডি যাচাইয়ের জন্য আমাদের টিম <strong>{phone || email}</strong> এ যোগাযোগ করবে। ড্যাশবোর্ডে গিয়ে আপনার NID ছবি আপলোড করুন।
            </>
          ) : (
            <>
              Our verification team will review your profile ({phone || email}). Upload your NID photos from your dashboard to complete KYC.
            </>
          )}
        </p>
        <button
          onClick={() => navigate('/technician/dashboard?tab=profile')}
          className="mt-4 px-6 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-xs cursor-pointer"
        >
          {isBangla ? 'টেকনিশিয়ান ড্যাশবোর্ডে প্রবেশ করুন' : 'Go to Technician Dashboard'}
        </button>
      </div>
    );
  }

  return (
    <div className="py-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-orange-600 via-orange-500 to-amber-600 text-white p-8 sm:p-12 shadow-xl space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
          <Wrench className="w-4 h-4" />
          <span>Servexa Pro Network</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
          {isBangla ? 'দক্ষ মিস্ত্রি হিসেবে Servexa-তে যোগ দিন' : 'Grow Your Earnings with Servexa'}
        </h1>

        <p className="text-xs sm:text-sm text-orange-100 max-w-xl leading-relaxed">
          {isBangla
            ? 'প্রতিদিন সরাসরি আপনার এলাকায় নতুন নতুন কাজের সুযোগ পান। সম্পূর্ণ স্বাধীন কর্মঘণ্টা ও নিশ্চিত নিয়মিত আয়।'
            : 'Get high-paying jobs in your neighbourhood every day with verified customers and zero hassle.'}
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <DollarSign className="w-8 h-8 text-emerald-600" />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
            {isBangla ? 'মাসিক ৪০,০০০৳+ আয়ের সুযোগ' : 'Earn ৳40,000+ Monthly'}
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {isBangla
              ? 'কোনো মধ্যস্বত্বভোগী নেই। গ্রাহক থেকে সরাসরি আপনার নির্ধারিত ভিজিটিং ফি ও শ্রম মজুরি পান।'
              : 'No middlemen. Receive your visiting fees and service earnings directly with transparent settlement.'}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <Users className="w-8 h-8 text-orange-600" />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
            {isBangla ? 'আপনার নিজস্ব এলাকার কাজ' : 'Jobs in Your Own Area'}
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {isBangla
              ? 'যে এলাকায় কাজ করতে স্বাচ্ছন্দ্যবোধ করেন শুধুমাত্র সেই এলাকা থেকেই রিকোয়েস্ট গ্রহণ করুন।'
              : 'Accept service requests only in neighborhoods where you feel comfortable working.'}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <Award className="w-8 h-8 text-blue-600" />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
            {isBangla ? 'আইডি ভেরিফায়েড সম্মানজনক পরিচয়' : 'Verified Pro Identity'}
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {isBangla
              ? 'Servexa ভেরিফায়েড ব্যাজের সাথে এলাকায় নিজের কাজের সুনাম ও নিয়মিত স্থায়ী কাস্টমার তৈরি করুন।'
              : 'Build trust and repeat customers in your area with the Servexa Verified Pro badge.'}
          </p>
        </div>
      </div>

      {/* Registration Form OR Explicit Logout Prompt */}
      <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-6">
        {currentUser ? (
          <div className="text-center space-y-4 py-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {isBangla
                ? 'নতুন টেকনিশিয়ান একাউন্ট খুলতে আগে লগআউট করুন'
                : 'Sign Out to Register as Technician'}
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md mx-auto">
              {isBangla
                ? `আপনি বর্তমানে ${currentUser.name} (${currentUser.role}) হিসেবে লগইন আছেন। নতুন টেকনিশিয়ান হিসেবে আবেদন করতে অনুগ্রহ করে আগে বর্তমান একাউন্ট থেকে লগআউট করুন।`
                : `You are currently signed in as ${currentUser.name} (${currentUser.role}). Please sign out first before submitting a technician registration.`}
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    currentUser.role === 'TECHNICIAN'
                      ? '/technician/dashboard'
                      : currentUser.role === 'ADMIN'
                      ? '/admin/dashboard'
                      : '/customer/dashboard'
                  )
                }
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{isBangla ? 'ড্যাশবোর্ডে ফিরে যান' : 'Back to Dashboard'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  showToast(isBangla ? 'লগআউট সম্পন্ন হয়েছে।' : 'Signed out.', 'info');
                }}
                className="px-5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{isBangla ? 'লগআউট করুন' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {isBangla ? 'টেকনিশিয়ান রেজিস্ট্রেশন ফরম' : 'Technician Registration Form'}
              </h2>
              <p className="text-xs text-zinc-500">
                {isBangla ? 'সহজ কয়েকটি তথ্য পূরণ করে আবেদন করুন' : 'Complete a few quick details to apply'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {isBangla ? 'আপনার পূর্ণ নাম (NID অনুযায়ী)' : 'Full Name (as per NID)'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isBangla ? 'যেমন: মোঃ রফিকুল ইসলাম' : 'e.g. Md. Rafiqul Islam'}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {isBangla ? 'মোবাইল নম্বর' : 'Mobile Number'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {isBangla ? 'জাতীয় পরিচয়পত্র (NID) নম্বর' : 'National ID (NID) Number'}
                  </label>
                  <input
                    type="text"
                    required
                    value={nidNumber}
                    onChange={(e) => setNidNumber(e.target.value)}
                    placeholder={isBangla ? '১০ বা ১৭ ডিজিটের এনআইডি' : '10 or 17-digit NID'}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {isBangla ? 'ইমেইল (লগইনের জন্য)' : 'Email (for login)'}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {isBangla ? 'পাসওয়ার্ড (লগইনের জন্য)' : 'Password (for login)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isBangla ? 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড' : 'Minimum 6 characters'}
                      className="w-full px-3 py-2.5 pr-9 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Skill Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  {isBangla ? 'আপনার কাজের দক্ষতা নির্বাচন করুন' : 'Select Your Trade Skills'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.slice(0, 12).map((cat) => {
                    const isSelected = selectedSkills.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleSkill(cat.id)}
                        className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 font-bold'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {isBangla ? cat.nameBn : cat.nameEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {isBangla ? 'কাজের প্রাথমিক এলাকা' : 'Primary Working Area'}
                  </label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <option value="Mirpur">{isBangla ? 'মিরপুর' : 'Mirpur'}</option>
                    <option value="Dhanmondi">{isBangla ? 'ধানমন্ডি' : 'Dhanmondi'}</option>
                    <option value="Uttara">{isBangla ? 'উত্তরা' : 'Uttara'}</option>
                    <option value="Mohammadpur">{isBangla ? 'মোহাম্মদপুর' : 'Mohammadpur'}</option>
                    <option value="Gulshan">{isBangla ? 'গুলশান' : 'Gulshan'}</option>
                    <option value="Badda">{isBangla ? 'বাড্ডা' : 'Badda'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {isBangla ? 'কাজের অভিজ্ঞতা (বছর)' : 'Work Experience (Years)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="35"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>
                    {isSubmitting
                      ? isBangla
                        ? 'প্রসেসিং হচ্ছে...'
                        : 'Processing...'
                      : isBangla
                        ? 'আবেদন জমা দিন'
                        : 'Submit Application'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
