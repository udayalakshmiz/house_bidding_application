import axios from "axios"

// ── Axios instances ───────────────────────────────────────────────────────────
export const api = axios.create({
    baseURL: "http://localhost:8081/api",
    withCredentials: true,
})

export const publicApi = axios.create({
    baseURL: "http://localhost:8081/api",
    withCredentials: false,
})
api.interceptors.request.use(
    (config) => {
        // Try sessionStorage first (tab-specific), fall back to localStorage
        const token = sessionStorage.getItem("token") || localStorage.getItem("token")
        if (token && token !== "undefined" && token !== "null") {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)
// ── Session-expiry interceptor ────────────────────────────────────────────────
// When the backend returns 401 (or 403/400 used for expired sessions),
// clear local state and redirect to login automatically.
api.interceptors.response.use(
    response => response,
    error => {
        const status = error?.response?.status
        // 401 = unauthenticated/expired session. 403 can be valid role/permission denial,
        // so do not force logout on 403.
        if (status === 401) {
            // Avoid redirect loops if already on login page
            if (!window.location.pathname.includes("/login")) {
                localStorage.clear()
                sessionStorage.clear()
                window.location.href = "/login"
            }
        }
        return Promise.reject(error)
    }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const register = (data) =>
    api.post("/auth/register", data)

export const verifyRegisterOtp = (email, otp) =>
    api.post(`/auth/verify-register?email=${encodeURIComponent(email)}&otp=${otp}`)

export const login = (data) =>
    api.post("/auth/login", data)

export const verifyLoginOtp = (email, otp) =>
    api.post(`/auth/verify-login?email=${encodeURIComponent(email)}&otp=${otp}`)

export const resendOtp = (email) =>
    api.post(`/auth/resend-otp?email=${encodeURIComponent(email)}`)

export const logout = () =>
    api.post("/auth/logout")

export const requestPasswordReset = (email) =>
    api.post("/auth/forgot-password", { email })

// ── Property — Auctioneer ─────────────────────────────────────────────────────
export const createProperty = (formData) =>
    api.post("/properties", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    })

export const getMyProperties = () =>
    api.get("/properties/my")

export const resubmitProperty = (id, formData) =>
    api.put(`/properties/${id}/resubmit`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    })

export const deleteMyProperty = (id) =>
    api.delete(`/properties/${id}`, { withCredentials: true })

// ── Property — Admin ──────────────────────────────────────────────────────────
export const getPendingProperties = () =>
    api.get("/properties/pending")

export const approveProperty = (id) =>
    api.put(`/properties/${id}/approve`, {})

export const rejectProperty = (id, reason) =>
    api.put(`/properties/${id}/reject`, { reason })

// ── Property — Public ─────────────────────────────────────────────────────────
export const getApprovedProperties = () =>
    publicApi.get("/properties/approved")

export const getPropertyById = (id) =>
    api.get(`/properties/${id}`)

// ── Auction ───────────────────────────────────────────────────────────────────
export const createAuction = (data) =>
    api.post("/auctions", data)

export const getMyAuctions = () =>
    api.get("/auctions/my")

export const getActiveAuctions = () =>
    api.get("/auctions")

// ── Property Deletion Requests ────────────────────────────────────────────────
export const requestPropertyDeletion = (id, reason, proofFile) => {
    const fd = new FormData()
    fd.append("reason", reason)
    if (proofFile) fd.append("proof", proofFile)
    return api.post(`/properties/${id}/request-deletion`, fd)
}

export const getDeletionRequests = () =>
    api.get("/properties/deletion-requests")

export const approveDeletion = (id) =>
    api.put(`/properties/${id}/approve-deletion`, {})

export const rejectDeletion = (id, reason) =>
    api.put(`/properties/${id}/reject-deletion`, { reason })

// ── Bidder Applications ───────────────────────────────────────────────────────

/** Bidder: apply to an auction (multipart — Aadhaar image + form fields) */
export const applyToAuction = (auctionId, formData) =>
    api.post(`/auction-applications/${auctionId}/apply`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    })

/** Bidder: get all their own applications */
export const getMyApplications = () =>
    api.get("/auction-applications/my")

/** Bidder: get their application status for one specific auction */
export const getMyApplicationForAuction = (auctionId) =>
    api.get(`/auction-applications/my/${auctionId}`)

/** Auctioneer: get all applications for one of their auctions */
export const getAuctionApplications = (auctionId) =>
    api.get(`/auction-applications/auction/${auctionId}`)

/** Auctioneer: approve a bidder's application */
export const approveApplication = (applicationId) =>
    api.put(`/auction-applications/${applicationId}/approve`, {})

/** Auctioneer: reject a bidder's application with a reason */
export const rejectApplication = (applicationId, reason) =>
    api.put(`/auction-applications/${applicationId}/reject`, { reason })
// ── ADD THESE TWO FUNCTIONS to your existing authService.js ──────────────────
// Place them in the "Bidder Applications" section at the bottom

// Auctioneer: cancel an auction (only before start time)
export const cancelAuction = (auctionId) =>
    api.put(`/auctions/${auctionId}/cancel`)

// Bidder: withdraw their application for an auction (before auction starts)
export const withdrawApplication = (auctionId) =>
    api.delete(`/auction-applications/${auctionId}/withdraw`)
// ── Live Auction Room ─────────────────────────────────────────────────────────

/** Get full auction state when entering the room */
export const getAuctionRoomState = (auctionId) =>
    api.get(`/auctions/${auctionId}/room-state`)