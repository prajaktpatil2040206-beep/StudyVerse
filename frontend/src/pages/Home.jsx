import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { database, ref, get } from '../services/firebase';
import MoodAnalysis from '../components/MoodAnalysis';
import QuoteRotator from '../components/QuoteRotator';
import TodoList from '../components/TodoList';
import Timetable from '../components/Timetable';
import AchievementMarquee from '../components/AchievementMarquee';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiAward, FiTarget } from 'react-icons/fi';
import './Home.css';

export default function Home() {
  const { user } = useAuth();
  const [showMood, setShowMood] = useState(false);
  const [moodDone, setMoodDone] = useState(false);
  const [stats, setStats] = useState({ xp: 0, streak: 0, level: 1 });

  useEffect(() => {
    if (!user?.uid) return;
    const today = new Date().toISOString().split('T')[0];
    get(ref(database, `users/${user.uid}/mood/${today}`)).then(snap => {
      if (!snap.exists()) setShowMood(true);
      else setMoodDone(true);
    });
    get(ref(database, `users/${user.uid}/gamification`)).then(snap => {
      if (snap.exists()) setStats(snap.val());
    });
  }, [user]);

  const handleMoodComplete = () => {
    setShowMood(false);
    setMoodDone(true);
  };

  return (
    <div className="page">
      <div className="container">
        {/* Welcome Section */}
        <motion.div className="welcome-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="welcome-text">
            <h1>Hello, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="welcome-sub">Every day is a new chance to grow. Let's make today count!</p>
          </div>
          <div className="quick-stats">
            <div className="quick-stat"><FiTrendingUp className="qs-icon" /><div><span className="qs-val">{stats.streak || 0}</span><span className="qs-label">Day Streak</span></div></div>
            <div className="quick-stat"><FiAward className="qs-icon" /><div><span className="qs-val">{stats.xp || 0}</span><span className="qs-label">XP Earned</span></div></div>
            <div className="quick-stat"><FiTarget className="qs-icon" /><div><span className="qs-val">Lvl {stats.level || 1}</span><span className="qs-label">Current</span></div></div>
          </div>
        </motion.div>

        {/* Mood Analysis */}
        {showMood && !moodDone && (
          <motion.div className="section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="section-title">🌤️ How are you feeling today?</h2>
            <MoodAnalysis onComplete={handleMoodComplete} />
          </motion.div>
        )}

        {/* Hero Quote */}
        <motion.div className="hero-quote-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="hero-quote-card">
            <div className="quote-icon">💡</div>
            <QuoteRotator />
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="home-grid">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <TodoList />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Timetable />
          </motion.div>
        </div>

        {/* Achievement Marquee */}
        <motion.div className="section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <AchievementMarquee />
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
