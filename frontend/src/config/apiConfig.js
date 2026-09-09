/**
 * Central API and Server Configuration for Deployment
 */

// Base API URL (e.g. "http://localhost:8081/api" or "https://api.yourdomain.com/api")
export const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api";

// Server root URL without trailing /api (used for serving uploads, static files, etc.)
export const SERVER_BASE_URL =
    import.meta.env.VITE_SERVER_BASE_URL || API_BASE_URL.replace(/\/api\/?$/, "");

// WebSocket URL for SockJS / STOMP
export const WS_BASE_URL =
    import.meta.env.VITE_WS_BASE_URL || `${SERVER_BASE_URL}/ws-auction`;

/**
 * Constructs a full URL for backend-hosted media/files (e.g. property images, Aadhaar proof).
 * Handles absolute URLs, null paths, and missing leading slashes seamlessly.
 */
export const getFileUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${SERVER_BASE_URL}${cleanPath}`;
};
