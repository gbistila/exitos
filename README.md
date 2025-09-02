# ExitOS Platform

A full-stack MVP for brokerless business exits—featuring consultant profiles, seller onboarding, shared workspaces, and role-based access control.

## 🔧 Tech Stack
- Backend: Node.js + Express + SQLite
- Frontend: Next.js (pages router) + TypeScript
- Auth: JWT via httpOnly cookies
- Roles: Consultant, Seller, Admin

## 🚀 Setup

### Backend
```bash
cd backend
cp .env.example .env
npm install
node server.js
