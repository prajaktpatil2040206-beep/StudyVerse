import { useState, useEffect, useRef } from 'react';
import { FiVolume2, FiMic, FiChevronLeft, FiChevronRight, FiClock, FiCheck } from 'react-icons/fi';
import './MCQQuiz.css';

const TIMER_MAP = { 10: 20 * 60, 15: 30 * 60, 25: 45 * 60, 50: 90 * 60 };

export default function MCQQuiz({ questions = [], onFinish, onCancel }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('quiz_answers') || '{}'); } catch { return {}; }
  });
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = sessionStorage.getItem('quiz_timeleft');
    return saved ? parseInt(saved) : TIMER_MAP[questions.length] || 20 * 60;
  });
  const [listening, setListening] = useState(false);
  const intervalRef = useRef(null);

  // Persist answers and time to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('quiz_answers', JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    sessionStorage.setItem('quiz_timeleft', String(timeLeft));
  }, [timeLeft]);

  // Countdown timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(intervalRef.current); handleFinish(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleFinish = () => {
    clearInterval(intervalRef.current);
    sessionStorage.removeItem('quiz_answers');
    sessionStorage.removeItem('quiz_timeleft');
    onFinish && onFinish(answers);
  };

  const setAnswer = (idx, val) => setAnswers(a => ({ ...a, [idx]: val }));

  const speakQuestion = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.9; utt.lang = 'en-US';
      window.speechSynthesis.speak(utt);
    }
  };

  const startVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input requires Chrome or Edge'); return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR(); r.lang = 'en-US'; r.continuous = false;
    r.onresult = e => {
      const txt = e.results[0][0].transcript;
      setAnswer(current, (answers[current] || '') + ' ' + txt);
      setListening(false);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start(); setListening(true);
  };

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const isUrgent = timeLeft < 300;
  const q = questions[current];
  const answeredCount = Object.keys(answers).length;

  if (!q) return null;

  return (
    <div className="mcq-quiz">
      {/* Top Bar */}
      <div className="mcq-topbar">
        <div className="mcq-progress-info">
          <span>{answeredCount}/{questions.length} answered</span>
          <div className="mcq-progress-bar">
            <div className="mcq-progress-fill" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
          </div>
        </div>
        <div className={`mcq-timer ${isUrgent ? 'urgent' : ''}`}>
          <FiClock size={14} />
          <span>{mins}:{secs}</span>
        </div>
      </div>

      <div className="mcq-body">
        {/* Left: Question Navigator */}
        <div className="mcq-navigator">
          <div className="mcq-nav-title">Questions</div>
          <div className="mcq-nav-grid">
            {questions.map((_, i) => (
              <button key={i}
                className={`mcq-nav-btn ${i === current ? 'current' : answers[i] !== undefined ? 'answered' : ''}`}
                onClick={() => setCurrent(i)}>
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mcq-nav-legend">
            <div><span className="nav-dot current-dot" />Current</div>
            <div><span className="nav-dot answered-dot" />Answered</div>
            <div><span className="nav-dot unanswered-dot" />Pending</div>
          </div>
        </div>

        {/* Right: Question Area */}
        <div className="mcq-question-area">
          <div className="mcq-qnum">
            Question {current + 1} of {questions.length}
            <span className={`mcq-type-badge ${q.type}`}>{q.type === 'mcq' ? 'Multiple Choice' : 'Written Answer'}</span>
          </div>

          <div className="mcq-question-text">
            <span>{q.question}</span>
            <button className="mcq-speak-btn" onClick={() => speakQuestion(q.question)} title="Listen to question">
              <FiVolume2 size={16} />
            </button>
          </div>

          {/* MCQ Options */}
          {q.type === 'mcq' && q.options && (
            <div className="mcq-options">
              {Object.entries(q.options).map(([key, val]) => (
                <button key={key}
                  className={`mcq-option ${answers[current] === key ? 'selected' : ''}`}
                  onClick={() => setAnswer(current, key)}>
                  <span className="mcq-option-key">{key}</span>
                  <span className="mcq-option-val">{val}</span>
                  {answers[current] === key && <FiCheck className="mcq-option-check" />}
                </button>
              ))}
            </div>
          )}

          {/* Text Answer */}
          {q.type === 'text' && (
            <div className="mcq-text-area-wrap">
              <textarea
                className="input-field mcq-textarea"
                rows={5}
                placeholder="Type your answer here, or click the mic to speak..."
                value={answers[current] || ''}
                onChange={e => setAnswer(current, e.target.value)}
              />
              <button className={`mcq-mic-btn ${listening ? 'listening' : ''}`} onClick={startVoice} title="Voice input">
                <FiMic size={18} />
                {listening && <span className="mic-pulse" />}
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="mcq-nav-btns">
            <button className="btn btn-secondary btn-sm" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
              <FiChevronLeft /> Previous
            </button>
            {current < questions.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)}>
                Next <FiChevronRight />
              </button>
            ) : (
              <button className="btn btn-success" onClick={handleFinish}>
                <FiCheck /> Submit All
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mcq-footer">
        <button className="btn btn-danger btn-sm" onClick={onCancel}>Quit Assessment</button>
        <button className="btn btn-success" onClick={handleFinish}>
          Submit & Get Results ({answeredCount}/{questions.length})
        </button>
      </div>
    </div>
  );
}
