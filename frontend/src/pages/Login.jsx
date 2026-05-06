import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { database, ref, get } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FiMail, FiLock, FiArrowRight } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email'); return; }
    setLoading(true);
    setError('');
    try {
      const uid = email.replace(/[.@]/g, '_');
      const snap = await get(ref(database, `users/${uid}/profile`));
      if (!snap.exists()) { setError('Email not registered. Please sign up first.'); setLoading(false); return; }
      await api.sendOtp(email);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Make sure the backend is running.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) { setError('Please enter the OTP'); return; }
    setLoading(true);
    setError('');
    try {
      await api.verifyOtp(email, otp);
      const uid = email.replace(/[.@]/g, '_');
      const snap = await get(ref(database, `users/${uid}/profile`));
      const userData = snap.val();
      await login({ ...userData, uid });
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <motion.div className="auth-card login-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div className="auth-header">
          <h1>📚 Welcome Back!</h1>
          <p>Login to continue your learning journey</p>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <AnimatePresence mode="wait">
          {step === 'email' ? (
            <motion.form key="email" onSubmit={handleSendOtp} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="input-group">
                <label><FiMail /> Email Address</label>
                <input className="input-field" type="email" placeholder="Enter your registered email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="auth-actions">
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Sending OTP...' : 'Send OTP'} <FiArrowRight />
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.form key="otp" onSubmit={handleVerifyOtp} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="otp-sent-msg">
                <span>📧</span> OTP sent to <strong>{email}</strong>
              </div>
              <div className="input-group">
                <label><FiLock /> Enter OTP</label>
                <input className="input-field otp-input" type="text" placeholder="Enter 6-digit OTP" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} />
              </div>
              <div className="auth-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setStep('email'); setOtp(''); setError(''); }}>Back</button>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? 'Verifying...' : 'Login 🚀'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
        <p className="auth-switch">Don't have an account? <Link to="/register">Sign up here</Link></p>
      </motion.div>
    </div>
  );
}
