# House Bidding Frontend

React + Vite frontend for the House Bidding application.

## Tech Stack

- React 18
- Vite 5
- Axios
- SockJS + STOMP (live auction updates)

## Prerequisites

- Node.js 18+ (recommended)
- npm
- Backend running at `http://localhost:8081`

## Run Locally

1. Open terminal in this folder:
   `C:\Users\klaks\OneDrive\Documents\House_Bidding_application\frontend`
2. Install dependencies:
   `npm install`
3. Start dev server:
   `npm run dev`
4. Open browser:
   `http://localhost:5173`

## Build

- Create production build:
  `npm run build`
- Preview production build:
  `npm run preview`

## Backend Connection

This frontend currently calls backend APIs and websocket endpoint directly on:

- REST API: `http://localhost:8081/api/...`
- WebSocket endpoint: `http://localhost:8081/ws-auction`

If backend URL changes, update hardcoded URLs in `src` files (you can later move these to environment variables for easier management).
