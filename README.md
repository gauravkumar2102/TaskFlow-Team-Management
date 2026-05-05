# TaskFlow — Project & Task Management

A full-stack project management app with role-based access control (Admin/Member), built with Node.js, Express, and MongoDB.

## 🚀 Live Demo
> Deploy to Railway and add your URL here

**Demo credentials:**
- Email: `demo@taskflow.dev`
- Password: `demo1234`

---

## ✨ Features

- **Authentication** — Signup/Login with JWT tokens, secure password hashing
- **Projects** — Create, update, delete projects with color, status, priority, due date
- **Team Management** — Invite members by email, assign Admin/Member roles
- **Tasks** — Create/assign tasks with status (Todo → In Progress → In Review → Done), priority, due dates, comments
- **Kanban Board** — Visual drag-ready board view per project
- **Dashboard** — Real-time stats: total tasks, in progress, completed, overdue
- **Role-Based Access Control** — Admins can manage everything; Members can update status/assignee only
- **Responsive UI** — Mobile-friendly dark theme interface

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Frontend | Vanilla JS + CSS (no framework) |
| Deployment | Railway |

---

## 📦 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Projects
| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| GET | `/api/projects` | ✅ | Any member |
| POST | `/api/projects` | ✅ | Any user |
| GET | `/api/projects/:id` | ✅ | Member |
| PUT | `/api/projects/:id` | ✅ | Admin |
| DELETE | `/api/projects/:id` | ✅ | Admin |
| POST | `/api/projects/:id/members` | ✅ | Admin |
| DELETE | `/api/projects/:id/members/:userId` | ✅ | Admin |
| PUT | `/api/projects/:id/members/:userId/role` | ✅ | Admin |

### Tasks
| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/api/tasks` | ✅ | Filter by project/status/priority/assignee |
| GET | `/api/tasks/dashboard/stats` | ✅ | Dashboard stats |
| POST | `/api/tasks` | ✅ | Members of project |
| GET | `/api/tasks/:id` | ✅ | Project members |
| PUT | `/api/tasks/:id` | ✅ | Admin: all fields; Member: status/assignee |
| DELETE | `/api/tasks/:id` | ✅ | Admin only |
| POST | `/api/tasks/:id/comments` | ✅ | Project members |

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/taskflow.git
cd taskflow

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Start development server
npm run dev

# Production
npm start
```

### Environment Variables (.env)

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/taskflow
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
NODE_ENV=development
```

---


## 📁 Project Structure

```
taskflow/
├── src/
│   ├── server.js          # Express app entry point
│   ├── models/
│   │   ├── User.js        # User model + bcrypt
│   │   ├── Project.js     # Project + members schema
│   │   └── Task.js        # Task + comments schema
│   ├── routes/
│   │   ├── auth.js        # Auth endpoints
│   │   ├── projects.js    # Project CRUD + members
│   │   ├── tasks.js       # Task CRUD + comments
│   │   └── users.js       # User search
│   └── middleware/
│       └── auth.js        # JWT + role middleware
└── public/
    ├── index.html         # Single-page app
    ├── css/style.css      # Dark theme styles
    └── js/
        ├── api.js         # API client
        └── app.js         # Frontend logic
```

---

## 🔐 Role-Based Access

| Action | Admin | Member |
|--------|-------|--------|
| View project/tasks | ✅ | ✅ |
| Create tasks | ✅ | ✅ |
| Update task status/assignee | ✅ | ✅ |
| Update task title/priority/due | ✅ | ❌ |
| Delete tasks | ✅ | ❌ |
| Edit project settings | ✅ | ❌ |
| Add/remove members | ✅ | ❌ |
| Change member roles | ✅ | ❌ |
| Delete project | ✅ | ❌ |

---

## 📝 License

Gaurav Kumar
