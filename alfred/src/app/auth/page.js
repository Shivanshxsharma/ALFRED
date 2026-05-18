'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import googleLogo from './google.svg';
import { AlertCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { login, signup } from '@/services/authentication';
import { getGoogleAuthUrl } from '@/services/fetch_info';

export default function AuthPage() {
  const router = useRouter();
  const [showError, setShowError] = useState(false);
  const [allowSubmit, setAllowSubmit] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const pref = useRef(null);
  const cpref = useRef(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (isSignUp) {
      for (const key in formData) {
        if (formData[key].trim() === '') { setAllowSubmit(false); return; }
      }
      setAllowSubmit(true);
    } else {
      setAllowSubmit(formData.email.trim() !== '' && formData.password.trim() !== '');
    }
  }, [formData]);

  const handleGoogleAuth = () => {
    const { url, state } = getGoogleAuthUrl();
    sessionStorage.setItem('oauth_state', state);
    window.location.href = url;
  };

  const handlePasswordValidation = () => {
    if (!pref.current || !cpref.current) return;
    if (pref.current.value !== cpref.current.value) {
      cpref.current.style.borderColor = '#7f1d1d';
      pref.current.style.borderColor = '#7f1d1d';
      setShowError(true);
      setErrorMessage("Passwords do not match");
    } else {
      cpref.current.style.borderColor = '#4c1d95';
      pref.current.style.borderColor = '#4c1d95';
      setShowError(false);
      setErrorMessage('');
    }
  };

  const handleEmailValidation = (e) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(e.target.value)) {
      e.target.style.borderColor = '#7f1d1d';
      setShowError(true);
      setErrorMessage("Please enter a valid email address");
    } else {
      e.target.style.borderColor = '#4c1d95';
      setShowError(false);
      setErrorMessage('');
    }
  };

  const handleSubmit = async () => {
    try {
      let data;
      if (isSignUp) {
        data = await signup(formData.firstName, formData.lastName, formData.email, formData.password);
      } else {
        data = await login(formData.email, formData.password);
      }
      router.push('/chats');
    } catch (error) {
      const message = error.response?.data?.detail || "An unexpected error occurred";
      setErrorMessage(message);
      setShowError(true);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setFormData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  };

  const inputClass = `
    w-full h-10 px-3 py-2 text-sm
    bg-zinc-900/60
    border border-zinc-800
    rounded-md outline-none
    text-zinc-200 placeholder-zinc-600
    focus:border-violet-800
    focus:ring-1 focus:ring-violet-900
    transition-all duration-200
  `;

  const ErrorBanner = () => (
    <AnimatePresence mode="wait">
      {showError && errorMessage !== "" && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mb-4 bg-red-950/40 border border-red-900/50 rounded-lg p-3"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 flex-1">{errorMessage}</p>
            <button onClick={() => setShowError(false)} className="text-red-700 hover:text-red-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-5">

      {/* single subtle glow — only one, not two */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '500px',
          height: '500px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(109,40,217,0.06) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-4xl rounded-2xl overflow-hidden"
        style={{
          height: '550px',
          background: '#111113',
          border: '0.5px solid rgba(109, 40, 217, 0.12)',
          boxShadow: '0 0 40px rgba(109, 40, 217, 0.06)',
        }}
      >

        {/* Sliding Panel — blur only here */}
        <motion.div
          animate={{ x: isSignUp ? '0%' : '100%' }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="absolute top-0 left-0 w-1/2 h-full z-50 flex items-center justify-center"
          style={{
            background: 'rgba(30, 16, 60, 0.75)',
            backdropFilter: 'blur(14px)',
            borderRight: '0.5px solid rgba(109, 40, 217, 0.15)',
          }}
        >
          <motion.div
            key={isSignUp ? 'signup-panel' : 'login-panel'}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="text-center w-full h-full px-12 flex flex-col items-center justify-center"
          >
            {!isSignUp ? (
              <>
                <h2 className="text-3xl font-semibold mb-3 text-zinc-100 tracking-tight">New here?</h2>
                <p className="text-sm mb-8 text-zinc-400 leading-relaxed">
                  Sign up and discover what Alfred can do
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={toggleMode}
                  className="px-8 py-2.5 text-xs font-medium border border-zinc-600 rounded-full text-zinc-300 hover:border-violet-700 hover:text-violet-300 transition-all duration-300 tracking-widest"
                >
                  SIGN UP
                </motion.button>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-semibold mb-3 text-zinc-100 tracking-tight">Welcome back</h2>
                <p className="text-sm mb-8 text-zinc-400 leading-relaxed">
                  Login to continue your journey
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={toggleMode}
                  className="px-8 py-2.5 text-xs font-medium border border-zinc-600 rounded-full text-zinc-300 hover:border-violet-700 hover:text-violet-300 transition-all duration-300 tracking-widest"
                >
                  LOGIN
                </motion.button>
              </>
            )}
          </motion.div>
        </motion.div>

        {/* Login Form */}
        <motion.div
          animate={{ opacity: isSignUp ? 0 : 1, x: isSignUp ? -40 : 0 }}
          transition={{ duration: 0.4 }}
          className="absolute top-0 left-0 w-1/2 h-full flex items-center justify-center"
          style={{ pointerEvents: isSignUp ? 'none' : 'auto' }}
        >
          <div className="w-4/5 max-w-sm">
            <ErrorBanner />
            <h2 className="text-2xl font-semibold text-zinc-100 mb-7 text-center tracking-tight">
              Login
            </h2>

            <motion.input
              whileFocus={{ scale: 1.005 }}
              type="email" name="email"
              placeholder="Email address"
              value={formData.email}
              onChange={(e) => { handleInputChange(e); handleEmailValidation(e); }}
              className={`${inputClass} mb-3`}
            />

            <motion.input
              whileFocus={{ scale: 1.005 }}
              type="password" name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              className={`${inputClass} mb-4`}
            />

            {/* Google */}
            <motion.button
              onClick={handleGoogleAuth}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="mb-4 border border-zinc-800 rounded-full bg-zinc-900/60 hover:border-zinc-700 transition-all duration-200"
            >
              <Button variant="icon">
                <img src={googleLogo.src} alt="google" className="w-4 h-4" />
              </Button>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleSubmit}
              className="w-full h-10 text-xs font-medium text-zinc-200 rounded-md mb-4 tracking-widest transition-all duration-300"
              style={{
                background: allowSubmit && !showError
                  ? 'linear-gradient(135deg, #5b21b6 0%, #4c1d95 100%)'
                  : '#1c1c24',
                border: '0.5px solid rgba(109,40,217,0.3)',
                opacity: allowSubmit && !showError ? 1 : 0.5,
                pointerEvents: allowSubmit && !showError ? 'auto' : 'none',
              }}
            >
              LOGIN
            </motion.button>

            <p className="text-center text-xs">
              <a href="#" className="text-zinc-600 hover:text-violet-500 transition-colors">
                Forgot password?
              </a>
            </p>
          </div>
        </motion.div>

        {/* Sign Up Form */}
        <motion.div
          animate={{ opacity: !isSignUp ? 0 : 1, x: !isSignUp ? 40 : 0 }}
          transition={{ duration: 0.4 }}
          className="absolute top-0 right-0 w-1/2 h-full flex items-center justify-center"
          style={{ pointerEvents: !isSignUp ? 'none' : 'auto' }}
        >
          <div className="w-4/5 max-w-sm">
            <ErrorBanner />
            <h2 className="text-2xl font-semibold text-zinc-100 mb-6 text-center tracking-tight">
              Sign Up
            </h2>

            <div className="flex gap-3 mb-3">
              <input
                type="text" name="firstName" placeholder="First name"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-1/2 h-10 px-3 py-2 text-sm bg-zinc-900/60 border border-zinc-800 rounded-md outline-none text-zinc-200 placeholder-zinc-600 focus:border-violet-800 focus:ring-1 focus:ring-violet-900 transition-all duration-200"
              />
              <input
                type="text" name="lastName" placeholder="Last name"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-1/2 h-10 px-3 py-2 text-sm bg-zinc-900/60 border border-zinc-800 rounded-md outline-none text-zinc-200 placeholder-zinc-600 focus:border-violet-800 focus:ring-1 focus:ring-violet-900 transition-all duration-200"
              />
            </div>

            <input
              type="email" name="email" placeholder="Email address"
              value={formData.email}
              onChange={(e) => { handleInputChange(e); handleEmailValidation(e); }}
              className={`${inputClass} mb-3`}
            />

            <input
              ref={pref}
              type="password" name="password" placeholder="Password"
              value={formData.password}
              onChange={(e) => { handleInputChange(e); handlePasswordValidation(); }}
              className={`${inputClass} mb-3`}
            />

            <input
              ref={cpref}
              type="password" name="confirmPassword" placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={(e) => { handleInputChange(e); handlePasswordValidation(); }}
              className={`${inputClass} mb-5`}
            />
            
            <motion.button
              onClick={handleGoogleAuth}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="mb-4 border border-zinc-800 rounded-full bg-zinc-900/60 hover:border-zinc-700 transition-all duration-200"
            >
              <Button variant="icon">
                <img src={googleLogo.src} alt="google" className="w-4 h-4" />
              </Button>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleSubmit}
              className="w-full h-10 text-xs font-medium text-zinc-200 rounded-md tracking-widest transition-all duration-300"
              style={{
                background: allowSubmit && !showError
                  ? 'linear-gradient(135deg, #5b21b6 0%, #4c1d95 100%)'
                  : '#1c1c24',
                border: '0.5px solid rgba(109,40,217,0.3)',
                opacity: allowSubmit && !showError ? 1 : 0.5,
                pointerEvents: allowSubmit && !showError ? 'auto' : 'none',
              }}
            >
              SIGN UP
            </motion.button>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}