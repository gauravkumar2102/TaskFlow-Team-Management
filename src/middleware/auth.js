const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Project = require('../models/Project');

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ error: 'Not authorized, no token' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Not authorized, token failed' });
  }
};

exports.requireProjectRole = (...roles) => {
  return async (req, res, next) => {
    try {
      const project = await Project.findById(req.params.projectId || req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      const member = project.members.find(
        m => m.user.toString() === req.user._id.toString()
      );
      if (!member) {
        return res.status(403).json({ error: 'You are not a member of this project' });
      }
      if (roles.length && !roles.includes(member.role)) {
        return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
      }
      req.project = project;
      req.projectRole = member.role;
      next();
    } catch (err) {
      next(err);
    }
  };
};

exports.isMember = async (req, res, next) => {
  try {
    const projectId = req.body.project || req.query.project || req.params.projectId;
    if (!projectId) return next();
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const member = project.members.find(
      m => m.user.toString() === req.user._id.toString()
    );
    if (!member) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }
    req.project = project;
    req.projectRole = member.role;
    next();
  } catch (err) {
    next(err);
  }
};
