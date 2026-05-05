require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Project = require('./src/models/Project');
const Task = require('./src/models/Task');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clean up existing demo data
  const existing = await User.findOne({ email: 'demo@taskflow.dev' });
  if (existing) {
    const projects = await Project.find({ owner: existing._id });
    for (const p of projects) await Task.deleteMany({ project: p._id });
    await Project.deleteMany({ owner: existing._id });
    await User.deleteOne({ _id: existing._id });
    console.log('Cleaned up existing demo data');
  }

  // Create demo user
  const demo = await User.create({
    name: 'Demo User',
    email: 'demo@taskflow.dev',
    password: 'demo1234'
  });

  // Create a second user
  const alice = await User.create({
    name: 'Alice Chen',
    email: 'alice@taskflow.dev',
    password: 'demo1234'
  });

  console.log('Created users');

  // Create projects
  const project1 = await Project.create({
    name: 'Website Redesign',
    description: 'Redesign the company website with modern UI/UX',
    status: 'Active',
    priority: 'High',
    color: '#6366f1',
    owner: demo._id,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    members: [
      { user: demo._id, role: 'Admin' },
      { user: alice._id, role: 'Member' }
    ]
  });

  const project2 = await Project.create({
    name: 'Mobile App MVP',
    description: 'Build the first version of the mobile application',
    status: 'Planning',
    priority: 'Critical',
    color: '#8b5cf6',
    owner: demo._id,
    dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    members: [{ user: demo._id, role: 'Admin' }]
  });

  console.log('Created projects');

  // Create tasks for project1
  const tasks1 = [
    { title: 'Conduct user research and interviews', status: 'Done', priority: 'High', assignee: demo._id, createdBy: demo._id },
    { title: 'Create wireframes for all pages', status: 'Done', priority: 'High', assignee: alice._id, createdBy: demo._id },
    { title: 'Design new color system and typography', status: 'In Progress', priority: 'Medium', assignee: alice._id, createdBy: demo._id },
    { title: 'Build responsive navigation component', status: 'In Progress', priority: 'High', assignee: demo._id, createdBy: demo._id, dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
    { title: 'Set up CI/CD pipeline', status: 'Todo', priority: 'Medium', assignee: demo._id, createdBy: demo._id },
    { title: 'Implement dark mode support', status: 'Todo', priority: 'Low', createdBy: demo._id },
    { title: 'Write unit tests for components', status: 'In Review', priority: 'Medium', assignee: alice._id, createdBy: demo._id },
    { title: 'Optimize images and assets', status: 'Todo', priority: 'Low', createdBy: demo._id, dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }, // overdue
  ];

  for (const t of tasks1) {
    await Task.create({ ...t, project: project1._id });
  }

  // Create tasks for project2
  const tasks2 = [
    { title: 'Define MVP feature scope', status: 'Done', priority: 'Critical', assignee: demo._id, createdBy: demo._id },
    { title: 'Set up React Native project structure', status: 'In Progress', priority: 'High', assignee: demo._id, createdBy: demo._id },
    { title: 'Design onboarding flow', status: 'Todo', priority: 'High', createdBy: demo._id, dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }, // overdue
    { title: 'Implement authentication screens', status: 'Todo', priority: 'Critical', createdBy: demo._id },
    { title: 'Build home dashboard', status: 'Todo', priority: 'High', createdBy: demo._id },
  ];

  for (const t of tasks2) {
    await Task.create({ ...t, project: project2._id });
  }

  console.log('Created tasks');
  console.log('\n Seed complete!');
  console.log('Demo login: demo@taskflow.dev / demo1234');
  console.log('Alice login: alice@taskflow.dev / demo1234');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
