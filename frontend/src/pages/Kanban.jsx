import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { database, ref, onValue, set as fbSet, update, push, remove } from '../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiX, FiEdit2, FiCheck, FiClock, FiFlag } from 'react-icons/fi';
import Footer from '../components/Footer';
import './Kanban.css';

const COLUMNS = [
  { id: 'backlog', label: 'Backlog', color: '#b2bec3', icon: '📋' },
  { id: 'todo', label: 'To Do', color: '#6C63FF', icon: '📌' },
  { id: 'inprogress', label: 'In Progress', color: '#FDCB6E', icon: '⚡' },
  { id: 'review', label: 'Review', color: '#0984E3', icon: '👀' },
  { id: 'done', label: 'Done', color: '#00B894', icon: '✅' },
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const PRIORITY_COLORS = { low: '#00B894', medium: '#FDCB6E', high: '#E17055', urgent: '#d63031' };

function newCard(colId, title) {
  return { id: Date.now().toString(), title, description: '', priority: 'medium', deadline: '', tags: [], column: colId, createdAt: new Date().toISOString() };
}

export default function Kanban() {
  const { user } = useAuth();
  const [cards, setCards] = useState({});
  const [addingIn, setAddingIn] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [editCard, setEditCard] = useState(null);
  const [dragCard, setDragCard] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const editRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onValue(ref(database, `users/${user.uid}/kanban`), snap => {
      setCards(snap.exists() ? snap.val() : {});
    });
    return () => unsub();
  }, [user]);

  const saveCard = async (card) => {
    await fbSet(ref(database, `users/${user.uid}/kanban/${card.id}`), card);
  };

  const addCard = async (colId) => {
    if (!newTitle.trim()) return;
    const card = newCard(colId, newTitle.trim());
    await saveCard(card);
    setNewTitle(''); setAddingIn(null);
  };

  const deleteCard = async (cardId) => {
    await remove(ref(database, `users/${user.uid}/kanban/${cardId}`));
    if (editCard?.id === cardId) setEditCard(null);
  };

  const moveCard = async (cardId, toCol) => {
    const card = cards[cardId];
    if (!card) return;
    const updated = { ...card, column: toCol, completedAt: toCol === 'done' ? new Date().toISOString() : card.completedAt };
    await saveCard(updated);
  };

  const updateEditCard = (field, val) => setEditCard(c => ({ ...c, [field]: val }));
  const saveEdit = async () => { if (editCard) { await saveCard(editCard); setEditCard(null); } };

  // Drag and drop handlers
  const onDragStart = (e, cardId) => { setDragCard(cardId); e.dataTransfer.effectAllowed = 'move'; };
  const onDragOver = (e, colId) => { e.preventDefault(); setDragOver(colId); };
  const onDrop = async (e, colId) => { e.preventDefault(); if (dragCard) await moveCard(dragCard, colId); setDragCard(null); setDragOver(null); };

  const cardsByCol = (colId) => Object.values(cards).filter(c => c.column === colId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const totalDone = Object.values(cards).filter(c => c.column === 'done').length;
  const total = Object.values(cards).length;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '100%', padding: '0 16px' }}>
        <motion.div className="kanban-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1>Kanban Board</h1>
            <p>Drag & drop tasks across columns to track your workflow</p>
          </div>
          <div className="kanban-meta">
            <span className="k-stat">{total} cards</span>
            <span className="k-stat done-stat">{totalDone} done</span>
            {total > 0 && <div className="k-overall-bar"><div style={{ width: `${(totalDone / total) * 100}%` }} /></div>}
          </div>
        </motion.div>

        <div className="kanban-board">
          {COLUMNS.map(col => {
            const colCards = cardsByCol(col.id);
            return (
              <div key={col.id} className={`kanban-col ${dragOver === col.id ? 'drag-over' : ''}`}
                onDragOver={e => onDragOver(e, col.id)} onDrop={e => onDrop(e, col.id)}>
                {/* Column Header */}
                <div className="kanban-col-header" style={{ borderTopColor: col.color }}>
                  <span className="col-icon">{col.icon}</span>
                  <span className="col-label">{col.label}</span>
                  <span className="col-count" style={{ background: col.color + '20', color: col.color }}>{colCards.length}</span>
                </div>

                {/* Cards */}
                <div className="kanban-cards">
                  <AnimatePresence>
                    {colCards.map(card => (
                      <motion.div key={card.id}
                        className={`kanban-card priority-${card.priority}`}
                        layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                        draggable onDragStart={e => onDragStart(e, card.id)}
                        style={{ borderLeftColor: PRIORITY_COLORS[card.priority] }}>
                        <div className="kc-top">
                          <span className="kc-title">{card.title}</span>
                          <div className="kc-actions">
                            <button onClick={() => setEditCard({ ...card })}><FiEdit2 size={12} /></button>
                            <button onClick={() => deleteCard(card.id)}><FiX size={12} /></button>
                          </div>
                        </div>
                        {card.description && <p className="kc-desc">{card.description}</p>}
                        <div className="kc-footer">
                          <span className="kc-priority" style={{ color: PRIORITY_COLORS[card.priority] }}>
                            <FiFlag size={10} /> {card.priority}
                          </span>
                          {card.deadline && <span className="kc-deadline"><FiClock size={10} /> {card.deadline}</span>}
                        </div>
                        {/* Quick move buttons */}
                        <div className="kc-move">
                          {COLUMNS.filter(c => c.id !== col.id).map(c => (
                            <button key={c.id} className="kc-move-btn" style={{ color: c.color }} onClick={() => moveCard(card.id, c.id)} title={`Move to ${c.label}`}>→{c.icon}</button>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Add Card */}
                {addingIn === col.id ? (
                  <div className="kanban-add-card">
                    <textarea className="input-field kc-add-input" rows={2} placeholder="Card title..." autoFocus
                      value={newTitle} onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addCard(col.id); } if (e.key === 'Escape') setAddingIn(null); }} />
                    <div className="kc-add-btns">
                      <button className="btn btn-primary btn-sm" onClick={() => addCard(col.id)}><FiCheck /> Add</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setAddingIn(null)}><FiX /></button>
                    </div>
                  </div>
                ) : (
                  <button className="kanban-add-btn" onClick={() => { setAddingIn(col.id); setNewTitle(''); }}>
                    <FiPlus size={14} /> Add card
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editCard && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditCard(null)}>
            <motion.div className="kanban-modal card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} ref={editRef}>
              <div className="modal-header">
                <h3>Edit Card</h3>
                <button onClick={() => setEditCard(null)}><FiX /></button>
              </div>
              <div className="input-group">
                <label>Title</label>
                <input className="input-field" value={editCard.title} onChange={e => updateEditCard('title', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Description</label>
                <textarea className="input-field" rows={3} value={editCard.description} onChange={e => updateEditCard('description', e.target.value)} placeholder="Add more details..." />
              </div>
              <div className="modal-row">
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Priority</label>
                  <select className="input-field" value={editCard.priority} onChange={e => updateEditCard('priority', e.target.value)}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Deadline</label>
                  <input type="date" className="input-field" value={editCard.deadline} onChange={e => updateEditCard('deadline', e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label>Column</label>
                <select className="input-field" value={editCard.column} onChange={e => updateEditCard('column', e.target.value)}>
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button className="btn btn-danger btn-sm" onClick={() => deleteCard(editCard.id)}>Delete</button>
                <button className="btn btn-primary" onClick={saveEdit}><FiCheck /> Save Changes</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
}
