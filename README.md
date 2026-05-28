# PromptWall

A full-stack agentic AI platform that trains language models to detect prompt injection attacks in real time. Built to demonstrate how autonomous agent workflows can iteratively improve an LLM's ability to distinguish malicious inputs from safe ones — without human intervention.

---

## What it does

Users submit natural language prompts to a "training LLM." A multi-agent system evaluates each response, identifies mistakes, extracts learning insights, and continuously updates the model's detection knowledge. Over a session, the training model gets measurably better at catching prompt injections.

The learning curve for each model is tracked and visualized as accuracy improves across prompts.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js |
| Database | Supabase Postgres |
| LLM | Groq API |
| Frontend | HTML, CSS, Vanilla JS |
| Auth | Supabase Auth |
| API Docs | Swagger (OpenAPI 3.0) |

---

## Agent Workflow

Every prompt submission runs through a three-agent pipeline:

```
User Prompt
    │
    ├── Ground Truth Model  (Groq — expert classifier, no prior context)
    └── Training Model      (Groq — novice system prompt + accumulated knowledge)
                │
                ▼
         Evaluation: Correct?
                │
     ┌──────────┴──────────┐
   Yes                     No
     │                     │
  Log only           Orchestrator activates:
                     ├── Learn Agent
                     │   └── 1-2 sentence insight on WHY it was wrong
                     └── Training Knowledge Agent
                         └── Synthesizes all insights into updated detection rules
                             (injected into training model's system prompt next prompt)
```

**Orchestrator** — always active, decides which agents run based on evaluation result.

**Learn Agent** — active only on incorrect answers. Generates a concise, specific insight about the conceptual error — not keyword surface-level, but the actual reasoning flaw.

**Training Knowledge Agent** — active only on incorrect answers. Aggregates all insights from the session into a numbered rule set (max 5 rules) that becomes the model's persistent training context.

---

## Pages

| Route | Description |
|---|---|
| `/` | Login / Sign up |
| `/dashboard.html` | Main training interface — submit prompts, view live results and agent activity |
| `/model.html?id=X` | Per-model learning curve graph + accumulated training knowledge |
| `/sessions.html` | History of all past sessions with prompt-level detail |
| `/api-docs` | Swagger API documentation |

---

## Database Schema

```
users
training_llms          ← 2 demo models auto-provisioned on signup
training_sessions      ← user-controlled start/end
prompts                ← stores text + ground truth label
model_responses        ← training and ground truth responses per prompt
evaluations            ← correct/incorrect + error type (FP / FN)
agent_logs             ← activity record for each agent per prompt
learning_insights      ← learn agent output (only on mistakes)
training_knowledge     ← persisted model knowledge state (unique per model)
performance_tracking   ← accuracy at each prompt number (powers the graph)
```

---

## Setup

See [SETUP.md](SETUP.md) for full instructions.

Quick start:

```bash
# 1. Run backend/src/db/schema.sql in the Supabase SQL editor

# 2. Configure environment
cp .env.example backend/.env
# Fill in DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and GROQ_API_KEY

# 3. Install and run
cd backend
npm install
npm run dev
```

Open `http://localhost:3000`

---

## Example of Environment Variables

**Supabase**:

```env
PORT=3000
DATABASE_URL=postgresql://postgres.your_project_ref:your_password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
NEXT_PUBLIC_SUPABASE_URL=https://your_project_ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
FRONTEND_URL=http://localhost:3000
GROQ_API_KEY=your_groq_api_key
TRAINING_MODEL=llama-3.1-8b-instant
GROUND_TRUTH_MODEL=llama-3.3-70b-versatile
AGENT_MODEL=llama-3.3-70b-versatile
```

`DATABASE_URL` is required because the backend runs server-side SQL queries through `pg`.

---

## Deploying to Render

1. Create a Supabase project and run `backend/src/db/schema.sql` in the Supabase SQL editor
2. Create a Render Web Service with **Root Directory** set to `backend`
3. Set **Build Command** to `npm install`
4. Set **Start Command** to `node server.js`
5. Add `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GROQ_API_KEY`, `FRONTEND_URL`, and any model overrides in the Render environment dashboard

## Deploying to Vercel

1. Create a Vercel project with **Root Directory** set to `frontend`
2. Set `VITE_API_BASE_URL` to your Render API URL with `/api`, for example `https://promptwall-api.onrender.com/api`
3. Deploy the frontend
4. After Vercel gives you the frontend URL, set Render's `FRONTEND_URL` to that URL and redeploy the backend

---

## Project Structure

```
PromptWall/
├── backend/
│   ├── public/                  # Frontend static files
│   │   ├── index.html
│   │   ├── dashboard.html
│   │   ├── model.html
│   │   ├── sessions.html
│   │   ├── css/style.css
│   │   └── js/
│   │       ├── api.js
│   │       ├── auth.js
│   │       ├── dashboard.js
│   │       ├── model.js
│   │       └── sessions.js
│   ├── src/
│   │   ├── agents/
│   │   │   ├── orchestrator.js
│   │   │   ├── learnAgent.js
│   │   │   └── trainingKnowledgeAgent.js
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── groq.js
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── db/schema.sql
│   ├── server.js
│   └── package.json
├── .env.example
├── SETUP.md
└── README.md
```
