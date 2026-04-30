# House Bidding Application

End-to-end house auction platform with a React frontend and Spring Boot backend in a single repository.

## Overview

This project supports:
- user registration/login with OTP flows
- property listing and verification workflows
- auction creation and bidding
- live auction updates using WebSockets

## Repository Structure

```text
House_Bidding_application/
|- frontend/   # React + Vite client app
|- backend/    # Spring Boot API + WebSocket server
|- .gitignore
|- README.md
```

## Tech Stack

- Frontend: React, Vite, Axios, SockJS, STOMP
- Backend: Spring Boot, Spring Security, Spring Data JPA, WebSocket
- Database: MySQL
- Build tools: npm (frontend), Maven Wrapper (backend)

## Architecture At A Glance

- Frontend runs on `http://localhost:5173`
- Backend runs on `http://localhost:8081`
- Frontend -> Backend REST calls: `http://localhost:8081/api/...`
- Frontend -> Backend realtime channel: `http://localhost:8081/ws-auction`

## Prerequisites

- Node.js 18+ and npm
- Java 17
- MySQL 8+
- Git

## Local Setup

### 1) Clone and enter project

```powershell
git clone https://github.com/<your-username>/House_Bidding_Application.git
cd "House_Bidding_Application"
```

### 2) Backend setup

```powershell
cd "backend"
copy "src\main\resources\application.example.yml" "src\main\resources\application.yml"
```

Edit `backend/src/main/resources/application.yml` and set:
- MySQL `url`, `username`, `password`
- mail credentials
- JWT/admin values

Create MySQL database:

```sql
CREATE DATABASE house_auction_db;
```

Run backend:

```powershell
.\mvnw.cmd spring-boot:run
```

### 3) Frontend setup (new terminal)

```powershell
cd "frontend"
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment and Secrets

- Real secrets must stay local.
- `backend/src/main/resources/application.yml` is ignored by Git.
- Use `backend/src/main/resources/application.example.yml` as a shareable template.

## Common Commands

### Frontend

```powershell
cd "frontend"
npm run dev
npm run build
npm run preview
```

### Backend

```powershell
cd "backend"
.\mvnw.cmd spring-boot:run
.\mvnw.cmd test
.\mvnw.cmd clean package
```

## Git Workflow (Monorepo)

From repository root:

```powershell
git add .
git commit -m "your message"
git push
```

For first-time push only:

```powershell
git remote add origin https://github.com/<your-username>/House_Bidding_Application.git
git branch -M main
git push -u origin main
```

## Troubleshooting

- Backend not starting: verify MySQL is running and DB credentials are correct.
- CORS issues: ensure frontend uses `http://localhost:5173` and backend uses `http://localhost:8081`.
- WebSocket not connecting: confirm backend is running and `/ws-auction` endpoint is reachable.

## Notes

- This repo is structured as a monorepo for easier collaboration and single-point deployment/versioning.
- You can expand this README later with screenshots, API docs, and deployment instructions.
