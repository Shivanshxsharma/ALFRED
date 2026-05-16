'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import googleLogo from './google.svg';
import { AlertCircle, Icon, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { login, signup } from '@/services/authentication';
import { user_contextStore } from '@/services/contextStrore';
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });


   
  }


  useEffect(() => {
     if(isSignUp){
      for (const key in formData) {
        if (formData[key].trim() === '') {
          setAllowSubmit(false);
          return;
        }
        
    }

    setAllowSubmit(true);

  }else{
    if(formData.email.trim() === '' || formData.password.trim() === ''){
      setAllowSubmit(false);
    }else{
      setAllowSubmit(true);
    
    }
    }
  },[formData]);


  const handleGoogleAuth = () => {
    const { url, state } = getGoogleAuthUrl()
    sessionStorage.setItem('oauth_state', state)  // save for verification
    window.location.href = url
  }










const handlePasswordValidation = () => {
    if (isSignUp && pref.current.value !== cpref.current.value) {
      cpref.current.style.borderColor = 'red';
      pref.current.style.borderColor = 'red';
      setShowError(true);
      setErrorMessage("Passwords do not match");
    }else if (isSignUp && pref.current.value === cpref.current.value) {
      cpref.current.style.borderColor = 'green';
      pref.current.style.borderColor = 'green';
      setShowError(false);
      setErrorMessage('');
    }
  };




  const handleEmailValidation = (e) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(e.target.value)) {
      e.target.style.borderColor = 'red';
      setShowError(true);
      setErrorMessage("Please enter a valid email address");
    } else {
      e.target.style.borderColor = 'green';
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

      
      console.log("Success------",data.message,"redirecting to home page");
      router.push('/chats');

    } catch (error) {
      const message = error.response?.data?.detail || "An unexpected error occurred";
      setErrorMessage(message);
      setShowError(true);
    }
  }




  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setFormData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  };





  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-5">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-4xl bg-zinc-950 rounded-2xl shadow-2xl overflow-hidden border border-zinc-900"
        style={{ height: '550px' }}
      >
        
        {/* Animated Sliding Panel */}
        <motion.div 
          animate={{ 
            x: isSignUp ? '0%' : '100%'
          }}
          transition={{ 
            type: 'spring', 
            stiffness: 100, 
            damping: 20,
            duration: 0.8
          }}
          className="absolute top-0 left-0 w-1/2 h-full z-50 flex items-center justify-center shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}
        >
          <motion.div 
            key={isSignUp ? 'signup-panel' : 'login-panel'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="text-center  w-full h-full px-12 text-white"
          >
            {!isSignUp ? (
              <div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl flex items-start  justify-center h-40 font-bold mb-4 drop-shadow-lg tracking-tight"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                 
                 >
                <motion.h2 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl font-bold mt-4 mb-4 drop-shadow-lg tracking-tight"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                </motion.h2>
                 </motion.div>

                <motion.h2 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl font-bold mb-4 drop-shadow-lg tracking-tight"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  New Here?
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-base mb-7 opacity-80 leading-relaxed font-light"
                >
                  Sign up and discover amazing possibilities
                </motion.p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleMode}
                  className="px-10 py-3 text-sm font-medium bg-transparent border border-zinc-300 rounded-full hover:bg-zinc-900 hover:bg-opacity-10 transition-all duration-300 tracking-wide"
                >
                  SIGN UP
                </motion.button>
              </div>
            ) : (
              <div >
                 <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl flex items-start  justify-center h-40 font-bold mb-4 drop-shadow-lg tracking-tight"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                 
                 >
                <motion.h2 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl font-bold mt-4 mb-4 drop-shadow-lg tracking-tight"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                </motion.h2>
                 </motion.div>





                <motion.h2 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl font-bold mb-4 drop-shadow-lg tracking-tight"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  Already have an account
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-base mb-7 opacity-80 leading-relaxed font-light"
                >
                  Login to continue your journey with us
                </motion.p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleMode}
                  className="px-10 py-3 text-sm font-medium bg-transparent border border-zinc-300 rounded-full hover:bg-zinc-900 hover:bg-opacity-10 transition-all duration-300 tracking-wide"
                >
                  LOGIN
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>








        {/* Login Form */}
        <motion.div 
          animate={{ 
            opacity: isSignUp ? 0 : 1,
            x: isSignUp ? -50 : 0
          }}
          transition={{ duration: 0.5 }}
          className="absolute top-0 left-0 w-1/2 h-full flex items-center justify-center"
          style={{ pointerEvents: isSignUp ? 'none' : 'auto' }}
        >
          <div className="w-4/5 max-w-sm">

             <AnimatePresence mode="wait">
            {showError&&errorMessage!== "" && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  y: -10, 
                  scale: 0.95,
                  transition: { duration: 0.2 }
                }}
                className="mb-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4 backdrop-blur-sm"
              >
                <div className="flex items-start gap-3">
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ 
                      rotate: [0, -10, 10, -10, 0],
                      transition: { duration: 0.5 }
                    }}
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  </motion.div>
                  
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-200 mb-1">
                      Invalid Credentials
                    </h3>
                    <p className="text-sm text-red-300/90">
                      {errorMessage}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setShowError(false)}
                    className="text-red-300 hover:text-red-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


            <motion.h2 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-semibold text-white mb-8 text-center tracking-tight"
            >
              Login
            </motion.h2>
            
            <motion.input
              whileFocus={{ scale: 1.01 }}
              type="email"
              name="email"
              required
              placeholder="Email Address"
              value={formData.email}
              onChange={(e)=>{handleInputChange(e); handleEmailValidation(e);}}
              className="w-full h-10 px-3 py-2 text-sm mb-4 bg-transparent border border-zinc-900 rounded-md outline-none text-white placeholder-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all duration-200"
            />
            
            <motion.input
              whileFocus={{ scale: 1.01 }}
              type="password"
              name="password"
              required
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full h-10 px-3 py-2 text-sm mb-4 bg-transparent border border-zinc-900 rounded-md outline-none text-white placeholder-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all duration-200"
            />

            <motion.button
            onClick={handleGoogleAuth}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}  
              style={{ 
                background: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
              }}
              className="px-0 py-0 mb-4 text-sm font-medium border border-zinc-900 rounded-full hover:bg-zinc-900 hover:bg-opacity-10 transition-all duration-300 tracking-wide"
               ><Button variant='icon'><img src={googleLogo.src} alt="google" className="w-4 h-4" /></Button></motion.button>

            <motion.button
             type='submit'
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              className="w-full h-10  text-sm font-medium text-white rounded-md mb-4 tracking-wide transition-all duration-300"
              style={{ 
                background: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                pointerEvents: !allowSubmit || showError ? 'none' : 'auto',
                opacity: !allowSubmit || showError ? 0.6 : 1

              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #52667a 0%, #3d4f63 100%)';
                e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #475569 0%, #334155 100%)';
                e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.3)';
              }}

              
              
            >
              LOGIN
            </motion.button>
            
            <p className="text-center text-sm text-zinc-600">
              <motion.a 
                whileHover={{ scale: 1.05 }}
                href="#" 
                className="font-medium hover:text-zinc-500 transition-colors"
                style={{ color: '#71717a' }}
              >
                Forgot password?
              </motion.a>
            </p>
          </div>
        </motion.div>










        {/* Sign Up Form */}
        <motion.div 
          animate={{ 
            opacity: !isSignUp ? 0 : 1,
            x: !isSignUp ? 50 : 0
          }}
          transition={{ duration: 0.5 }}
          className="absolute top-0 right-0 w-1/2 h-full flex items-center justify-center"
          style={{ pointerEvents: !isSignUp ? 'none' : 'auto' }}
        >
          <div className="w-4/5 max-w-sm">

                       <AnimatePresence mode="wait">
            {showError&&errorMessage!== "" && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  y: -10, 
                  scale: 0.95,
                  transition: { duration: 0.2 }
                }}
                className="mb-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4 backdrop-blur-sm"
              >
                <div className="flex items-start gap-3">
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ 
                      rotate: [0, -10, 10, -10, 0],
                      transition: { duration: 0.5 }
                    }}
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  </motion.div>
                  
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-200 mb-1">
                      Invalid Credentials
                    </h3>
                    <p className="text-sm text-red-300/90">
                      {errorMessage}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setShowError(false)}
                    className="text-red-300 hover:text-red-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


            <motion.h2 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-semibold text-white mb-6 text-center tracking-tight"
            >
              Sign Up
            </motion.h2>
            
            <div className="flex gap-3 mb-3">
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-1/2 h-10 px-3 py-2 text-sm bg-transparent border border-zinc-900 rounded-md outline-none text-white placeholder-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all duration-200"
              />
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-1/2 h-10 px-3 py-2 text-sm bg-transparent border border-zinc-900 rounded-md outline-none text-white placeholder-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all duration-200"
              />
            </div>
            
            <motion.input
              whileFocus={{ scale: 1.01 }}
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e)=>{handleInputChange(e); handleEmailValidation(e);}}
              className="w-full h-10 px-3 py-2 text-sm mb-3 bg-transparent border border-zinc-900 rounded-md outline-none text-white placeholder-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all duration-200"
            />
            
            <motion.input
            ref={pref}
              whileFocus={{ scale: 1.01 }}
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={
                (e) => {
                  handleInputChange(e);
                  handlePasswordValidation();
                }
              }
              className="w-full h-10 px-3 py-2 text-sm mb-3 bg-transparent border border-zinc-900 rounded-md outline-none text-white placeholder-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all duration-200"
            />
            
            <motion.input
            ref={cpref}
              whileFocus={{ scale: 1.01 }}
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={
                (e) => {
                  handleInputChange(e);
                  handlePasswordValidation();
                }
              }

              className="w-full h-10 px-3 py-2 text-sm mb-5 bg-transparent border border-zinc-900 rounded-md outline-none text-white placeholder-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all duration-200"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}  
              style={{ 
                background: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
              }}
              className="px-0 py-0 mb-4 text-sm font-medium border border-zinc-900 rounded-full hover:bg-zinc-900 hover:bg-opacity-10 transition-all duration-300 tracking-wide"
               ><Button variant='icon'><img src={googleLogo.src} alt="google" className="w-4 h-4" /></Button></motion.button>

            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              className="w-full h-10 text-sm font-medium text-white rounded-md tracking-wide transition-all duration-300"
              style={{ 
                background: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                pointerEvents: !allowSubmit || showError ? 'none' : 'auto',
                opacity: !allowSubmit || showError ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #52667a 0%, #3d4f63 100%)';
                e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #475569 0%, #334155 100%)';
                e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.3)';
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