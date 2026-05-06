import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { database, ref, get } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast'; // Toast notifications
import { api } from '../services/api';
import { validateEmail, validateOTP } from '../utils/validation'; // Input validation
import { FiMail, FiLock, FiArrowRight, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Validate email on blur
  const handleEmailBlur = () => {
    const result = validateEmail(email);
    if (!result.valid) {
      setErrors(prev => ({ ...prev, email: result.error }));
    } else {
      setErrors(prev => ({ ...prev, email: null }));
    }
  };

  // Validate OTP on blur
  const handleOtpBlur = () => {
    const result = validateOTP(otp);
    if (!result.valid) {
      setErrors(prev => ({ ...prev, otp: result.error }));
    } else {
      setErrors(prev => ({ ...prev, otp: null }));
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    
    // Validate email
    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      setErrors({ email: emailResult.error });
      toast.error(emailResult.error);
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      const uid = emailResult.value.replace(/[.@]/g, '_');
      const snap = await get(ref(database, `users/${uid}/profile`));
      if (!snap.exists()) {
        toast.error('Email not registered. Please sign up first.');
        setErrors({ email: 'Email not registered' });
        setLoading(false);
        return;
      }
      await api.sendOtp(emailResult.value);
      toast.success('OTP sent to your email');
      setStep('otp');
    } catch (err) {
      const errorMsg = err.message || 'Failed to send OTP. Please try again.';
      toast.error(errorMsg);
      setErrors({ email: errorMsg });
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    // Validate OTP
    const otpResult = validateOTP(otp);
    if (!otpResult.valid) {
      setErrors({ otp: otpResult.error });
      toast.error(otpResult.error);
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      await api.verifyOtp(email, otpResult.value);
      const uid = email.replace(/[.@]/g, '_');
      const snap = await get(ref(database, `users/${uid}/profile`));
      const userData = snap.val();
      await login({ ...userData, uid });
      toast.success('Login successful!');
      navigate('/home');
    } catch (err) {
      const errorMsg = err.message || 'Invalid OTP. Please try again.';
      toast.error(errorMsg);
      setErrors({ otp: errorMsg });
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <motion.div className="auth-card login-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to continue your learning journey</p>
        </div>
        <AnimatePresence mode="wait">
          {step === 'email' ? (
            <motion.form key="email" onSubmit={handleSendOtp} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="input-group">
                <label htmlFor="email"><FiMail /> Email Address</label>
                <input 
                  id="email"
                  className={`input-field ${errors.email ? 'error' : ''}`}
                  type="email" 
                  placeholder="Enter your registered email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  maxLength={255}
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email && (
                  <div id="email-error" className="input-error" role="alert">
                    <FiAlertCircle size={14} /> {errors.email}
                  </div>
                )}
                {!errors.email && email && validateEmail(email).valid && (
                  <div className="input-success">
                    <FiCheck size={14} /> Valid email
                  </div>
                )}
              </div>
              <div className="auth-actions">
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }} aria-busy={loading}>
                  {loading ? (
                    <>
                      <span className="btn-spinner" /> Sending OTP...
                    </>
                  ) : (
                    <>
                      Send OTP <FiArrowRight />
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.form key="otp" onSubmit={handleVerifyOtp} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="otp-sent-msg">
                OTP sent to <strong>{email}</strong>
              </div>
              <div className="input-group">
                <label htmlFor="otp"><FiLock /> Verification Code</label>
                <input 
                  id="otp"
                  className={`input-field otp-input ${errors.otp ? 'error' : ''}`}
                  type="text" 
                  placeholder="Enter 6-digit OTP" 
                  value={otp} 
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onBlur={handleOtpBlur}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="\d{6}"
                  autoComplete="one-time-code"
                  aria-invalid={!!errors.otp}
                  aria-describedby={errors.otp ? 'otp-error' : undefined}
                />
                {errors.otp && (
                  <div id="otp-error" className="input-error" role="alert">
                    <FiAlertCircle size={14} /> {errors.otp}
                  </div>
                )}
                {!errors.otp && otp && validateOTP(otp).valid && (
                  <div className="input-success">
                    <FiCheck size={14} /> Valid OTP format
                  </div>
                )}
              </div>
              <div className="auth-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setStep('email'); setOtp(''); setErrors({}); }}>Back</button>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading} aria-busy={loading}>
                  {loading ? (
                    <>
                      <span className="btn-spinner" /> Verifying...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
        <p className="auth-switch">Don't have an account? <Link to="/register">Create one</Link></p>
      </motion.div>
    </div>
  );
}
