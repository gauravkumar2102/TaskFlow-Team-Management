const API = {
  base: '/api',

  getToken() { return localStorage.getItem('tf_token'); },
  setToken(t) { localStorage.setItem('tf_token', t); },
  clearToken() { localStorage.removeItem('tf_token'); },

  async request(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const token = this.getToken();
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(this.base + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  delete(path) { return this.request('DELETE', path); },

  // Auth
  login(email, password) { return this.post('/auth/login', { email, password }); },
  signup(name, email, password) { return this.post('/auth/signup', { name, email, password }); },
  me() { return this.get('/auth/me'); },
  updateProfile(data) { return this.put('/auth/profile', data); },

  // Projects
  getProjects() { return this.get('/projects'); },
  createProject(data) { return this.post('/projects', data); },
  getProject(id) { return this.get(`/projects/${id}`); },
  updateProject(id, data) { return this.put(`/projects/${id}`, data); },
  deleteProject(id) { return this.delete(`/projects/${id}`); },
  addMember(projectId, email, role) { return this.post(`/projects/${projectId}/members`, { email, role }); },
  removeMember(projectId, userId) { return this.delete(`/projects/${projectId}/members/${userId}`); },
  updateMemberRole(projectId, userId, role) { return this.put(`/projects/${projectId}/members/${userId}/role`, { role }); },

  // Tasks
  getTasks(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/tasks${q ? '?' + q : ''}`);
  },
  getDashboardStats() { return this.get('/tasks/dashboard/stats'); },
  createTask(data) { return this.post('/tasks', data); },
  getTask(id) { return this.get(`/tasks/${id}`); },
  updateTask(id, data) { return this.put(`/tasks/${id}`, data); },
  deleteTask(id) { return this.delete(`/tasks/${id}`); },
  addComment(taskId, text) { return this.post(`/tasks/${taskId}/comments`, { text }); },

  // Users
  searchUsers(q) { return this.get(`/users/search?q=${encodeURIComponent(q)}`); }
};
