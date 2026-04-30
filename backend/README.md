# House Bidding Backend

Spring Boot backend for the House Bidding application.

## Tech Stack

- Java 17
- Spring Boot 3
- Spring Security + JWT
- Spring Data JPA
- MySQL
- Spring WebSocket (STOMP/SockJS)

## Prerequisites

- Java 17
- Maven (or use `mvnw.cmd`)
- MySQL running locally

## Important: Secrets Safety

Do **not** commit real credentials to GitHub.

- Keep your real config in `src/main/resources/application.yml` (local only).
- This file is ignored in `.gitignore`.
- Use `src/main/resources/application.example.yml` as template.

## Setup

1. Open terminal in backend folder:
   `C:\Users\klaks\Downloads\demo`
2. Copy template config:
   - from `src/main/resources/application.example.yml`
   - to `src/main/resources/application.yml`
3. Fill your local DB/mail/JWT values in `application.yml`.
4. Create database in MySQL:
   `house_auction_db`
5. Run backend:
   `.\mvnw.cmd spring-boot:run`

Backend starts on: `http://localhost:8081`

## Key Endpoints

- Health/Test: `GET /test`
- Auth APIs: `/api/auth/...`
- Auctions: `/api/auctions/...`
- Properties: `/api/properties/...`
- Live websocket endpoint: `/ws-auction`

## Frontend Connection

Frontend (Vite app) runs on `http://localhost:5173` and calls this backend at `http://localhost:8081`.

Connection pattern:
- REST calls via Axios/Fetch to `http://localhost:8081/api/...`
- Live auction updates via SockJS/STOMP to `http://localhost:8081/ws-auction`

## Build

- Run tests:
  `.\mvnw.cmd test`
- Package jar:
  `.\mvnw.cmd clean package`
