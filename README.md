# QueryWise ⚡
### AI-Assisted Database Performance Intelligence Platform

> **College Cloud Computing Project**  
> Developed by a team of three students to deliver automated SQL execution plan analysis, bottleneck detection, index optimization recommendations, and plain-language AI guidance.

---

## 🌟 Key Capabilities

- 🔍 **Interactive SQL Query Analyzer**: Code editor with PostgreSQL dialect support, preloaded demonstration queries, and dual analysis modes (`EXPLAIN ANALYZE` or dry-run `EXPLAIN COSTS`).
- 🌳 **Structured Execution Plan Visualizer**: Converts complex PostgreSQL JSON execution plans into an interactive tree displaying node costs, actual execution time, filter predicates, and highlighting costly operations.
- 💡 **Deterministic Rule-Based Bottleneck Detection**: Discovers missing indexes, unindexed sequential scans, wildcard `SELECT *` projection overhead, expensive sorting spilling to disk, and suboptimal joins without relying purely on external APIs.
- 🤖 **AI-Assisted Guidance**: Integrates Google Gemini (`gemini-1.5-flash`) to explain query operations, root causes, and next steps in beginner-friendly developer language (with an offline deterministic rule fallback).
- ⚖️ **Side-by-Side Query Comparison**: Benchmarks baseline vs refactored queries under identical cache conditions and calculates exact percentage latency and cost improvements:
  $$\text{Improvement (\%)} = \left(\frac{\text{Original Time} - \text{Optimized Time}}{\text{Original Time}}\right) \times 100$$
- 📊 **Real-Time Telemetry Dashboard**: Displays total analyses, average latency, slow query rates, and health distribution graphs rendered with Recharts.
- 🛡️ **Strict SQL Safety Sandbox**: Automatically parses and validates every query—strictly blocking `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `GRANT`, and semicolon query chaining attacks.
- 🌓 **Professional SaaS Theme**: Linear / Vercel-inspired design with dark and light mode toggle, saved across browser sessions.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide React, Recharts, React Router v6 |
| **Backend** | Node.js v22, Express.js REST APIs, CORS, Dotenv |
| **Database** | PostgreSQL 16 (Amazon RDS support + Embedded PGlite WASM engine) |
| **AI Integration** | Google Gemini API (`@google/generative-ai` with deterministic fallback) |
| **Cloud & DevOps** | Docker, AWS App Runner, AWS Elastic Beanstalk, Amazon ECR |

---

## 🚀 Quick Start (Local Setup)

QueryWise is designed to run **out-of-the-box with zero database setup required** thanks to its embedded PostgreSQL 16 engine!

### Prerequisites
- Node.js v18+ (tested on Node v22)
- npm v9+

### 1. Install All Dependencies
From the repository root:
```bash
npm run install:all
```
*(Or install in `backend` and `frontend` separately: `cd backend && npm install && cd ../frontend && npm install`)*

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
> **Note**: Both `DATABASE_URL` and `GEMINI_API_KEY` are optional!  
> - If `DATABASE_URL` is omitted, QueryWise automatically boots an embedded PostgreSQL 16 database pre-seeded with 6,650 realistic demo records.  
> - If `GEMINI_API_KEY` is omitted, QueryWise uses its built-in deterministic rule explainer.

### 3. Start the Application

**Option A — Unified Single Command (Recommended):**
```bash
# In one terminal, start the backend (which also serves the frontend build):
npm start
```
- Open **http://localhost:5000** in your browser.

**Option B — Development Mode with Hot Reloading:**
```bash
# Terminal 1: Backend API (Port 5000)
npm run dev:backend

# Terminal 2: Frontend Vite Dev Server (Port 5173 with proxy)
npm run dev:frontend
```
- Frontend: **http://localhost:5173**
- Backend API: **http://localhost:5000**
- Health Check: **http://localhost:5000/health**

---

## 🧪 Automated Testing

Run the automated test suite covering SQL validation, plan parsing, AI explanations, and integration:
```bash
cd backend
npm test
```
All 8 test suites execute with 100% pass rate.

---

## ☁️ AWS Cloud Deployment

QueryWise is packaged for simple deployment on **AWS App Runner** or **AWS Elastic Beanstalk** paired with **Amazon RDS PostgreSQL**:

### Container Build
```bash
docker build -t querywise -f deployment/Dockerfile .
```

### AWS App Runner Deployment
1. Push the image to **Amazon ECR**.
2. Create an App Runner service pointing to the ECR image with **Port 5000**.
3. Set the Health Check Path to `/health`.
4. Add environment variables:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `DATABASE_URL=postgres://user:pass@rds-endpoint:5432/querywise_db` (or leave empty for embedded DB)
   - `GEMINI_API_KEY=your_key`

Detailed cloud instructions, Amazon RDS setup, and cost optimization tips are documented in [docs/AWS_DEPLOYMENT_GUIDE.md](file:///c:/Users/diyam/OneDrive/Desktop/QueryWise/docs/AWS_DEPLOYMENT_GUIDE.md).

---

## 📁 Repository Structure

```
QueryWise/
├── backend/
│   ├── src/
│   │   ├── analysis/          # SQL safety validator & deterministic rule engine
│   │   ├── controllers/       # REST API endpoint handlers
│   │   ├── database/          # Dual DB adapter (RDS / Embedded PGlite) & seeders
│   │   ├── routes/            # Express router (/api/*)
│   │   ├── services/          # Gemini AI service with deterministic fallback
│   │   └── server.js          # Express app entrypoint & static frontend server
│   └── test/                  # Automated unit and integration test suites
├── frontend/
│   ├── src/
│   │   ├── components/        # Navbar, Footer, SqlEditor, PlanVisualizer, AiCard
│   │   ├── context/           # Dark/Light ThemeContext provider
│   │   ├── pages/             # Dashboard, Analyzer, Compare, History, Settings
│   │   └── services/          # Centralized API client
│   └── vite.config.js         # Vite configuration with backend proxy
├── sql/
│   ├── schema.sql             # PostgreSQL schema DDL
│   └── seed.sql               # Evaluation dataset SQL
├── deployment/
│   ├── Dockerfile             # Multi-stage production container
│   ├── docker-compose.yml     # App + PostgreSQL container compose
│   ├── Dockerrun.aws.json     # AWS Elastic Beanstalk configuration
│   └── apprunner.yaml         # AWS App Runner configuration
├── docs/
│   ├── ARCHITECTURE.md        # Architecture diagrams & component breakdown
│   ├── DATABASE_SCHEMA.md     # ER diagram & table specifications
│   ├── API_DOCUMENTATION.md   # Complete REST API reference
│   ├── AWS_DEPLOYMENT_GUIDE.md# AWS App Runner & RDS deployment guide
│   ├── TESTING_REPORT.md      # Test outcomes & verification matrix
│   └── DEMO_SCRIPT.md         # 10-minute presentation guide for students
├── README.md                  # Project overview & documentation
└── package.json               # Root scripts
```

---

## 🛡️ SQL Safety & Sandboxing

QueryWise enforces a strict security perimeter:
- **Read-Only Enforced**: Only queries beginning with `SELECT` or `WITH (CTE)` are permitted.
- **Mutation Guard**: Keywords including `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `GRANT`, `REVOKE`, `EXEC`, and `VACUUM` are rejected before reaching the database.
- **Query Chaining Prevention**: Multi-statement execution via unquoted semicolons is detected and blocked.
- **Resource Constraints**: Statement execution timeouts prevent runaway queries.
- **AI SQL Safety**: Suggested SQL fixes generated by AI or heuristic rules are never executed automatically without explicit developer consent.

---

## 👥 Student Team

Developed for the **College Cloud Computing Project Evaluation** by a team of three students. Complete presentation script and speaker assignments can be found in [docs/DEMO_SCRIPT.md](file:///c:/Users/diyam/OneDrive/Desktop/QueryWise/docs/DEMO_SCRIPT.md).
