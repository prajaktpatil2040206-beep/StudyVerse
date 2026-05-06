const API_BASE = 'http://localhost:8000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };
  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }
  if (config.body instanceof FormData) delete config.headers['Content-Type'];
  const res = await fetch(url, config);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  sendOtp: (email) => request('/auth/send-otp', { method: 'POST', body: { email } }),
  verifyOtp: (email, otp) => request('/auth/verify-otp', { method: 'POST', body: { email, otp } }),

  // Timetable
  generateTimetable: (data) => request('/ai/generate-timetable', { method: 'POST', body: data }),
  rebuildTimetable: (data) => request('/ai/rebuild-timetable', { method: 'POST', body: data }),
  generateTimetableFromPrompt: (data) => request('/ai/generate-timetable-prompt', { method: 'POST', body: data }),
  generateTimetableUnified: (data) => request('/ai/generate-timetable-unified', { method: 'POST', body: data }),

  // Goals
  setGoal: (data) => request('/ai/set-goal', { method: 'POST', body: data }),
  generateGoalPlan: (data) => request('/ai/generate-goal-plan', { method: 'POST', body: data }),

  // Chat / Teacher
  chat: (data) => request('/ai/chat', { method: 'POST', body: data }),

  // Assessment (text-based, Qwen)
  generateQuestions: (data) => request('/ai/generate-questions', { method: 'POST', body: data }),
  evaluateAnswer: (data) => request('/ai/evaluate-answer', { method: 'POST', body: data }),
  evaluateBatch: (data) => request('/ai/evaluate-batch', { method: 'POST', body: data }),

  // Daily test
  dailyTest: (data) => request('/ai/daily-test', { method: 'POST', body: data }),

  // Dashboard AI
  dashboardSuggestions: (data) => request('/ai/dashboard-suggestions', { method: 'POST', body: data }),
  detailedInsights: (data) => request('/ai/detailed-insights', { method: 'POST', body: data }),
  taskMatrix: (data) => request('/ai/task-matrix', { method: 'POST', body: data }),

  // Quiz (Z.AI MCQ)
  generateMCQ: (data) => request('/quiz/generate', { method: 'POST', body: data }),
  dailyChallengeQuiz: (data) => request('/quiz/daily-challenge', { method: 'POST', body: data }),
  mixedQuestions: (data) => request('/quiz/mixed-questions', { method: 'POST', body: data }),
  evaluateMCQ: (data) => request('/quiz/evaluate-mcq', { method: 'POST', body: data }),

  // Productivity
  logSession: (data) => request('/productivity/log-session', { method: 'POST', body: data }),
  calculateProductivityScore: (data) => request('/productivity/calculate-score', { method: 'POST', body: data }),
  productivityTaskMatrix: (data) => request('/productivity/task-matrix', { method: 'POST', body: data }),
  wellnessCheckin: (data) => request('/productivity/wellness-checkin', { method: 'POST', body: data }),

  // Notifications
  sendNotification: (data) => request('/notifications/send', { method: 'POST', body: data }),
};
