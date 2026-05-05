// ── State ──
const state = {
  user: null,
  projects: [],
  currentProject: null,
  currentProjectRole: null,
  view: 'dashboard'
};

// ── Utils ──
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(d) {
  if (!d) return null;
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'Done') return false;
  return new Date() > new Date(dueDate);
}

function statusBadge(status) {
  const map = { 'Todo': 'todo', 'In Progress': 'inprogress', 'In Review': 'inreview', 'Done': 'done' };
  return `<span class="badge badge-${map[status] || 'todo'}">${status}</span>`;
}

function priorityBadge(priority) {
  const map = { 'Low': 'low', 'Medium': 'medium', 'High': 'high', 'Critical': 'critical' };
  return `<span class="badge badge-${map[priority] || 'medium'}">${priority}</span>`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Toast ──
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Modal ──
let modalCleanup = null;

function openModal(title, bodyHTML, onClose) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  modalCleanup = onClose;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
  if (modalCleanup) { modalCleanup(); modalCleanup = null; }
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ── Auth ──
document.getElementById('go-signup').addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('login-card').classList.add('hidden');
  document.getElementById('signup-card').classList.remove('hidden');
});

document.getElementById('go-login').addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('signup-card').classList.add('hidden');
  document.getElementById('login-card').classList.remove('hidden');
});

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span>';
  try {
    const { token, user } = await API.login(
      document.getElementById('login-email').value,
      document.getElementById('login-password').value
    );
    API.setToken(token);
    state.user = user;
    initApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Sign in</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  }
});

document.getElementById('signup-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('signup-btn');
  const errEl = document.getElementById('signup-error');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span>';
  try {
    const { token, user } = await API.signup(
      document.getElementById('signup-name').value,
      document.getElementById('signup-email').value,
      document.getElementById('signup-password').value
    );
    API.setToken(token);
    state.user = user;
    initApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Create account</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  API.clearToken();
  state.user = null;
  state.projects = [];
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('login-card').classList.remove('hidden');
  document.getElementById('signup-card').classList.add('hidden');
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
});

// ── Navigation ──
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const viewEl = document.getElementById(`view-${name}`);
  if (viewEl) { viewEl.classList.remove('hidden'); viewEl.classList.add('active'); }

  const navEl = document.querySelector(`[data-view="${name}"]`);
  if (navEl) navEl.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', projects: 'Projects',
    'my-tasks': 'My Tasks', 'project-detail': state.currentProject?.name || 'Project'
  };
  document.getElementById('topbar-title').textContent = titles[name] || name;
  document.getElementById('topbar-actions').innerHTML = '';
  state.view = name;
  closeSidebar();
}

document.querySelectorAll('[data-view]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    const view = el.dataset.view;
    showView(view);
    if (view === 'dashboard') loadDashboard();
    if (view === 'projects') loadProjects();
    if (view === 'my-tasks') loadMyTasks();
  });
});

document.querySelectorAll('[data-view].section-link').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    loadMyTasks();
    showView('my-tasks');
  });
});

// ── Sidebar ──
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.createElement('div');
sidebarOverlay.className = 'sidebar-overlay';
document.body.appendChild(sidebarOverlay);

document.getElementById('menu-toggle').addEventListener('click', () => {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
});
document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
}

// ── Init App ──
async function initApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');

  document.getElementById('sidebar-user-name').textContent = state.user.name;
  document.getElementById('sidebar-user-email').textContent = state.user.email;
  document.getElementById('user-avatar-sidebar').textContent = initials(state.user.name);

  await loadProjects();
  loadDashboard();
  showView('dashboard');
}

// ── Dashboard ──
async function loadDashboard() {
  try {
    const { stats, recentTasks, overdueTasks } = await API.getDashboardStats();

    document.getElementById('dash-greeting').textContent = `${greeting()}, ${state.user.name.split(' ')[0]} 👋`;
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-in-progress').textContent = stats.inProgress;
    document.getElementById('stat-done').textContent = stats.done;
    document.getElementById('stat-overdue').textContent = stats.overdue;

    const recentEl = document.getElementById('recent-tasks');
    recentEl.innerHTML = recentTasks.length ? recentTasks.map(t => taskCompactHTML(t)).join('') :
      '<div class="empty-state"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/></svg><p>No tasks yet</p></div>';

    const overdueEl = document.getElementById('overdue-tasks');
    overdueEl.innerHTML = overdueTasks.length ? overdueTasks.map(t => taskCompactHTML(t, true)).join('') :
      '<div class="empty-state"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg><p>No overdue tasks 🎉</p></div>';

    document.querySelectorAll('.task-item-compact').forEach(el => {
      el.addEventListener('click', () => openTaskDetail(el.dataset.id));
    });
  } catch (err) { toast(err.message, 'error'); }
}

function taskCompactHTML(t, showOverdue = false) {
  const over = isOverdue(t.dueDate, t.status);
  return `<div class="task-item-compact" data-id="${t._id}">
    ${statusBadge(t.status)}
    <span class="task-compact-title">${t.title}</span>
    ${t.project ? `<span class="task-compact-project" style="color:${t.project.color}">${t.project.name}</span>` : ''}
    ${over ? '<span class="badge badge-overdue">Overdue</span>' : ''}
  </div>`;
}

// ── Projects ──
async function loadProjects() {
  try {
    const { projects } = await API.getProjects();
    state.projects = projects;
    renderSidebarProjects();
    if (state.view === 'projects') renderProjectsGrid();
    document.getElementById('projects-subtitle').textContent = `${projects.length} project${projects.length !== 1 ? 's' : ''}`;
  } catch (err) { toast(err.message, 'error'); }
}

function renderSidebarProjects() {
  const el = document.getElementById('sidebar-project-list');
  el.innerHTML = state.projects.map(p => `
    <div class="sidebar-project-item" data-id="${p._id}">
      <div class="project-dot" style="background:${p.color}"></div>
      <span class="sidebar-project-name">${p.name}</span>
    </div>
  `).join('');
  el.querySelectorAll('.sidebar-project-item').forEach(item => {
    item.addEventListener('click', () => openProject(item.dataset.id));
  });
}

function renderProjectsGrid() {
  const el = document.getElementById('projects-grid');
  if (!state.projects.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:60px">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 7a2 2 0 012-2h4l2 3h10a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V7z"/></svg>
      <p style="margin-top:12px;font-size:15px">No projects yet</p>
      <p style="font-size:13px;margin-top:4px">Create your first project to get started</p>
    </div>`;
    return;
  }
  el.innerHTML = state.projects.map(p => {
    const members = p.members || [];
    const avatarsHTML = members.slice(0, 4).map(m =>
      `<div class="member-avatar" title="${m.user?.name || ''}">${initials(m.user?.name || '?')}</div>`
    ).join('');
    const more = members.length > 4 ? `<div class="member-avatar">+${members.length - 4}</div>` : '';
    return `<div class="project-card" data-id="${p._id}" style="--project-color:${p.color}">
      <div class="project-card-header">
        <div>
          <div class="project-card-title">${p.name}</div>
          ${p.description ? `<div class="project-card-desc">${p.description}</div>` : ''}
        </div>
        ${priorityBadge(p.priority)}
      </div>
      <div class="project-card-meta">
        ${statusBadge(p.status)}
        <span class="project-card-stat">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          ${p.stats.done}/${p.stats.total} tasks
        </span>
        ${p.stats.overdue ? `<span class="project-card-stat" style="color:var(--red)">⚠ ${p.stats.overdue} overdue</span>` : ''}
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${p.stats.progress}%;background:${p.color}"></div></div>
      <div class="project-members">${avatarsHTML}${more}</div>
    </div>`;
  }).join('');

  el.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', () => openProject(card.dataset.id));
  });
}

async function openProject(id) {
  try {
    const { project, tasks, userRole } = await API.getProject(id);
    state.currentProject = project;
    state.currentProjectRole = userRole;

    document.getElementById('project-detail-name').textContent = project.name;
    document.getElementById('project-detail-desc').textContent = project.description || '';
    document.getElementById('project-detail-color').style.background = project.color;

    const roleBadge = document.getElementById('project-role-badge');
    roleBadge.textContent = userRole;
    roleBadge.className = `role-badge${userRole === 'Admin' ? ' admin' : ''}`;

    // Show/hide admin buttons
    const settingsBtn = document.getElementById('project-settings-btn');
    if (userRole === 'Admin') settingsBtn.style.display = 'inline-flex';
    else settingsBtn.style.display = 'none';

    renderProjectStats(tasks);
    renderKanban(tasks);
    renderTaskList(tasks);
    renderMembers(project);

    // Update sidebar active
    document.querySelectorAll('.sidebar-project-item').forEach(i => {
      i.classList.toggle('active', i.dataset.id === id);
    });

    showView('project-detail');

    // Setup new task button
    document.getElementById('new-task-btn').onclick = () => showNewTaskModal(project._id, project.members);
    document.getElementById('project-settings-btn').onclick = () => showProjectSettingsModal(project);

  } catch (err) { toast(err.message, 'error'); }
}

function renderProjectStats(tasks) {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'Done').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const overdue = tasks.filter(t => isOverdue(t.dueDate, t.status)).length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  document.getElementById('project-stats-bar').innerHTML = `
    <div class="project-stat"><div class="project-stat-value">${total}</div><div class="project-stat-label">Total Tasks</div></div>
    <div class="project-stat"><div class="project-stat-value" style="color:var(--yellow)">${inProgress}</div><div class="project-stat-label">In Progress</div></div>
    <div class="project-stat"><div class="project-stat-value" style="color:var(--green)">${done}</div><div class="project-stat-label">Completed</div></div>
    ${overdue ? `<div class="project-stat"><div class="project-stat-value" style="color:var(--red)">${overdue}</div><div class="project-stat-label">Overdue</div></div>` : ''}
    <div class="project-stat"><div class="project-stat-value" style="color:var(--accent)">${progress}%</div><div class="project-stat-label">Progress</div></div>
  `;
}

function renderKanban(tasks) {
  const columns = ['Todo', 'In Progress', 'In Review', 'Done'];
  const colors = { 'Todo': 'var(--text-2)', 'In Progress': 'var(--yellow)', 'In Review': 'var(--cyan)', 'Done': 'var(--green)' };

  const board = document.getElementById('kanban-board');
  board.innerHTML = columns.map(col => {
    const colTasks = tasks.filter(t => t.status === col);
    return `<div class="kanban-column">
      <div class="kanban-column-header">
        <div class="kanban-column-title">
          <span style="color:${colors[col]}">●</span> ${col}
          <span class="kanban-count">${colTasks.length}</span>
        </div>
      </div>
      <div class="kanban-tasks">
        ${colTasks.length ? colTasks.map(t => taskCardHTML(t)).join('') :
          '<div style="text-align:center;padding:20px;color:var(--text-3);font-size:12px">No tasks</div>'}
      </div>
    </div>`;
  }).join('');

  board.querySelectorAll('.task-card').forEach(el => {
    el.addEventListener('click', () => openTaskDetail(el.dataset.id));
  });
}

function taskCardHTML(t) {
  const over = isOverdue(t.dueDate, t.status);
  return `<div class="task-card" data-id="${t._id}">
    <div class="task-card-title">${t.title}</div>
    <div class="task-card-meta">
      ${priorityBadge(t.priority)}
      ${t.dueDate ? `<span class="task-card-due ${over ? 'overdue' : ''}">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${formatDate(t.dueDate)}
      </span>` : ''}
      ${t.assignee ? `<div class="task-card-assignee" title="${t.assignee.name}">${initials(t.assignee.name)}</div>` : ''}
    </div>
  </div>`;
}

function renderTaskList(tasks) {
  const el = document.getElementById('task-list-view');
  if (!tasks.length) {
    el.innerHTML = '<div class="empty-state"><p>No tasks in this project</p></div>';
    return;
  }
  el.innerHTML = tasks.map(t => {
    const over = isOverdue(t.dueDate, t.status);
    return `<div class="task-row" data-id="${t._id}">
      ${statusBadge(t.status)}
      <span class="task-row-title">${t.title}</span>
      <div class="task-row-meta">
        ${priorityBadge(t.priority)}
        ${t.assignee ? `<div class="task-card-assignee" title="${t.assignee.name}">${initials(t.assignee.name)}</div>` : ''}
        ${t.dueDate ? `<span class="task-row-due ${over ? 'overdue' : ''}">${formatDate(t.dueDate)}</span>` : ''}
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('.task-row').forEach(el => {
    el.addEventListener('click', () => openTaskDetail(el.dataset.id));
  });
}

function renderMembers(project) {
  const el = document.getElementById('members-view');
  const isAdmin = state.currentProjectRole === 'Admin';

  el.innerHTML = `
    ${isAdmin ? `<div style="margin-bottom:16px">
      <button class="btn-primary btn-sm" id="add-member-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
        Add Member
      </button>
    </div>` : ''}
    ${project.members.map(m => {
      const user = m.user;
      const isOwner = project.owner._id === user._id || project.owner === user._id;
      return `<div class="member-row">
        <div class="member-row-avatar">${initials(user.name)}</div>
        <div class="member-row-info">
          <div class="member-row-name">${user.name} ${isOwner ? '<span style="color:var(--violet);font-size:11px">Owner</span>' : ''}</div>
          <div class="member-row-email">${user.email}</div>
        </div>
        <div class="member-row-actions">
          <span class="badge ${m.role === 'Admin' ? 'badge-inreview' : 'badge-todo'}">${m.role}</span>
          ${isAdmin && !isOwner ? `
            <button class="btn-ghost btn-sm change-role-btn" data-uid="${user._id}" data-role="${m.role}">Change Role</button>
            <button class="btn-danger btn-sm remove-member-btn" data-uid="${user._id}" data-name="${user.name}">Remove</button>
          ` : ''}
        </div>
      </div>`;
    }).join('')}
  `;

  if (isAdmin) {
    document.getElementById('add-member-btn')?.addEventListener('click', () => showAddMemberModal(project._id));
    el.querySelectorAll('.change-role-btn').forEach(btn => {
      btn.addEventListener('click', () => showChangeRoleModal(project._id, btn.dataset.uid, btn.dataset.role));
    });
    el.querySelectorAll('.remove-member-btn').forEach(btn => {
      btn.addEventListener('click', () => removeMember(project._id, btn.dataset.uid, btn.dataset.name));
    });
  }
}

// Kanban tabs
document.querySelectorAll('.kanban-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.kanban-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');
  });
});

// ── My Tasks ──
async function loadMyTasks(status = '') {
  try {
    const params = { assignee: 'me' };
    if (status) params.status = status;
    const { tasks } = await API.getTasks(params);

    const el = document.getElementById('my-tasks-list');
    if (!tasks.length) {
      el.innerHTML = '<div class="empty-state"><p>No tasks assigned to you</p></div>';
      return;
    }
    el.innerHTML = tasks.map(t => {
      const over = isOverdue(t.dueDate, t.status);
      return `<div class="task-row" data-id="${t._id}">
        ${statusBadge(t.status)}
        <span class="task-row-title">${t.title}</span>
        <div class="task-row-meta">
          ${priorityBadge(t.priority)}
          ${t.project ? `<span style="font-size:12px;color:${t.project.color}">${t.project.name}</span>` : ''}
          ${t.dueDate ? `<span class="task-row-due ${over ? 'overdue' : ''}">${formatDate(t.dueDate)}</span>` : ''}
        </div>
      </div>`;
    }).join('');

    el.querySelectorAll('.task-row').forEach(el => {
      el.addEventListener('click', () => openTaskDetail(el.dataset.id));
    });
  } catch (err) { toast(err.message, 'error'); }
}

document.getElementById('my-tasks-filters').querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#my-tasks-filters .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadMyTasks(btn.dataset.status);
  });
});

// ── New Project Modal ──
function showNewProjectModal() {
  openModal('Create New Project', `
    <div class="form-group"><label>Project Name *</label><input type="text" id="np-name" placeholder="My Awesome Project" required></div>
    <div class="form-group"><label>Description</label><textarea id="np-desc" placeholder="What's this project about?"></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Status</label>
        <select id="np-status">
          <option>Planning</option><option>Active</option><option>On Hold</option>
        </select>
      </div>
      <div class="form-group"><label>Priority</label>
        <select id="np-priority">
          <option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Due Date</label><input type="date" id="np-due"></div>
      <div class="form-group"><label>Color</label><input type="color" id="np-color" value="#6366f1" style="height:42px;cursor:pointer"></div>
    </div>
    <div id="np-error" class="form-error hidden"></div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" id="np-submit">Create Project</button>
    </div>
  `);

  document.getElementById('np-submit').addEventListener('click', async () => {
    const name = document.getElementById('np-name').value.trim();
    const errEl = document.getElementById('np-error');
    errEl.classList.add('hidden');
    if (!name) { errEl.textContent = 'Project name is required'; errEl.classList.remove('hidden'); return; }

    const btn = document.getElementById('np-submit');
    btn.disabled = true;
    try {
      await API.createProject({
        name,
        description: document.getElementById('np-desc').value.trim(),
        status: document.getElementById('np-status').value,
        priority: document.getElementById('np-priority').value,
        dueDate: document.getElementById('np-due').value || undefined,
        color: document.getElementById('np-color').value
      });
      toast('Project created!', 'success');
      closeModal();
      await loadProjects();
      renderProjectsGrid();
    } catch (err) {
      errEl.textContent = err.message; errEl.classList.remove('hidden');
    } finally { btn.disabled = false; }
  });
}

document.getElementById('new-project-btn').addEventListener('click', showNewProjectModal);
document.getElementById('sidebar-new-project-btn').addEventListener('click', showNewProjectModal);

// ── New Task Modal ──
function showNewTaskModal(projectId, members) {
  const memberOptions = (members || []).map(m =>
    `<option value="${m.user._id}">${m.user.name}</option>`
  ).join('');

  openModal('Create New Task', `
    <div class="form-group"><label>Task Title *</label><input type="text" id="nt-title" placeholder="What needs to be done?"></div>
    <div class="form-group"><label>Description</label><textarea id="nt-desc" placeholder="Add more details..."></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Status</label>
        <select id="nt-status">
          <option>Todo</option><option>In Progress</option><option>In Review</option><option>Done</option>
        </select>
      </div>
      <div class="form-group"><label>Priority</label>
        <select id="nt-priority">
          <option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Assignee</label>
        <select id="nt-assignee"><option value="">Unassigned</option>${memberOptions}</select>
      </div>
      <div class="form-group"><label>Due Date</label><input type="date" id="nt-due"></div>
    </div>
    <div id="nt-error" class="form-error hidden"></div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" id="nt-submit">Create Task</button>
    </div>
  `);

  document.getElementById('nt-submit').addEventListener('click', async () => {
    const title = document.getElementById('nt-title').value.trim();
    const errEl = document.getElementById('nt-error');
    errEl.classList.add('hidden');
    if (!title) { errEl.textContent = 'Title is required'; errEl.classList.remove('hidden'); return; }

    const btn = document.getElementById('nt-submit');
    btn.disabled = true;
    try {
      await API.createTask({
        title, project: projectId,
        description: document.getElementById('nt-desc').value.trim(),
        status: document.getElementById('nt-status').value,
        priority: document.getElementById('nt-priority').value,
        assignee: document.getElementById('nt-assignee').value || undefined,
        dueDate: document.getElementById('nt-due').value || undefined
      });
      toast('Task created!', 'success');
      closeModal();
      openProject(projectId);
    } catch (err) {
      errEl.textContent = err.message; errEl.classList.remove('hidden');
    } finally { btn.disabled = false; }
  });
}

// ── Task Detail ──
async function openTaskDetail(taskId) {
  try {
    const { task, userRole } = await API.getTask(taskId);
    const isAdmin = userRole === 'Admin';
    const over = isOverdue(task.dueDate, task.status);

    const memberOptions = (task.project?.members || []).map(m =>
      `<option value="${m.user?._id || m.user}" ${task.assignee?._id === (m.user?._id || m.user) ? 'selected' : ''}>${m.user?.name || 'Member'}</option>`
    ).join('');

    openModal(task.title, `
      <div class="task-detail-section">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          ${statusBadge(task.status)} ${priorityBadge(task.priority)}
          ${over ? '<span class="badge badge-overdue">Overdue</span>' : ''}
        </div>
        ${task.description ? `<p style="color:var(--text-2);font-size:13px;line-height:1.6">${task.description}</p>` : ''}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="form-group">
          <label>Status</label>
          <select id="td-status">
            <option ${task.status==='Todo'?'selected':''}>Todo</option>
            <option ${task.status==='In Progress'?'selected':''}>In Progress</option>
            <option ${task.status==='In Review'?'selected':''}>In Review</option>
            <option ${task.status==='Done'?'selected':''}>Done</option>
          </select>
        </div>
        <div class="form-group">
          <label>Assignee</label>
          <select id="td-assignee">
            <option value="">Unassigned</option>${memberOptions}
          </select>
        </div>
      </div>

      ${isAdmin ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="form-group">
          <label>Priority</label>
          <select id="td-priority">
            <option ${task.priority==='Low'?'selected':''}>Low</option>
            <option ${task.priority==='Medium'?'selected':''}>Medium</option>
            <option ${task.priority==='High'?'selected':''}>High</option>
            <option ${task.priority==='Critical'?'selected':''}>Critical</option>
          </select>
        </div>
        <div class="form-group">
          <label>Due Date</label>
          <input type="date" id="td-due" value="${task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}">
        </div>
      </div>` : ''}

      <div class="task-detail-section">
        <div class="task-detail-label">Meta</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <span class="task-detail-value" style="color:var(--text-2);font-size:12px">
            Created by ${task.createdBy?.name || 'Unknown'} · ${formatDate(task.createdAt)}
          </span>
          ${task.dueDate ? `<span class="task-detail-value ${over ? '' : ''}" style="color:${over ? 'var(--red)' : 'var(--text-2)'};font-size:12px">Due ${formatDate(task.dueDate)}</span>` : ''}
        </div>
      </div>

      <div class="task-detail-section">
        <div class="task-detail-label">Comments (${task.comments?.length || 0})</div>
        <div class="comments-list" id="comments-list">
          ${(task.comments || []).map(c => `
            <div class="comment-item">
              <div class="comment-header">
                <div class="user-avatar" style="width:24px;height:24px;font-size:9px">${initials(c.user?.name || '?')}</div>
                <span class="comment-name">${c.user?.name || 'User'}</span>
                <span class="comment-date">${formatDate(c.createdAt)}</span>
              </div>
              <div class="comment-text">${c.text}</div>
            </div>
          `).join('') || '<div style="color:var(--text-3);font-size:13px">No comments yet</div>'}
        </div>
        <div class="form-group" style="margin-top:8px">
          <textarea id="new-comment" placeholder="Add a comment..." style="min-height:60px"></textarea>
        </div>
        <div class="modal-actions">
          ${isAdmin ? `<button class="btn-danger btn-sm" id="td-delete">Delete Task</button>` : ''}
          <button class="btn-ghost" id="td-comment-btn">Add Comment</button>
          <button class="btn-primary" id="td-save">Save Changes</button>
        </div>
      </div>
    `);

    document.getElementById('td-save').addEventListener('click', async () => {
      const updates = {
        status: document.getElementById('td-status').value,
        assignee: document.getElementById('td-assignee').value || null
      };
      if (isAdmin) {
        updates.priority = document.getElementById('td-priority').value;
        updates.dueDate = document.getElementById('td-due').value || null;
      }
      try {
        await API.updateTask(taskId, updates);
        toast('Task updated!', 'success');
        closeModal();
        if (state.currentProject) openProject(state.currentProject._id);
        if (state.view === 'my-tasks') loadMyTasks();
        if (state.view === 'dashboard') loadDashboard();
      } catch (err) { toast(err.message, 'error'); }
    });

    document.getElementById('td-comment-btn').addEventListener('click', async () => {
      const text = document.getElementById('new-comment').value.trim();
      if (!text) return;
      try {
        await API.addComment(taskId, text);
        toast('Comment added!', 'success');
        document.getElementById('new-comment').value = '';
        openTaskDetail(taskId);
      } catch (err) { toast(err.message, 'error'); }
    });

    if (isAdmin) {
      document.getElementById('td-delete')?.addEventListener('click', async () => {
        if (!confirm('Delete this task?')) return;
        try {
          await API.deleteTask(taskId);
          toast('Task deleted', 'info');
          closeModal();
          if (state.currentProject) openProject(state.currentProject._id);
        } catch (err) { toast(err.message, 'error'); }
      });
    }

  } catch (err) { toast(err.message, 'error'); }
}

// ── Project Settings Modal ──
function showProjectSettingsModal(project) {
  openModal('Project Settings', `
    <div class="form-group"><label>Project Name</label><input type="text" id="ps-name" value="${project.name}"></div>
    <div class="form-group"><label>Description</label><textarea id="ps-desc">${project.description || ''}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Status</label>
        <select id="ps-status">
          ${['Planning','Active','On Hold','Completed','Cancelled'].map(s => `<option ${project.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Priority</label>
        <select id="ps-priority">
          ${['Low','Medium','High','Critical'].map(s => `<option ${project.priority===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Due Date</label><input type="date" id="ps-due" value="${project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : ''}"></div>
      <div class="form-group"><label>Color</label><input type="color" id="ps-color" value="${project.color || '#6366f1'}" style="height:42px;cursor:pointer"></div>
    </div>
    <div id="ps-error" class="form-error hidden"></div>
    <div class="modal-actions">
      <button class="btn-danger" id="ps-delete">Delete Project</button>
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" id="ps-save">Save Changes</button>
    </div>
  `);

  document.getElementById('ps-save').addEventListener('click', async () => {
    const errEl = document.getElementById('ps-error');
    errEl.classList.add('hidden');
    try {
      await API.updateProject(project._id, {
        name: document.getElementById('ps-name').value.trim(),
        description: document.getElementById('ps-desc').value.trim(),
        status: document.getElementById('ps-status').value,
        priority: document.getElementById('ps-priority').value,
        dueDate: document.getElementById('ps-due').value || undefined,
        color: document.getElementById('ps-color').value
      });
      toast('Project updated!', 'success');
      closeModal();
      loadProjects();
      openProject(project._id);
    } catch (err) {
      errEl.textContent = err.message; errEl.classList.remove('hidden');
    }
  });

  document.getElementById('ps-delete').addEventListener('click', async () => {
    if (!confirm(`Delete "${project.name}" and all its tasks? This cannot be undone.`)) return;
    try {
      await API.deleteProject(project._id);
      toast('Project deleted', 'info');
      closeModal();
      state.currentProject = null;
      await loadProjects();
      renderProjectsGrid();
      showView('projects');
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ── Add Member Modal ──
function showAddMemberModal(projectId) {
  openModal('Add Team Member', `
    <div class="form-group"><label>Email Address</label><input type="email" id="am-email" placeholder="colleague@company.com"></div>
    <div class="form-group"><label>Role</label>
      <select id="am-role"><option value="Member">Member</option><option value="Admin">Admin</option></select>
    </div>
    <div id="am-error" class="form-error hidden"></div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" id="am-submit">Add Member</button>
    </div>
  `);

  document.getElementById('am-submit').addEventListener('click', async () => {
    const email = document.getElementById('am-email').value.trim();
    const errEl = document.getElementById('am-error');
    errEl.classList.add('hidden');
    if (!email) { errEl.textContent = 'Email is required'; errEl.classList.remove('hidden'); return; }

    try {
      await API.addMember(projectId, email, document.getElementById('am-role').value);
      toast('Member added!', 'success');
      closeModal();
      openProject(projectId);
    } catch (err) {
      errEl.textContent = err.message; errEl.classList.remove('hidden');
    }
  });
}

async function removeMember(projectId, userId, name) {
  if (!confirm(`Remove ${name} from this project?`)) return;
  try {
    await API.removeMember(projectId, userId);
    toast(`${name} removed`, 'info');
    openProject(projectId);
  } catch (err) { toast(err.message, 'error'); }
}

function showChangeRoleModal(projectId, userId, currentRole) {
  openModal('Change Member Role', `
    <div class="form-group"><label>New Role</label>
      <select id="cr-role">
        <option value="Member" ${currentRole==='Member'?'selected':''}>Member</option>
        <option value="Admin" ${currentRole==='Admin'?'selected':''}>Admin</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" id="cr-submit">Update Role</button>
    </div>
  `);

  document.getElementById('cr-submit').addEventListener('click', async () => {
    try {
      await API.updateMemberRole(projectId, userId, document.getElementById('cr-role').value);
      toast('Role updated!', 'success');
      closeModal();
      openProject(projectId);
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ── Startup ──
async function startup() {
  const token = API.getToken();
  if (!token) return;
  try {
    const { user } = await API.me();
    state.user = user;
    initApp();
  } catch {
    API.clearToken();
  }
}

startup();
