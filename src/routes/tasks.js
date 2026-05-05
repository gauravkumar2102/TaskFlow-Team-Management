const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect, isMember } = require('../middleware/auth');

// Helper: check if user is project member
async function getProjectRole(userId, projectId) {
  const project = await Project.findById(projectId);
  if (!project) return null;
  const member = project.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
}

// GET /api/tasks - Get tasks (with filters)
router.get('/', protect, async (req, res) => {
  try {
    const { project, status, priority, assignee, overdue, search } = req.query;

    // Get all projects user is member of
    const projects = await Project.find({ 'members.user': req.user._id }).select('_id');
    const projectIds = projects.map(p => p._id);

    const filter = { project: { $in: projectIds } };
    if (project) filter.project = project;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee === 'me') filter.assignee = req.user._id;
    else if (assignee) filter.assignee = assignee;
    if (overdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $ne: 'Done' };
    }
    if (search) filter.title = { $regex: search, $options: 'i' };

    const tasks = await Task.find(filter)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name color')
      .sort('-createdAt');

    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks - Create task
router.post('/', protect, [
  body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be 2-200 characters'),
  body('project').isMongoId().withMessage('Valid project ID required'),
  body('status').optional().isIn(['Todo', 'In Progress', 'In Review', 'Done']),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']),
  body('dueDate').optional().isISO8601().toDate(),
  body('assignee').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const role = await getProjectRole(req.user._id, req.body.project);
    if (!role) return res.status(403).json({ error: 'You are not a member of this project' });

    const task = await Task.create({ ...req.body, createdBy: req.user._id });
    await task.populate('assignee', 'name email');
    await task.populate('createdBy', 'name email');
    await task.populate('project', 'name color');
    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name color members')
      .populate('comments.user', 'name email');

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const role = await getProjectRole(req.user._id, task.project._id);
    if (!role) return res.status(403).json({ error: 'Access denied' });

    res.json({ task, userRole: role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', protect, [
  body('title').optional().trim().isLength({ min: 2, max: 200 }),
  body('status').optional().isIn(['Todo', 'In Progress', 'In Review', 'Done']),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']),
  body('assignee').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const role = await getProjectRole(req.user._id, task.project);
    if (!role) return res.status(403).json({ error: 'Access denied' });

    // Members can only update status/assignee; Admins can update everything
    const allowed = role === 'Admin'
      ? ['title', 'description', 'status', 'priority', 'assignee', 'dueDate', 'tags']
      : ['status', 'assignee'];

    allowed.forEach(f => { if (req.body[f] !== undefined) task[f] = req.body[f]; });
    await task.save();
    await task.populate('assignee', 'name email');
    await task.populate('createdBy', 'name email');
    await task.populate('project', 'name color');
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id - Admin only
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const role = await getProjectRole(req.user._id, task.project);
    if (role !== 'Admin') return res.status(403).json({ error: 'Only Admins can delete tasks' });

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', protect, [
  body('text').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be 1-1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const role = await getProjectRole(req.user._id, task.project);
    if (!role) return res.status(403).json({ error: 'Access denied' });

    task.comments.push({ user: req.user._id, text: req.body.text });
    await task.save();
    await task.populate('comments.user', 'name email');
    res.json({ comments: task.comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/dashboard/stats - Dashboard stats
router.get('/dashboard/stats', protect, async (req, res) => {
  try {
    const projects = await Project.find({ 'members.user': req.user._id }).select('_id name color');
    const projectIds = projects.map(p => p._id);

    const tasks = await Task.find({ project: { $in: projectIds } })
      .populate('project', 'name color')
      .populate('assignee', 'name email');

    const now = new Date();
    const stats = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'Todo').length,
      inProgress: tasks.filter(t => t.status === 'In Progress').length,
      inReview: tasks.filter(t => t.status === 'In Review').length,
      done: tasks.filter(t => t.status === 'Done').length,
      overdue: tasks.filter(t => t.dueDate && t.status !== 'Done' && now > t.dueDate).length,
      myTasks: tasks.filter(t => t.assignee && t.assignee._id.toString() === req.user._id.toString()).length,
    };

    const recentTasks = tasks
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 8);

    const overdueTasks = tasks
      .filter(t => t.dueDate && t.status !== 'Done' && now > t.dueDate)
      .sort((a, b) => a.dueDate - b.dueDate)
      .slice(0, 5);

    res.json({ stats, recentTasks, overdueTasks, projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
