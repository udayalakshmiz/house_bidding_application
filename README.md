# House Bidding Application

End-to-end house auction platform with a React frontend and Spring Boot backend in a single repository.

## Overview

This project supports:
- User registration/login with OTP verification
- Property listing, image uploads, and admin verification workflows
- Real-time auction creation, bidding, and STOMP WebSocket live rooms
- Aadhaar & document upload verification

---

## Repository Structure

```text
House_Bidding_Application/
├── frontend/             # React + Vite client application
├── backend/              # Spring Boot REST API & WebSocket server
├── docker-compose.yml    # Full-stack production Docker orchestration
├── render.yaml          # 1-click Render blueprint
└── README.md             # Project documentation
```

---

## Tech Stack

- **Frontend**: React 18, Vite, Axios, SockJS, STOMP
- **Backend**: Spring Boot 3, Spring Security, Spring Data JPA, WebSocket
- **Database**: MySQL 8+
- **Build Tools**: npm (frontend), Maven Wrapper (backend)

---

## Local Setup

### 1) Prerequisites
- Node.js 18+ and npm
- Java 17
- MySQL 8+

### 2) Database Setup
```sql
CREATE DATABASE house_auction_db;
```

### 3) Backend Setup
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

### 4) Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## Production Deployment Guide

### Option 1: Deployment via Docker & Docker Compose (Recommended for VPS / Cloud Instances)

To launch the full application with MySQL, Backend, and Frontend containers:

```powershell
docker-compose up -d --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8081`

---

### Option 2: Render Blueprint (Render.com 1-Click Deployment)

1. Connect your GitHub repository to [Render](https://render.com).
2. Click **New +** -> **Blueprint**.
3. Select this repository. Render will automatically read `render.yaml` and provision:
   - MySQL Database
   - Spring Boot Backend Service
   - React Static Frontend Site

---

### Option 3: Separate Frontend (Vercel / Netlify) & Backend (Render / Railway / AWS)

#### 1) Deploy Frontend (Vercel)
- Import the `frontend` folder into Vercel.
- Framework Preset: **Vite**
- Environment Variables:
  - `VITE_API_BASE_URL`: `https://your-backend-domain.com/api`
  - `VITE_SERVER_BASE_URL`: `https://your-backend-domain.com`
  - `VITE_WS_BASE_URL`: `https://your-backend-domain.com/ws-auction`
- Client-side routing is pre-configured via `frontend/vercel.json`.

#### 2) Deploy Frontend (Netlify)
- Build command: `cd frontend && npm install && npm run build`
- Publish directory: `frontend/dist`
- Client-side routing is pre-configured via `frontend/public/_redirects`.

#### 3) Deploy Backend (Render / Railway / Heroku / AWS)
- Build Command: `./mvnw clean package -DskipTests` (or Docker build)
- Start Command: `java -jar target/demo-0.0.1-SNAPSHOT.jar`
- Environment Variables:
  - `SPRING_DATASOURCE_URL`: `jdbc:mysql://<host>:<port>/<dbname>?useSSL=true`
  - `SPRING_DATASOURCE_USERNAME`: `<db_username>`
  - `SPRING_DATASOURCE_PASSWORD`: `<db_password>`
  - `CORS_ALLOWED_ORIGINS`: `https://your-frontend.vercel.app,https://your-custom-domain.com`
  - `FRONTEND_URL`: `https://your-frontend.vercel.app`
  - `JWT_SECRET`: `<your_long_base64_secret_key>`
  - `PORT`: `8081` (or assigned by platform)

---

## Environment Variables Reference

### Backend (`application.yml`)
| Variable | Description | Default (Local) |
|---|---|---|
| `PORT` | HTTP Port for Spring Boot | `8081` |
| `SPRING_DATASOURCE_URL` | MySQL Connection JDBC URL | `jdbc:mysql://localhost:3306/house_auction_db` |
| `SPRING_DATASOURCE_USERNAME` | MySQL Username | `root` |
| `SPRING_DATASOURCE_PASSWORD` | MySQL Password | `""` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed CORS origins | `http://localhost:5173,http://localhost:5174` |
| `FRONTEND_URL` | URL of Frontend (for password reset links) | `http://localhost:5173` |
| `JWT_SECRET` | Secret key for signing JWT tokens | Default Base64 Secret |

### Frontend (`.env` or Cloud Settings)
| Variable | Description | Default (Local) |
|---|---|---|
| `VITE_API_BASE_URL` | Base API endpoint for REST calls | `http://localhost:8081/api` |
| `VITE_SERVER_BASE_URL` | Server root URL for file uploads | `http://localhost:8081` |
| `VITE_WS_BASE_URL` | WebSocket endpoint for STOMP SockJS | `http://localhost:8081/ws-auction` |

---

## Verification & Build Commands

### Frontend Build
```powershell
cd frontend
npm run build
```

### Backend Build
```powershell
cd backend
.\mvnw.cmd clean package -DskipTests
```
