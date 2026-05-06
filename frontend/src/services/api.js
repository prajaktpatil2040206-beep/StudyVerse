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
  if (config.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  const res = await fetch(url, config);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  sendOtp: (email) => request('/auth/send-otp', { method: 'POST', body: { email } }),
  verifyOtp: (email, otp) => request('/auth/verify-otp', { method: 'POST', body: { email, otp } }),
  generateTimetable: (data) => request('/ai/generate-timetable', { method: 'POST', body: data }),
  rebuildTimetable: (data) => request('/ai/rebuild-timetable', { method: 'POST', body: data }),
  generateTimetableFromPrompt: (data) => request('/ai/generate-timetable-prompt', { method: 'POST', body: data }),
  setGoal: (data) => request('/ai/set-goal', { method: 'POST', body: data }),
  chat: (data) => request('/ai/chat', { method: 'POST', body: data }),
  generateQuestions: (data) => request('/ai/generate-questions', { method: 'POST', body: data }),
  evaluateAnswer: (data) => request('/ai/evaluate-answer', { method: 'POST', body: data }),
  evaluateBatch: (data) => request('/ai/evaluate-batch', { method: 'POST', body: data }),
  dailyTest: (data) => request('/ai/daily-test', { method: 'POST', body: data }),
  dashboardSuggestions: (data) => request('/ai/dashboard-suggestions', { method: 'POST', body: data }),
  sendNotification: (data) => request('/notifications/send', { method: 'POST', body: data }),
};
