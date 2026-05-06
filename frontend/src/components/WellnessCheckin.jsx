import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { database, ref, set as fbSet } from '../services/firebase';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHeart, FiMoon, FiActivity, FiZap, FiSmile } from 'react-icons/fi';
import './WellnessCheckin.css';

const MOODS = ['😢', '😟', '😐', '😊', '😄'];
const STRESS = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];
const ENERGY = ['Exhausted', 'Tired', 'Okay', 'Energetic', 'Super!'];

export default function WellnessCheckin({ onComplete }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0); // 0=mood, 1=sleep, 2=stress/energy, 3=exercise
  const [data, setData] = useState({
    mood: 3, sleepHours: 7, stress: 3, energy: 3, exercise: false,
  });
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const save = async () => {
    setSaving(true);
    try {
      await fbSet(ref(database, `users/${user.uid}/wellness/${today}`), {
        ...data, date: today, recordedAt: new Date().toISOString(),
      });
      // Also store in productivity habits
      await fbSet(ref(database, `users/${user.uid}/productivity/habits/${today}`), data);
      await api.wellnessCheckin({ userId: user.uid, date: today, ...data });
    } catch (e) { console.error(e); }
    setSaving(false);
    onComplete && onComplete(data);
  };

  return (
    <div className="wellness-card card">
      <div className="wellness-header">
        <FiHeart className="wellness-heart" />
        <h3>Daily Wellness Check-in</h3>
        <p>Quick check-in to track your mental & physical state</p>
      </div>

      <div className="wellness-progress-bar">
        <div className="wellness-progress-fill" style={{ width: `${((step + 1) / 4) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="mood" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="wellness-step">
            <div className="wellness-step-title"><FiSmile /> How are you feeling today?</div>
            <div className="mood-emojis">
              {MOODS.map((em, i) => (
                <button key={i} className={`mood-emoji ${data.mood === i + 1 ? 'selected' : ''}`}
                  onClick={() => setData(d => ({ ...d, mood: i + 1 }))}>
                  <span>{em}</span>
                  <small>{['Sad', 'Low', 'Okay', 'Good', 'Great'][i]}</small>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="sleep" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="wellness-step">
            <div className="wellness-step-title"><FiMoon /> How many hours did you sleep?</div>
            <div className="sleep-slider-wrap">
              <input type="range" min="3" max="12" step="0.5" value={data.sleepHours}
                onChange={e => setData(d => ({ ...d, sleepHours: parseFloat(e.target.value) }))}
                className="sleep-slider" />
              <div className="sleep-display">{data.sleepHours}h</div>
              <div className="sleep-hint">
                {data.sleepHours < 6 ? '😴 Too little — affects focus' :
                  data.sleepHours < 7 ? '😐 Below optimal' :
                    data.sleepHours <= 9 ? '✅ Great sleep!' : '😪 Might be oversleeping'}
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="stress" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="wellness-step">
            <div className="wellness-step-title"><FiZap /> Stress & Energy levels?</div>
            <div className="wellness-row">
              <label>Stress Level</label>
              <div className="level-btns">
                {STRESS.map((s, i) => (
                  <button key={i} className={`level-btn ${data.stress === i + 1 ? 'sel-stress' : ''}`}
                    onClick={() => setData(d => ({ ...d, stress: i + 1 }))}>{s}</button>
                ))}
              </div>
            </div>
            <div className="wellness-row" style={{ marginTop: 16 }}>
              <label>Energy Level</label>
              <div className="level-btns">
                {ENERGY.map((e, i) => (
                  <button key={i} className={`level-btn ${data.energy === i + 1 ? 'sel-energy' : ''}`}
                    onClick={() => setData(d => ({ ...d, energy: i + 1 }))}>{e}</button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="exercise" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="wellness-step">
            <div className="wellness-step-title"><FiActivity /> Did you exercise today?</div>
            <div className="exercise-btns">
              <button className={`exercise-opt ${data.exercise ? 'yes' : ''}`} onClick={() => setData(d => ({ ...d, exercise: true }))}>
                💪 Yes, I worked out!
              </button>
              <button className={`exercise-opt ${!data.exercise ? 'no' : ''}`} onClick={() => setData(d => ({ ...d, exercise: false }))}>
                🪑 Not today
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="wellness-footer">
        {step > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={() => setStep(s => s - 1)}>Back</button>
        )}
        {step < 3 ? (
          <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Next</button>
        ) : (
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : '✓ Complete Check-in'}
          </button>
        )}
      </div>
    </div>
  );
}
