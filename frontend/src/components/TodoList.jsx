import { useState, useEffect } from 'react';
import { database, ref, set, get, push, update, remove, onValue } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiClock, FiX, FiLock } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationHelper } from '../services/notificationHelper';
import './TodoList.css';

// Check if a todo deadline (HH:MM time string) has passed for today
function isDeadlineExpired(deadline) {
  if (!deadline) return false;
  const now = new Date();
  const [h, m] = deadline.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() > h * 60 + m;
}

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

  // Check for expired tasks every minute and apply penalties
  useEffect(() => {
    if (!user?.uid || todos.length === 0) return;
    
    const checkExpiredTasks = async () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      for (const todo of todos) {
        // Skip if already completed or already marked as expired
        if (todo.completed || todo.expiredPenaltyApplied) continue;
        
        if (todo.deadline) {
          const [h, m] = todo.deadline.split(':').map(Number);
          const deadlineMinutes = h * 60 + m;
          
          // Task has expired
          if (currentMinutes > deadlineMinutes) {
            console.log(`⚠️ Task expired: "${todo.title}"`);
            
            // Mark as expired to prevent duplicate penalties
            await update(ref(database, `users/${user.uid}/todos/${today}/${todo.id}`), {
              expiredPenaltyApplied: true
            });
            
            // Apply DOUBLE XP penalty
            const gamSnap = await get(ref(database, `users/${user.uid}/gamification`));
            const gam = gamSnap.exists() ? gamSnap.val() : { xp: 0, level: 1, streak: 0, badges: {} };
            const xpPenalty = (todo.priority === 'high' ? 30 : todo.priority === 'medium' ? 20 : 10) * 2; // DOUBLE penalty
            const newXp = Math.max(0, (gam.xp || 0) - xpPenalty);
            const newLevel = Math.floor(newXp / 200) + 1;
            
            await update(ref(database, `users/${user.uid}/gamification`), { 
              xp: newXp, 
              level: newLevel 
            });
            
            // Send notification about penalty
            const userPhone = user?.phone || user?.phoneNumber;
            try {
              await notificationHelper.createNotification(
                user.uid,
                '⚠️ Task Expired - XP Penalty',
                `Task "${todo.title}" expired. -${xpPenalty} XP penalty applied.`,
                'warning',
                '/home'
              );
              if (userPhone) {
                await notificationHelper.sendSMS(
                  userPhone,
                  `⚠️ StudyVerse: Task "${todo.title}" expired! -${xpPenalty} XP penalty applied. Complete tasks on time to avoid penalties.`
                );
              }
            } catch (error) {
              console.error('Failed to send expiry notification:', error);
            }
            
            console.log(`⚠️ Applied -${xpPenalty} XP penalty for expired task`);
          }
        }
      }
    };
    
    // Check immediately
    checkExpiredTasks();
    
    // Then check every minute
    const interval = setInterval(checkExpiredTasks, 60000);
    
    return () => clearInterval(interval);
  }, [user, todos, today]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const todosRef = ref(database, `users/${user.uid}/todos/${today}`);
    
    try {
      if (editId) {
        await update(ref(database, `users/${user.uid}/todos/${today}/${editId}`), form);
        setEditId(null);
      } else {
        const newRef = push(todosRef);
        await set(newRef, { ...form, completed: false, createdAt: new Date().toISOString() });
        
        // GUARANTEED: Send notification and SMS for new task
        console.log('📝 Task added, sending notifications...');
        const userPhone = user?.phone || user?.phoneNumber;
        
        try {
          await notificationHelper.notifyTaskAdded(user.uid, userPhone, form.title);
          console.log('✅ Notification sent successfully');
        } catch (notifError) {
          console.error('❌ Notification failed:', notifError);
          // Still continue - don't block task creation
        }
      }
      
      setForm({ title: '', description: '', deadline: '', priority: 'medium' });
      setShowAdd(false);
    } catch (error) {
      console.error('Failed to save task:', error);
      alert('Failed to save task. Please try again.');
    }
  };

  const toggleComplete = async (id, current, deadline) => {
    if (!current && isDeadlineExpired(deadline)) return; // can't complete expired task
    
    const task = todos.find(t => t.id === id);
    if (!task) return;
    
    try {
      // COMPLETING A TASK
      if (!current) {
        await update(ref(database, `users/${user.uid}/todos/${today}/${id}`), { completed: true });
        
        console.log('✅ Task completed, sending notifications...');
        const userPhone = user?.phone || user?.phoneNumber;
        
        // Send notification
        try {
          await notificationHelper.notifyTaskCompleted(user.uid, userPhone, task.title);
          console.log('✅ Completion notification sent');
        } catch (notifError) {
          console.error('❌ Notification failed:', notifError);
        }
        
        // Award XP for completing task
        const gamSnap = await get(ref(database, `users/${user.uid}/gamification`));
        const gam = gamSnap.exists() ? gamSnap.val() : { xp: 0, level: 1, streak: 0, badges: {} };
        const xpReward = task.priority === 'high' ? 30 : task.priority === 'medium' ? 20 : 10;
        const newXp = (gam.xp || 0) + xpReward;
        const newLevel = Math.floor(newXp / 200) + 1;
        await update(ref(database, `users/${user.uid}/gamification`), { 
          xp: newXp, 
          level: newLevel 
        });
        
        // Update activity - INCREMENT tasksCompleted
        const actSnap = await get(ref(database, `users/${user.uid}/activity/${today}`));
        const act = actSnap.exists() ? actSnap.val() : {};
        await update(ref(database, `users/${user.uid}/activity/${today}`), {
          ...act,
          tasksCompleted: (act.tasksCompleted || 0) + 1
        });
        
        // Check if task title contains "study" and hours - extract and add to study hours
        const studyMatch = task.title.match(/study.*?(\d+)\s*(?:hour|hr)/i);
        if (studyMatch) {
          const hours = parseInt(studyMatch[1]);
          const currentStudyHours = act.studyHours || 0;
          await update(ref(database, `users/${user.uid}/activity/${today}`), {
            ...act,
            studyHours: Math.round((currentStudyHours + hours) * 10) / 10,
            tasksCompleted: (act.tasksCompleted || 0) + 1
          });
          console.log(`✅ Added ${hours} study hours from task completion`);
        }
        
        console.log(`✅ Awarded ${xpReward} XP for completing task`);
      } 
      // UNCOMPLETING A TASK (marking as incomplete)
      else {
        await update(ref(database, `users/${user.uid}/todos/${today}/${id}`), { completed: false });
        
        // Deduct XP
        const gamSnap = await get(ref(database, `users/${user.uid}/gamification`));
        const gam = gamSnap.exists() ? gamSnap.val() : { xp: 0, level: 1, streak: 0, badges: {} };
        const xpPenalty = task.priority === 'high' ? 30 : task.priority === 'medium' ? 20 : 10;
        const newXp = Math.max(0, (gam.xp || 0) - xpPenalty);
        const newLevel = Math.floor(newXp / 200) + 1;
        await update(ref(database, `users/${user.uid}/gamification`), { 
          xp: newXp, 
          level: newLevel 
        });
        
        // Decrement tasksCompleted
        const actSnap = await get(ref(database, `users/${user.uid}/activity/${today}`));
        const act = actSnap.exists() ? actSnap.val() : {};
        await update(ref(database, `users/${user.uid}/activity/${today}`), {
          ...act,
          tasksCompleted: Math.max(0, (act.tasksCompleted || 0) - 1)
        });
        
        // Deduct study hours if applicable
        const studyMatch = task.title.match(/study.*?(\d+)\s*(?:hour|hr)/i);
        if (studyMatch) {
          const hours = parseInt(studyMatch[1]);
          const currentStudyHours = act.studyHours || 0;
          await update(ref(database, `users/${user.uid}/activity/${today}`), {
            ...act,
            studyHours: Math.max(0, Math.round((currentStudyHours - hours) * 10) / 10),
            tasksCompleted: Math.max(0, (act.tasksCompleted || 0) - 1)
          });
          console.log(`⚠️ Deducted ${hours} study hours from uncompleting task`);
        }
        
        console.log(`⚠️ Deducted ${xpPenalty} XP for uncompleting task`);
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const handleDelete = async (id) => {
    const task = todos.find(t => t.id === id);
    await remove(ref(database, `users/${user.uid}/todos/${today}/${id}`));
    
    // Send notification for task deletion
    if (task) {
      const userPhone = user?.phone || user?.phoneNumber;
      try {
        await notificationHelper.createNotification(
          user.uid,
          '🗑️ Task Removed',
          `Task "${task.title}" was deleted`,
          'task',
          '/home'
        );
        if (userPhone) {
          await notificationHelper.sendSMS(
            userPhone,
            `📝 StudyVerse: Task "${task.title}" was removed from your list.`
          );
        }
      } catch (error) {
        console.error('Failed to send delete notification:', error);
      }
    }
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
          <h3>Today's Tasks</h3>
          {todos.length > 0 && <span className="todo-count">{completedCount}/{todos.length} completed</span>}
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
            <input className="input-field" placeholder="Task title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <input className="input-field" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ marginTop: 8 }} />
            <div className="todo-form-row" style={{ marginTop: 8 }}>
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
          <span className="todo-empty-emoji">—</span>
          <p>No tasks yet. Add a task to start your day.</p>
        </div>
      ) : (
        <div className="todo-list">
          <AnimatePresence>
          {todos.sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0)).map(todo => {
              const expired = !todo.completed && isDeadlineExpired(todo.deadline);
              return (
                <motion.div key={todo.id} className={`todo-item ${todo.completed ? 'done' : ''} priority-${todo.priority} ${expired ? 'expired' : ''}`}
                  layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }}>
                  <button className={`todo-check ${todo.completed ? 'checked' : ''} ${expired ? 'locked' : ''}`}
                    onClick={() => toggleComplete(todo.id, todo.completed, todo.deadline)} disabled={expired && !todo.completed}>
                    {todo.completed ? <FiCheck size={12} /> : expired ? <FiLock size={10} /> : null}
                  </button>
                  <div className="todo-content">
                    <span className="todo-title">{todo.title}</span>
                    {todo.description && <span className="todo-desc">{todo.description}</span>}
                    {expired && !todo.completed && <span className="todo-expired-label">Expired</span>}
                  </div>
                  {todo.deadline && <span className={`todo-deadline ${expired ? 'expired' : ''}`}><FiClock size={11} /> {todo.deadline}</span>}
                  <div className="todo-actions">
                    <button onClick={() => !expired && handleEdit(todo)} disabled={expired}><FiEdit2 size={13} /></button>
                    <button onClick={() => handleDelete(todo.id)}><FiTrash2 size={13} /></button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
