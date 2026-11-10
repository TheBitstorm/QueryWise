# QueryWise: 10-Minute Presentation & Evaluation Demo Script

A structured presentation guide for a team of three students presenting **QueryWise** for a College Cloud Computing project evaluation.

---

## Presentation Breakdown by Speaker

| Student | Section | Time | Focus |
| :--- | :--- | :--- | :--- |
| **Student 1** | Introduction & Cloud Architecture | 0:00 – 3:00 (3 min) | Problem statement, technology stack, AWS deployment design. |
| **Student 2** | Live Demonstration | 3:00 – 6:30 (3.5 min) | Query Analyzer, Plan Inspector, AI Explanations, Query Comparison. |
| **Student 3** | Security, Data & Cloud Cost Analysis | 6:30 – 10:00 (3.5 min) | SQL execution safety, PostgreSQL benchmarks, Free Tier costs, Q&A. |

---

## Detailed Speaking Script

### 🎤 Student 1: Motivation, System Design & Cloud Architecture (0:00 – 3:00)

**[Slide / Screen: Dashboard Page]**

> "Good morning, professors and evaluators. Today, our team is presenting **QueryWise: AI-Assisted Database Performance Intelligence Platform**.
> 
> As web and cloud applications scale, the single most common cause of high latency and unexpected cloud hosting costs is inefficient SQL queries. While database engines like PostgreSQL provide `EXPLAIN ANALYZE`, their output consists of cryptic tree nodes, costs, and buffer statistics that are difficult for junior developers and students to understand.
> 
> **QueryWise** solves this problem by combining real database execution plan analysis, deterministic performance heuristic engines, and generative AI explanations into an accessible developer platform.
> 
> **Technology Stack:**
> - **Frontend**: React with Vite, styled with Tailwind CSS, utilizing Recharts for data telemetry and Lucide React icons. We designed a minimal, high-contrast UI inspired by modern developer platforms like Linear and Vercel, with full dark and light mode persistence.
> - **Backend**: Node.js and Express.js REST API using modular architecture with separated controllers, validators, and analyzers.
> - **Database Engine**: PostgreSQL 16. QueryWise connects to Amazon RDS PostgreSQL in the cloud via node-postgres, and features an embedded PostgreSQL 16 WASM engine for zero-configuration local execution.
> - **Cloud Architecture**: Containerized with Docker and configured for deployment on **AWS App Runner** or **AWS Elastic Beanstalk**, with health check endpoints and an automated ECR build pipeline.
> 
> Now, my teammate will demonstrate the core features live."

---

### 🎤 Student 2: Live Feature Demonstration (3:00 – 6:30)

**[Screen: Navigates to `/analyzer`]**

> "Thank you. Let’s look at the **Query Analyzer** in action.
> 
> In the top right, we have a sample query selector. I’ll load **Sample #3: Unindexed Sequential Scan on 3,000 Orders**.
> 
> Notice the query:
> ```sql
> SELECT id, order_number, user_id, status, total_amount, created_at
> FROM demo_orders
> WHERE status = 'pending' AND total_amount > 1500.00;
> ```
> 
> When I click **Analyse & Execute (EXPLAIN ANALYZE)**:
> 1. The query is validated and executed against our controlled PostgreSQL demo database containing over 6,600 realistic records.
> 2. The platform displays real performance telemetry: Execution time, planning time, planner cost, and rows returned.
> 3. Look at the **PostgreSQL Execution Plan** below: QueryWise parses the raw plan into an intuitive structured tree. Notice how the **Sequential Scan** node is highlighted in amber because 2,752 rows were read from disk and discarded by the filter!
> 4. We can also toggle to the **Raw Text Plan** to inspect the exact PostgreSQL planner output.
> 5. Next, look at the **AI Performance Intelligence Panel**: Powered by Google Gemini (with an offline deterministic fallback), it explains in plain language what the query does, why it is slow, and how adding a B-Tree index will eliminate full-table scanning.
> 
> Now, let’s see the **Query Comparison** feature. I click **'Compare in Test'** on the suggested index fix.
> 
> **[Screen: Navigates to `/compare`]**
> 
> Here, QueryWise executes both queries side-by-side with warm-up buffer caches under identical isolation:
> - The bar charts show the before-and-after comparison.
> - The mathematical improvement formula:
>   $$\text{Improvement (\%)} = \frac{\text{Original Time} - \text{Optimized Time}}{\text{Original Time}} \times 100$$
> - In this run, the candidate query achieved over **90% latency reduction** and switched from a full Sequential Scan to an optimized lookup.
> 
> I’ll now hand over to my teammate to explain our security sandbox and cloud economics."

---

### 🎤 Student 3: Security, Audit History & Cloud Deployment (6:30 – 10:00)

**[Screen: Navigates to `/history` and `/settings`]**

> "Thank you. Two critical engineering considerations for QueryWise are **Security** and **Cloud Economics**.
> 
> **1. SQL Execution Safety Sandbox:**
> We never execute arbitrary user-submitted SQL without safety boundaries:
> - Our AST/Regex SQL validator strictly permits only read-only `SELECT` and `WITH` (CTE) queries.
> - If an evaluator tries to run `DROP TABLE demo_users;` or `UPDATE demo_products SET price = 0;`, the query is immediately intercepted and rejected with HTTP 400 Bad Request before touching the database engine.
> - Semicolon query-chaining attacks are blocked to prevent SQL injection.
> 
> **2. Audit & History Management:**
> On the **History page**, every analysis is permanently logged in PostgreSQL with timestamp, execution time, cost, and detected issues. Evaluators can re-run historical queries or delete records with a single click.
> 
> **3. AWS Cloud Deployment & Free Tier Economics:**
> In `deployment/`, we have provided:
> - A multi-stage `Dockerfile` that builds the React frontend and packages it with the backend into a lightweight Alpine container.
> - Configuration for **AWS App Runner** (`apprunner.yaml`) and **Elastic Beanstalk** (`Dockerrun.aws.json`).
> - We chose **AWS App Runner** and **Amazon RDS PostgreSQL (db.t4g.micro)** because they fit squarely inside the **AWS Free Tier**, incurring $0 in monthly database costs while automatically pausing compute when idle.
> 
> **Summary:**
> QueryWise bridges the gap between raw database performance internals and developer productivity. All test suites pass 100%, and the system is ready for evaluation.
> 
> We now welcome any questions from the panel. Thank you!"

---

## Potential Questions & Answers for Defense

**Q1: How do you prevent users from overloading the database with expensive queries?**
> *Answer*: "We apply statement timeouts in PostgreSQL (10,000ms limit), restrict queries to read-only SELECT statements, and provide an 'Explain Only' dry-run button that calculates planner costs without executing the query on disk."

**Q2: What happens if the Gemini API key runs out of quota or the network is down?**
> *Answer*: "We built QueryWise with resilient isolation: if `GEMINI_API_KEY` is missing or fails, our deterministic rule engine automatically generates plain-language explanations from the plan nodes. The application never crashes."

**Q3: How does your comparison feature ensure fair benchmarks?**
> *Answer*: "Both queries are executed sequentially with a cache warm-up run to eliminate cold-start filesystem cache discrepancies, ensuring equitable comparison."

