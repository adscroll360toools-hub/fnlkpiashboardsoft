# Zaptiz — KPI & Team Management Platform

A full-stack team performance management application featuring role-based portals for **Admins**, **Controllers**, and **Employees**. Built with React + Vite on the frontend and Express.js + **MongoDB Atlas** on the backend.

---

## 📁 Project Structure

```
zaptiz/
├── frontend/                    # React + Vite + TypeScript SPA
│   ├── src/
│   │   ├── components/          # Shared UI components & layouts
│   │   ├── context/             # React Context providers
│   │   │   ├── AuthContext.tsx  # Auth → /api/users/login + CRUD
│   │   │   ├── TaskContext.tsx  # Tasks → /api/tasks
│   │   │   ├── AttendanceContext.tsx  # Attendance → /api/attendance
│   │   │   ├── KPIContext.tsx   # KPIs → /api/kpis
│   │   │   └── RewardContext.tsx
│   │   ├── lib/
│   │   │   └── api.ts           # ← Central REST API client (no Supabase)
│   │   ├── pages/               # Route-level pages
│   │   └── hooks/
│   ├── public/
│   ├── .env.example             # VITE_API_URL
│   └── package.json
│
├── backend/                     # Express.js + MongoDB API server
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js            # ← Mongoose connection to MongoDB Atlas
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Task.js
│   │   │   ├── CompanyRole.js
│   │   │   ├── Attendance.js
│   │   │   ├── BreakRequest.js
│   │   │   └── KPI.js
│   │   ├── routes/
│   │   │   ├── health.js        # GET  /api/health
│   │   │   ├── users.js         # CRUD /api/users + POST /api/users/login
│   │   │   ├── tasks.js         # CRUD /api/tasks
│   │   │   ├── attendance.js    # /api/attendance + /api/attendance/breaks
│   │   │   ├── kpis.js          # CRUD /api/kpis
│   │   │   └── roles.js         # /api/roles (company roles)
│   │   └── index.js             # Server entry point
│   ├── .env.example             # MONGO_URI, PORT, FRONTEND_URL
│   └── package.json
│
└── README.md
```

---

## 🛠️ Tech Stack

| Layer      | Technology                                    |
|------------|-----------------------------------------------|
| Frontend   | React 18, TypeScript, Vite, TailwindCSS       |
| UI Library | Radix UI, shadcn/ui, Framer Motion            |
| Backend    | Node.js 18+, Express.js                       |
| Database   | **MongoDB Atlas** (via Mongoose v8)           |
| Auth       | Custom email/password (stored in MongoDB)     |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** >= 18  
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/zaptiz.git
cd zaptiz
```

---

### 2. Setup the Backend

```bash
cd backend
npm install

# Copy env template
copy .env.example .env
```

Open `backend/.env` and fill in:

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/ace_pilot?retryWrites=true&w=majority
PORT=3001
FRONTEND_URL=http://localhost:8080
```

> **Where to get MONGO_URI:**  
> MongoDB Atlas → Your Cluster → Connect → Drivers → Node.js → Copy connection string  
> Replace `<password>` with your database user's password.  
> Add the database name (`ace_pilot`) before the `?` in the URI.

```bash
# Start the backend (http://localhost:3001)
npm run dev
```

---

### 3. Setup the Frontend

```bash
cd frontend
npm install

# Copy env template
copy .env.example .env.local
```

Open `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:3001
```

```bash
# Start the frontend (http://localhost:8080)
npm run dev
```

---

## 📡 API Reference

### Users
| Method | Endpoint           | Description                          |
|--------|--------------------|--------------------------------------|
| GET    | `/api/users`       | List all users                       |
| GET    | `/api/users/:id`   | Get single user                      |
| POST   | `/api/users`       | Create user                          |
| POST   | `/api/users/login` | Authenticate (email + password)      |
| PATCH  | `/api/users/:id`   | Update user fields                   |
| DELETE | `/api/users/:id`   | Delete user                          |

### Tasks
| Method | Endpoint                    | Description            |
|--------|-----------------------------|------------------------|
| GET    | `/api/tasks`                | List all tasks         |
| POST   | `/api/tasks`                | Create task            |
| PATCH  | `/api/tasks/:id/status`     | Update task status     |
| PATCH  | `/api/tasks/:id/submission` | Submit proof           |
| POST   | `/api/tasks/:id/messages`   | Add chat message       |
| DELETE | `/api/tasks/:id`            | Delete task            |

### Attendance
| Method | Endpoint                      | Description             |
|--------|-------------------------------|-------------------------|
| GET    | `/api/attendance`             | List all records        |
| POST   | `/api/attendance/checkin`     | Check in                |
| PATCH  | `/api/attendance/:id/checkout`| Check out               |
| PATCH  | `/api/attendance/:id`         | Update record           |
| POST   | `/api/attendance/upsert`      | Upsert by userId+date   |
| GET    | `/api/attendance/breaks`      | List break requests     |
| POST   | `/api/attendance/breaks`      | Create break request    |
| PATCH  | `/api/attendance/breaks/:id`  | Approve/reject break    |

### KPIs
| Method | Endpoint                  | Description         |
|--------|---------------------------|---------------------|
| GET    | `/api/kpis`               | List all KPIs       |
| POST   | `/api/kpis`               | Create KPI          |
| PATCH  | `/api/kpis/:id/progress`  | Update progress     |
| DELETE | `/api/kpis/:id`           | Delete KPI          |

---

## 🔐 User Roles

| Role         | Access                                      |
|--------------|---------------------------------------------|
| `admin`      | Full access — all pages, user management    |
| `controller` | Team lead — tasks, attendance, KPI, reports |
| `employee`   | Personal dashboard, tasks, leaderboard      |

---

## 🌐 Deployment

| Part     | Recommended Platform | Root Directory | Start Command    |
|----------|---------------------|----------------|------------------|
| Frontend | Vercel / Netlify    | `frontend/`    | `npm run build`  |
| Backend  | Render / Railway    | `backend/`     | `npm start`      |
| Database | MongoDB Atlas       | —              | —                |

**Frontend env vars (Vercel):**
```
VITE_API_URL=https://your-backend.onrender.com
```

**Backend env vars (Render):**
```
MONGO_URI=mongodb+srv://...
PORT=3001
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

---

## 🧪 Running Tests

```bash
cd frontend
npm test
```

---

## 📄 License

MIT © Zaptiz

# FNLKPIDashboardSoft
