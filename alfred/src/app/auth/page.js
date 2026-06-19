'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { login, signup } from '@/services/authentication';
import { getGoogleAuthUrl } from '@/services/fetch_info';
import logo from './icon0.svg';
const GoogleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const fieldBase = `
  w-full h-[38px] px-3 text-[13px]
  bg-white/[0.025] border border-violet-900/30
  rounded-lg outline-none
  text-[#ddd6fe] placeholder:text-white/30
  focus:border-violet-600/50 focus:bg-violet-900/5 focus:ring-[3px] focus:ring-violet-900/7
  transition-all duration-200 mb-[9px]
`;
const fieldError = `border-red-900 bg-red-950/10`;

const kronaOne = { fontFamily: "'Krona One', sans-serif" };

export default function AuthPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: ''
  });
  const [errors, setErrors] = useState({ login: '', signup: '' });
  const [emailOk, setEmailOk] = useState({ login: false, signup: false });
  const [passMatch, setPassMatch] = useState(false);

  const handleInput = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const validateEmail = (val, form) => {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    setEmailOk(p => ({ ...p, [form]: ok }));
    if (val && !ok) setErrors(p => ({ ...p, [form]: 'Please enter a valid email address' }));
    else setErrors(p => ({ ...p, [form]: '' }));
    return ok;
  };

  useEffect(() => {
    const p = formData.password;
    const c = formData.confirmPassword;
    if (c && p !== c) {
      setErrors(prev => ({ ...prev, signup: 'Passwords do not match' }));
      setPassMatch(false);
    } else {
      if (errors.signup === 'Passwords do not match') setErrors(p => ({ ...p, signup: '' }));
      setPassMatch(c.length > 0 && p === c);
    }
  }, [formData.password, formData.confirmPassword]);

  const loginAllowed = emailOk.login && formData.password.trim().length > 0 && !errors.login;
  const signupAllowed =
    formData.firstName.trim() && formData.lastName.trim() &&
    emailOk.signup && formData.password.trim() && passMatch && !errors.signup;

  const handleGoogleAuth = () => {
    const { url, state } = getGoogleAuthUrl();
    sessionStorage.setItem('oauth_state', state);
    window.location.href = url;
  };

  const handleSubmit = async () => {
    try {
      if (isSignUp) {
        await signup(formData.firstName, formData.lastName, formData.email, formData.password);
      } else {
        await login(formData.email, formData.password);
      }
      router.push('/chats');
    } catch (error) {
      const msg = error.response?.data?.detail || 'An unexpected error occurred';
      setErrors(p => ({ ...p, [isSignUp ? 'signup' : 'login']: msg }));
    }
  };

  const toggle = () => {
    setIsSignUp(p => !p);
    setFormData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
    setErrors({ login: '', signup: '' });
    setEmailOk({ login: false, signup: false });
    setPassMatch(false);
  };

  const ErrorBanner = ({ form }) => (
    <AnimatePresence>
      {errors[form] && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="mb-3 bg-red-950/30 border border-red-900/40 rounded-lg p-2.5 flex items-start gap-2"
        >
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-red-300 flex-1 leading-snug">{errors[form]}</p>
          <button onClick={() => setErrors(p => ({ ...p, [form]: '' }))} className="text-red-700 hover:text-red-400 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const OrLine = () => (
    <div className="flex items-center gap-2.5 mb-[9px]">
      <div className="flex-1 h-px bg-violet-900/20" />
      <span className="text-[11px] text-white/40">or</span>
      <div className="flex-1 h-px bg-violet-900/20" />
    </div>
  );

  const GoogleBtn = () => (
    <button
      onClick={handleGoogleAuth}
      className="w-full h-[37px] bg-white/[0.022] border border-white/[0.07] rounded-lg
        flex items-center justify-center gap-2 mb-[9px]
        text-[12px] text-violet-300/60
        hover:bg-white/[0.05] hover:border-white/[0.12] hover:text-violet-300
        transition-all duration-200"
    >
      <GoogleIcon />
      Continue with Google
    </button>
  );

  const SubmitBtn = ({ label, allowed }) => (
    <motion.button
      onClick={handleSubmit}
      disabled={!allowed}
      whileHover={allowed ? { y: -1 } : {}}
      whileTap={allowed ? { scale: 0.99 } : {}}
      className="w-full h-[38px] rounded-lg text-[10.5px] tracking-[2.2px] font-medium
        uppercase text-[#ede9fe] mb-[11px] cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
      style={{
        background: 'linear-gradient(135deg, #5b21b6 0%, #4c1d95 100%)',
        border: '0.5px solid rgba(109,40,217,0.35)',
        boxShadow: allowed ? '0 4px 18px rgba(109,40,217,0.18)' : 'none',
      }}
    >
      {label}
    </motion.button>
  );

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 relative">

      <div className="absolute pointer-events-none" style={{
        width: 380, height: 380,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(109,40,217,0.06) 0%, transparent 68%)',
        borderRadius: '50%',
      }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="relative w-full max-w-[780px] rounded-2xl overflow-hidden"
        style={{
          height: 520,
          background: '#111114',
          border: '0.5px solid rgba(109,40,217,0.15)',
        }}
      >
       

        {/* Sliding panel */}
        <motion.div
          animate={{ left: isSignUp ? '0%' : '50%' }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          className="absolute top-0 bottom-0 w-1/2 z-50 flex items-center justify-center"
          style={{
            background: 'rgba(22,10,46,0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRight: isSignUp ? '0.5px solid rgba(109,40,217,0.18)' : 'none',
            borderLeft: isSignUp ? 'none' : '0.5px solid rgba(109,40,217,0.18)',
          }}
        >

          <img src={logo.src} alt="Alfred" className="h-30 w-auto opacity-60 mb-5 absolute top-10 left-1/2 transform -translate-x-1/2" />

          <motion.div
            key={isSignUp ? 'su' : 'li'}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28 }}
            className="text-center px-11"
          >
            <h2 className="text-[20px] font-normal text-[#ede9fe] mb-3 leading-snug" style={kronaOne}>
              {isSignUp ? 'Welcome back' : 'New here?'}
            </h2>
            <p className="text-[13px] text-violet-300/50 mb-7 leading-relaxed">
              {isSignUp ? 'Login to continue\nyour journey' : 'Sign up and discover\nwhat Alfred can do'}
            </p>
            <motion.button
              onClick={toggle}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="px-[30px] py-[9px] text-[10.5px] tracking-[2.2px] font-medium
                uppercase text-violet-300 rounded-full transition-all duration-200"
              style={{
                border: '0.5px solid rgba(139,92,246,0.38)',
                background: 'rgba(109,40,217,0.1)',
              }}
            >
              {isSignUp ? 'Login' : 'Sign up'}
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Login pane */}
        <motion.div
          animate={{ opacity: isSignUp ? 0 : 1, x: isSignUp ? -24 : 0 }}
          transition={{ duration: 0.3 }}
          className="absolute top-0 left-0 w-1/2 h-full flex items-center justify-center"
          style={{ pointerEvents: isSignUp ? 'none' : 'auto' }}
        >

          <div className="w-[78%] max-w-[272px]">
            <ErrorBanner form="login" />
            {/* <img src={logo} alt="Alfred" className="h-5 w-auto opacity-60" /> */}
            <h2 className="text-[18px] font-normal text-[#f0ebff] text-center mb-5 leading-snug" style={kronaOne}>
              Login
            </h2>
            <input
              type="email" name="email" placeholder="Email address"
              value={formData.email}
              onChange={e => { handleInput(e); validateEmail(e.target.value, 'login'); }}
              className={`${fieldBase} ${formData.email && !emailOk.login ? fieldError : ''}`}
            />
            <input
              type="password" name="password" placeholder="Password"
              value={formData.password}
              onChange={handleInput}
              className={fieldBase}
            />
            <OrLine />
            <GoogleBtn />
            <SubmitBtn label="Login" allowed={loginAllowed} />
            <a href="#" className="block text-center text-[11px] text-violet-900/40 hover:text-violet-400/70 transition-colors">
              Forgot password?
            </a>
          </div>
        </motion.div>

        {/* Signup pane */}
        <motion.div
          animate={{ opacity: !isSignUp ? 0 : 1, x: !isSignUp ? 24 : 0 }}
          transition={{ duration: 0.3 }}
          className="absolute top-0 right-0 w-1/2 h-full flex items-center justify-center"
          style={{ pointerEvents: !isSignUp ? 'none' : 'auto' }}
        >
          <div className="w-[78%] max-w-[272px]">
            <ErrorBanner form="signup" />
            <h2 className="text-[18px] font-normal text-[#f0ebff] text-center mb-5 leading-snug" style={kronaOne}>
              Sign up
            </h2>
            <div className="flex gap-2 mb-[9px]">
              <input type="text" name="firstName" placeholder="First name"
                value={formData.firstName} onChange={handleInput}
                // in the name row inputs, change placeholder class too
                className="w-1/2 h-[38px] px-3 text-[13px] bg-white/[0.025] border border-violet-900/30 rounded-lg outline-none text-[#ddd6fe] placeholder:text-white/30 focus:border-violet-600/50 focus:ring-[3px] focus:ring-violet-900/7 transition-all duration-200"
              />
              <input type="text" name="lastName" placeholder="Last name"
                value={formData.lastName} onChange={handleInput}
                className="w-1/2 h-[38px] px-3 text-[13px] bg-white/[0.025] border border-violet-900/30 rounded-lg outline-none text-[#ddd6fe] placeholder:text-white/30 focus:border-violet-600/50 focus:ring-[3px] focus:ring-violet-900/7 transition-all duration-200"
              />
            </div>
            <input type="email" name="email" placeholder="Email address"
              value={formData.email}
              onChange={e => { handleInput(e); validateEmail(e.target.value, 'signup'); }}
              className={`${fieldBase} ${formData.email && !emailOk.signup ? fieldError : ''}`}
            />
            <input type="password" name="password" placeholder="Password"
              value={formData.password} onChange={handleInput}
              className={`${fieldBase} ${errors.signup === 'Passwords do not match' ? fieldError : ''}`}
            />
            <input type="password" name="confirmPassword" placeholder="Confirm password"
              value={formData.confirmPassword} onChange={handleInput}
              className={`${fieldBase} ${errors.signup === 'Passwords do not match' ? fieldError : ''}`}
            />
            <OrLine />
            <GoogleBtn />
            <SubmitBtn label="Sign up" allowed={signupAllowed} />
          </div>
        </motion.div>

      </motion.div>

      <link href="https://fonts.googleapis.com/css2?family=Krona+One&display=swap" rel="stylesheet" />
    </div>
  );
}