const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect, requireProjectRole } = require('../middleware/auth');

// GET /api/projects - List projects user is member of
router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.find({ 'members.user': req.user._id })
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .sort('-createdAt');

    const projectsWithStats = await Promise.all(projects.map(async (p) => {
      const tasks = await Task.find({ project: p._id });
      const total = tasks.length;
      const done = tasks.filter(t => t.status === 'Done').length;
      const overdue = tasks.filter(t => t.dueDate && t.status !== 'Done' && new Date() > t.dueDate).length;
      return {
        ...p.toJSON(),
        stats: { total, done, overdue, progress: total ? Math.round((done / total) * 100) : 0 }
      };
    }));

    res.json({ projects: projectsWithStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects - Create project (any auth user)
router.post('/', protect, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('status').optional().isIn(['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled']),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']),
  body('dueDate').optional().isISO8601().toDate(),
  body('color').optional().isHexColor()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const project = await Project.create({ ...req.body, owner: req.user._id });
    await project.populate('owner', 'name email');
    await project.populate('members.user', 'name email');
    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id
router.get('/:id', protect, requireProjectRole(), async (req, res) => {
  try {
    await req.project.populate('owner', 'name email');
    await req.project.populate('members.user', 'name email');
    const tasks = await Task.find({ project: req.params.id })
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .sort('-createdAt');
    res.json({ project: req.project, tasks, userRole: req.projectRole });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id - Admin only
router.put('/:id', protect, requireProjectRole('Admin'), [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('status').optional().isIn(['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled']),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const allowed = ['name', 'description', 'status', 'priority', 'dueDate', 'color'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const project = await Project.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('owner', 'name email')
      .populate('members.user', 'name email');
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id - Admin only
router.delete('/:id', protect, requireProjectRole('Admin'), async (req, res) => {
  try {
    await Task.deleteMany({ project: req.params.id });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/members - Add member (Admin only)
router.post('/:id/members', protect, requireProjectRole('Admin'), [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('role').optional().isIn(['Admin', 'Member'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ error: 'User not found with that email' });

    const project = req.project;
    const alreadyMember = project.members.some(m => m.user.toString() === user._id.toString());
    if (alreadyMember) return res.status(400).json({ error: 'User is already a member' });

    project.members.push({ user: user._id, role: req.body.role || 'Member' });
    await project.save();
    await project.populate('members.user', 'name email');
    res.json({ project, message: `${user.name} added to project` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id/members/:userId - Remove member (Admin only)
router.delete('/:id/members/:userId', protect, requireProjectRole('Admin'), async (req, res) => {
  try {
    const project = req.project;
    if (req.params.userId === project.owner.toString()) {
      return res.status(400).json({ error: 'Cannot remove the project owner' });
    }
    project.members = project.members.filter(m => m.user.toString() !== req.params.userId);
    await project.save();
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id/members/:userId/role - Update member role (Admin only)
router.put('/:id/members/:userId/role', protect, requireProjectRole('Admin'), [
  body('role').isIn(['Admin', 'Member']).withMessage('Role must be Admin or Member')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const project = req.project;
    const member = project.members.find(m => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    member.role = req.body.role;
    await project.save();
    await project.populate('members.user', 'name email');
    res.json({ project, message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
