import { FiHeart, FiGithub, FiMail } from 'react-icons/fi';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner container">
        <div className="footer-grid">
          <div className="footer-col">
            <h3 className="footer-brand">📚 StudyVerse</h3>
            <p className="footer-desc">Your AI-powered companion for academic excellence. Track, learn, grow.</p>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="/home">Home</a></li>
              <li><a href="/gamification">Gamification</a></li>
              <li><a href="/mentor">AI Mentor</a></li>
              <li><a href="/dashboard">Dashboard</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Features</h4>
            <ul>
              <li>Smart Timetable</li>
              <li>AI Teacher</li>
              <li>Progress Tracking</li>
              <li>Daily Challenges</li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <ul>
              <li><FiMail size={14} /> support@studyverse.app</li>
              <li><FiGithub size={14} /> github.com/studyverse</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>Made with <FiHeart size={14} className="heart-icon" /> by Team StudyVerse &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}
