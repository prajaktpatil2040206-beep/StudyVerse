import { useState, useEffect } from 'react';
import { database, ref, set, get, push, update, remove, onValue } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiClock, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './TodoList.css';

export default function TodoList() {
  const { user } = useAuth();
  const [todos, setTodos] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', deadline: '', priority: 'medium' });
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user?.uid) return;
    const todosRef = ref(database, `users/${user.uid}/todos/${today}`);
    const unsub = onValue(todosRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setTodos(Object.entries(data).map(([id, val]) => ({ id, ...val })));
      } else { setTodos([]); }
    });
    return () => unsub();
  }, [user, today]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const todosRef = ref(database, `users/${user.uid}/todos/${today}`);
    if (editId) {
      await update(ref(database, `users/${user.uid}/todos/${today}/${editId}`), form);
      setEditId(null);
    } else {
      const newRef = push(todosRef);
      await set(newRef, { ...form, completed: false, createdAt: new Date().toISOString() });
    }
    setForm({ title: '', description: '', deadline: '', priority: 'medium' });
    setShowAdd(false);
  };

  const toggleComplete = async (id, current) => {
    await update(ref(database, `users/${user.uid}/todos/${today}/${id}`), { completed: !current });
  };

  const handleDelete = async (id) => {
    await remove(ref(database, `users/${user.uid}/todos/${today}/${id}`));
  };

  const handleEdit = (todo) => {
    setForm({ title: todo.title, description: todo.description || '', deadline: todo.deadline || '', priority: todo.priority || 'medium' });
    setEditId(todo.id);
    setShowAdd(true);
  };

  const completedCount = todos.filter(t => t.completed).length;
  const progress = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;

  return (
    <div className="todo-container">
      <div className="todo-header">
        <div>
          <h3>📋 Today's Tasks</h3>
          {todos.length > 0 && <span className="todo-count">{completedCount}/{todos.length} done</span>}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowAdd(!showAdd); setEditId(null); setForm({ title: '', description: '', deadline: '', priority: 'medium' }); }}>
          {showAdd ? <><FiX /> Cancel</> : <><FiPlus /> Add Task</>}
        </button>
      </div>
      {todos.length > 0 && (
        <div className="todo-progress-bar">
          <div className="todo-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
      <AnimatePresence>
        {showAdd && (
          <motion.div className="todo-form card" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <input className="input-field" placeholder="Task title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <input className="input-field" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="todo-form-row">
              <input className="input-field" type="time" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              <select className="input-field" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <button className="btn btn-success btn-sm" onClick={handleSave}>{editId ? 'Update' : 'Add'}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {todos.length === 0 && !showAdd ? (
        <div className="todo-empty">
          <span className="todo-empty-emoji">🎯</span>
          <p>No tasks yet! Add tasks to conquer today.</p>
        </div>
      ) : (
        <div className="todo-list">
          <AnimatePresence>
            {todos.sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0)).map(todo => (
              <motion.div key={todo.id} className={`todo-item ${todo.completed ? 'done' : ''} priority-${todo.priority}`}
                layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }}>
                <button className={`todo-check ${todo.completed ? 'checked' : ''}`} onClick={() => toggleComplete(todo.id, todo.completed)}>
                  {todo.completed && <FiCheck size={14} />}
                </button>
                <div className="todo-content">
                  <span className="todo-title">{todo.title}</span>
                  {todo.description && <span className="todo-desc">{todo.description}</span>}
                </div>
                {todo.deadline && <span className="todo-deadline"><FiClock size={12} /> {todo.deadline}</span>}
                <div className="todo-actions">
                  <button onClick={() => handleEdit(todo)}><FiEdit2 size={14} /></button>
                  <button onClick={() => handleDelete(todo.id)}><FiTrash2 size={14} /></button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
