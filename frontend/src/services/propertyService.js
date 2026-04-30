import { api, publicApi } from "./authService"
import { propertyApi } from "../config/propertyApi"

const PROPERTIES = "/properties"

const approvalBase = propertyApi.useAdminRoutesForApproval
    ? "/admin/properties"
    : PROPERTIES

// ── Auctioneer ────────────────────────────────────────────────────────────────

export const addProperty = (formData) => api.post(PROPERTIES, formData)

export const getMyProperties = () => api.get(`${PROPERTIES}/my`)

// ── Admin ─────────────────────────────────────────────────────────────────────

export const getPendingProperties = () => api.get(`${approvalBase}/pending`)

export const approveProperty = (id) =>
    api.put(`${approvalBase}/${id}/approve`, {})

export const rejectProperty = (id, reason) =>
    api.put(`${approvalBase}/${id}/reject`, { reason })

// ── Public ────────────────────────────────────────────────────────────────────

export const getApprovedProperties = () => publicApi.get(`${PROPERTIES}/approved`)

export const getPropertyById = (id) => api.get(`${PROPERTIES}/${id}`)
