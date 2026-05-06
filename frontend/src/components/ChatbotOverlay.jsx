import { useState } from 'react';
import { FiMessageCircle, FiX, FiSend } from 'react-icons/fi';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './ChatbotOverlay.css';

export default function ChatbotOverlay() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ role: 'assistant', content: "Hello! I am your StudyVerse assistant. Need help using the platform? I am here to guide you." }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const send = async () => {
    if (!input.trim()) return;
    setMsgs(p => [...p, { role: 'user', content: input }]);
    const msg = input; setInput(''); setLoading(true);
    try {
      const r = await api.chat({ message: `[Platform Guide Mode] ${msg}`, history: msgs.slice(-6), userId: user.uid });
      setMsgs(p => [...p, { role: 'assistant', content: r.response || r.message || 'I am here to help!' }]);
    } catch {
      setMsgs(p => [...p, { role: 'assistant', content: 'Connection issue. Try: Home for tasks, Gamification for challenges, Mentor for AI help, Dashboard for analytics.' }]);
    }
    setLoading(false);
  };

  return (
    <>
      <button className={`chatbot-fab ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-label="Open assistant">
        {open ? <FiX size={22} /> : <FiMessageCircle size={22} />}
      </button>
      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <span>StudyVerse Assistant</span>
            <button onClick={() => setOpen(false)} aria-label="Close"><FiX /></button>
          </div>
          <div className="chatbot-msgs">
            {msgs.map((m, i) => (
              <div key={i} className={`cb-msg ${m.role}`}>
                <div className="cb-bubble">{m.content}</div>
              </div>
            ))}
            {loading && <div className="cb-msg assistant"><div className="cb-bubble cb-typing"><span /><span /><span /></div></div>}
          </div>
          <div className="chatbot-input">
            <input placeholder="Ask anything..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
            <button onClick={send} disabled={loading || !input.trim()}><FiSend /></button>
          </div>
        </div>
      )}
    </>
  );
}
