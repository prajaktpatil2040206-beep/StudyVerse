import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { moodQuestions, getMoodMessage } from '../utils/moodWeights';
import { database, ref, set } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import './MoodAnalysis.css';

export default function MoodAnalysis({ onComplete }) {
  const { user } = useAuth();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const handleSelect = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleNext = async () => {
    if (currentQ < moodQuestions.length - 1) {
      setCurrentQ(c => c + 1);
    } else {
      const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
      const moodResult = getMoodMessage(totalScore);
      setResult(moodResult);
      const today = new Date().toISOString().split('T')[0];
      try {
        await set(ref(database, `users/${user.uid}/mood/${today}`), {
          ...answers, totalScore, type: moodResult.type, timestamp: new Date().toISOString()
        });
      } catch (e) { console.error(e); }
      setTimeout(() => onComplete && onComplete(moodResult), 3000);
    }
  };

  if (result) {
    return (
      <motion.div className="mood-result" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className="mood-result-emoji" style={{ color: result.color }}>
          <FiCheck size={36} />
        </div>
        <p style={{ color: result.color }}>{result.message}</p>
      </motion.div>
    );
  }

  const q = moodQuestions[currentQ];

  return (
    <div className="mood-analysis">
      <div className="mood-progress">
        {moodQuestions.map((_, i) => (
          <div key={i} className={`mood-dot ${i === currentQ ? 'active' : i < currentQ ? 'done' : ''}`} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={currentQ} className="mood-card" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
          <div className="mood-emoji" style={{ fontSize: 22 }}>{q.emoji}</div>
          <h3>{q.question}</h3>
          <div className="mood-options">
            {q.options.map(opt => (
              <label key={opt.value} className={`mood-option ${answers[q.id] === opt.value ? 'selected' : ''}`}>
                <input type="radio" name={q.id} value={opt.value} checked={answers[q.id] === opt.value} onChange={() => handleSelect(q.id, opt.value)} />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleNext} disabled={!answers[q.id]}>
            {currentQ < moodQuestions.length - 1 ? <>Next <FiArrowRight /></> : <><FiCheck /> See Result</>}
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
