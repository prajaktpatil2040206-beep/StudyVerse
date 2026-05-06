import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { database, ref, set, get } from '../services/firebase';
import { FiUser, FiMail, FiPhone, FiCalendar, FiMapPin, FiBook, FiTarget, FiClock, FiImage, FiArrowRight, FiCheck } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './Auth.css';

const fields = [
  { name: 'name', label: 'Full Name', icon: <FiUser />, type: 'text', placeholder: 'John Doe', required: true },
  { name: 'email', label: 'Email Address', icon: <FiMail />, type: 'email', placeholder: 'john@example.com', required: true },
  { name: 'phone', label: 'Phone Number', icon: <FiPhone />, type: 'tel', placeholder: '+91 9876543210', required: true },
  { name: 'dob', label: 'Date of Birth', icon: <FiCalendar />, type: 'date', required: true },
  { name: 'gender', label: 'Gender', icon: <FiUser />, type: 'select', options: ['Male', 'Female', 'Other'], required: true },
  { name: 'college', label: 'College / University', icon: <FiBook />, type: 'text', placeholder: 'MIT University', required: true },
  { name: 'course', label: 'Course / Program', icon: <FiBook />, type: 'text', placeholder: 'B.Tech Computer Science', required: true },
  { name: 'year', label: 'Year of Study', icon: <FiCalendar />, type: 'select', options: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'], required: true },
  { name: 'domain', label: 'Domain / Specialization', icon: <FiTarget />, type: 'text', placeholder: 'Web Development, AI/ML', required: true },
  { name: 'city', label: 'City', icon: <FiMapPin />, type: 'text', placeholder: 'Mumbai', required: true },
  { name: 'state', label: 'State', icon: <FiMapPin />, type: 'text', placeholder: 'Maharashtra', required: true },
  { name: 'studyTime', label: 'Preferred Study Time', icon: <FiClock />, type: 'select', options: ['Morning (6-10 AM)', 'Afternoon (12-4 PM)', 'Evening (4-8 PM)', 'Night (8 PM-12 AM)', 'Late Night (12-4 AM)'], required: true },
  { name: 'dailyHours', label: 'Daily Study Hours Target', icon: <FiClock />, type: 'select', options: ['1-2 hours', '3-4 hours', '5-6 hours', '7-8 hours', '8+ hours'], required: true },
  { name: 'bio', label: 'Bio / About', icon: <FiUser />, type: 'textarea', placeholder: 'Tell us about yourself...', required: false },
];

export default function Register() {
  const [form, setForm] = useState({});
  const [step, setStep] = useState(0);
  const [profilePic, setProfilePic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const stepsConfig = [
    { title: 'Personal Info', range: [0, 4] },
    { title: 'Academic Details', range: [4, 8] },
    { title: 'Preferences', range: [8, 14] },
  ];

  const currentFields = fields.slice(stepsConfig[step].range[0], stepsConfig[step].range[1]);

  const handleChange = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfilePic(reader.result);
    reader.readAsDataURL(file);
  };

  const validateStep = () => {
    for (const f of currentFields) {
      if (f.required && !form[f.name]?.trim()) {
        setError(`${f.label} is required`);
        return false;
      }
    }
    setError('');
    return true;
  };

  const handleNext = () => { if (validateStep()) setStep(s => s + 1); };
  const handlePrev = () => setStep(s => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;
    setLoading(true);
    setError('');
    try {
      const uid = form.email.replace(/[.@]/g, '_');
      const existing = await get(ref(database, `users/${uid}/profile`));
      if (existing.exists()) { setError('Email already registered. Please login.'); setLoading(false); return; }
      await set(ref(database, `users/${uid}/profile`), {
        ...form, profilePic: profilePic || '', createdAt: new Date().toISOString(),
        uid,
      });
      await set(ref(database, `users/${uid}/gamification`), { xp: 0, streak: 0, badges: {}, level: 1 });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="auth-page">
        <motion.div className="auth-card success-card" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="success-icon">🎉</div>
          <h2>Registration Successful!</h2>
          <p>Redirecting to login...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <motion.div className="auth-card register-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div className="auth-header">
          <h1>📚 Join StudyVerse</h1>
          <p>Create your account and start your journey</p>
        </div>
        <div className="step-indicator">
          {stepsConfig.map((s, i) => (
            <div key={i} className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}>
              {i < step ? <FiCheck size={14} /> : i + 1}
              <span className="step-label">{s.title}</span>
            </div>
          ))}
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
          <AnimatePresence mode="wait">
            <motion.div key={step} className="form-fields" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              {currentFields.map(f => (
                <div className="input-group" key={f.name}>
                  <label>{f.icon} {f.label}</label>
                  {f.type === 'select' ? (
                    <select className="input-field" value={form[f.name] || ''} onChange={e => handleChange(f.name, e.target.value)}>
                      <option value="">Select...</option>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea className="input-field" rows={3} placeholder={f.placeholder} value={form[f.name] || ''} onChange={e => handleChange(f.name, e.target.value)} />
                  ) : (
                    <input className="input-field" type={f.type} placeholder={f.placeholder} value={form[f.name] || ''} onChange={e => handleChange(f.name, e.target.value)} />
                  )}
                </div>
              ))}
              {step === 2 && (
                <div className="input-group">
                  <label><FiImage /> Profile Picture</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="input-field file-input" />
                  {profilePic && <img src={profilePic} alt="Preview" className="pic-preview" />}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="auth-actions">
            {step > 0 && <button type="button" className="btn btn-secondary" onClick={handlePrev}>Back</button>}
            {step < 2 ? (
              <button type="submit" className="btn btn-primary">Next <FiArrowRight /></button>
            ) : (
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account 🚀'}
              </button>
            )}
          </div>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Login here</Link></p>
      </motion.div>
    </div>
  );
}
