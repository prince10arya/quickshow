import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { assets } from '../assets/assets';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = ({ redirectTo = '/' }) => {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [touched, setTouched] = useState({ name: false, email: false, password: false });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const { login, register, navigate } = useAppContext();

  const validate = () => {
    const errs = {};
    if (tab === 'register' && (!form.name.trim() || form.name.trim().length < 2)) {
      errs.name = 'Please enter your full name (at least 2 characters).';
    }
    if (!form.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!EMAIL_RE.test(form.email)) {
      errs.email = 'Please provide a valid email address (e.g. name@domain.com).';
    }
    if (!form.password) {
      errs.password = 'Password is required.';
    } else if (form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }
    return errs;
  };

  const errors = validate();

  const handle = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (serverError) setServerError('');
  };

  const handleBlur = (field) => {
    setTouched((t) => ({ ...t, [field]: true }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });

    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setServerError('');
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
      navigate(redirectTo);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Authentication failed. Please try again.';
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setTouched({ name: false, email: false, password: false });
    setServerError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4 py-12 relative overflow-hidden">
      {/* Subtle brand glow behind card */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Top brand accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary-dull to-rose-600" />

          <div className="p-8">
            {/* Logo & Header */}
            <div className="text-center mb-6">
              <img src={assets.logo} alt="QuickShow" className="h-8 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">
                {tab === 'login' ? 'Sign in to access your bookings' : 'Create an account to get started'}
              </p>
            </div>

            {/* Server Error Banner */}
            {serverError && (
              <div className="mb-5 flex items-start gap-2.5 p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Tab Switcher */}
            <div className="flex bg-zinc-800/70 rounded-xl p-1 mb-6 gap-1 border border-white/5">
              {['login', 'register'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTab(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    tab === t
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {t === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={submit} className="space-y-4" noValidate>
              {tab === 'register' && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handle}
                    onBlur={() => handleBlur('name')}
                    placeholder="Jane Doe"
                    className={`w-full bg-zinc-800/50 border rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 transition-all outline-none ${
                      touched.name && errors.name
                        ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/40'
                        : 'border-white/10 focus:border-primary focus:ring-1 focus:ring-primary/40'
                    }`}
                  />
                  {touched.name && errors.name && (
                    <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.name}</span>
                    </p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handle}
                  onBlur={() => handleBlur('email')}
                  placeholder="you@example.com"
                  className={`w-full bg-zinc-800/50 border rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 transition-all outline-none ${
                    touched.email && errors.email
                      ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/40'
                      : 'border-white/10 focus:border-primary focus:ring-1 focus:ring-primary/40'
                  }`}
                />
                {touched.email && errors.email && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handle}
                    onBlur={() => handleBlur('password')}
                    placeholder="••••••••"
                    className={`w-full bg-zinc-800/50 border rounded-xl pl-4 pr-11 py-3 text-sm text-zinc-100 placeholder-zinc-500 transition-all outline-none ${
                      touched.password && errors.password
                        ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/40'
                        : 'border-white/10 focus:border-primary focus:ring-1 focus:ring-primary/40'
                    }`}
                  />
                  <button
                    id="auth-toggle-password"
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.password}</span>
                  </p>
                )}
              </div>

              <button
                id="auth-submit"
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 rounded-xl font-semibold text-sm bg-primary hover:bg-primary-dull text-white disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-primary/40 cursor-pointer active:scale-[0.99]"
              >
                {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {/* Toggle footer */}
            <p className="text-center text-xs text-zinc-400 mt-6">
              {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
                className="text-primary hover:underline font-medium cursor-pointer"
              >
                {tab === 'login' ? 'Register' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
