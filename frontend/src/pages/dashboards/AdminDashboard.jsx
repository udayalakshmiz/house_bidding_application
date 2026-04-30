import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { approveProperty, getPendingProperties, logout, rejectProperty, getDeletionRequests, approveDeletion, rejectDeletion, getApprovedProperties } from "../../services/authService"
import DashboardLayout from "../../components/DashboardLayout"

const BASE = "http://localhost:8081"

function formatINR(v) {
    const n = Number(v); if (isNaN(n)) return "₹0"
    try { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n) }
    catch { return `₹${n.toLocaleString("en-IN")}` }
}
function formatDate(iso) {
    if (!iso) return "—"; const d = new Date(iso); if (isNaN(d)) return "—"
    return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}
function statusBadge(s) {
    if (s === "APPROVED") return { bg: "rgba(34, 197, 94, 0.15)", fg: "#4ade80" }
    if (s === "REJECTED") return { bg: "rgba(239, 68, 68, 0.15)", fg: "#f87171" }
    return { bg: "rgba(234, 179, 8, 0.15)", fg: "#facc15" }
}
function getImg(p) {
    const u = p?.imageUrl || p?.imagePath || null
    if (!u) return null; return u.startsWith("http") ? u : `${BASE}${u}`
}

function Spinner({ size = 18, color = "var(--dash-accent)" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 50 50" style={{ display: "inline-block", verticalAlign: "middle" }}>
            <circle cx="25" cy="25" r="20" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray="90 60">
                <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.9s" repeatCount="indefinite" />
            </circle>
        </svg>
    )
}

// ── Mini Map ──────────────────────────────────────────────────────────────────
function MiniMap({ lat, lng, label }) {
    const ref = useRef(null); const mapRef = useRef(null)
    useEffect(() => {
        if (!lat || !lng) return
        const init = () => {
            if (!window.L || !ref.current) return
            if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
            mapRef.current = window.L.map(ref.current, { zoomControl: true, scrollWheelZoom: false }).setView([lat, lng], 16)
            window.L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", { attribution: "&copy; Google Maps" }).addTo(mapRef.current)
            window.L.marker([lat, lng]).addTo(mapRef.current).bindPopup(label || "Property").openPopup()
        }
        if (window.L) init()
        else { const iv = setInterval(() => { if (window.L) { clearInterval(iv); init() } }, 200); return () => clearInterval(iv) }
        return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
    }, [lat, lng, label])

    if (!lat || !lng) return (
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: 16, textAlign: "center", color: "var(--dash-muted)", fontSize: 13 }}>
            📍 No coordinates for this property
        </div>
    )
    return (
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1.5px solid var(--dash-border)" }}>
            <div ref={ref} style={{ height: 220 }} />
            <div style={{ background: "#f8fafc", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--dash-border)" }}>
                <span style={{ fontSize: 12, color: "var(--dash-muted)", fontWeight: 600 }}>📍 {lat.toFixed(5)}, {lng.toFixed(5)}</span>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", textDecoration: "none", padding: "4px 10px", background: "#eff6ff", borderRadius: 6 }}>
                    🗺️ Get Directions
                </a>
            </div>
        </div>
    )
}

// ── Admin Property Modal ───────────────────────────────────────────────────────
function AdminPropertyModal({ p, onClose, onApprove, onReject, actionLoadingId }) {
    const [rejectReason, setRejectReason] = useState("")
    const [showRejectInput, setShowRejectInput] = useState(false)
    if (!p) return null
    const badge = statusBadge(p.status)
    const img = getImg(p)
    const isActing = actionLoadingId === p.id

    let amenitiesDisplay = []
    if (p.amenitiesJson) {
        try {
            const obj = JSON.parse(p.amenitiesJson)
            amenitiesDisplay = Object.entries(obj).filter(([, v]) => v).map(([k]) => k.replace(/([A-Z])/g, " $1").trim())
        } catch { }
    }

    const row = (label, value, color, full) => {
        if (!value && value !== 0) return null
        return (
            <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: color || "#1e293b", lineHeight: 1.5 }}>{value}</div>
            </div>
        )
    }

    const sec = (title) => (
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{title}</div>
    )

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 16 }}
            onClick={onClose}>
            <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 700, maxHeight: "93vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
                onClick={e => e.stopPropagation()}>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px 0" }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{p.title}</h2>
                        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                            {p.propertyType && <span style={{ fontSize: 11, fontWeight: 700, color: "#0ea5e9", background: "#e0f2fe", padding: "3px 10px", borderRadius: 999 }}>{p.propertyType}</span>}
                            {p.category && <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "3px 10px", borderRadius: 999 }}>{p.category}</span>}
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: badge.bg, color: badge.fg }}>{p.status}</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 34, height: 34, cursor: "pointer", fontSize: 16, fontWeight: 800, color: "#475569" }}>✕</button>
                </div>

                <div style={{ height: 220, background: "#f1f5f9", margin: "14px 24px", borderRadius: 12, overflow: "hidden" }}>
                    {img ? <img src={img} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none" }} />
                        : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dash-muted)" }}>No Image</div>}
                </div>

                <div style={{ padding: "0 24px 24px" }}>
                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                        {sec("💰 Pricing")}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                            {row("Starting Bid", formatINR(p.startingPrice), "#0ea5e9")}
                            {row("Expected Price", p.expectedPrice ? formatINR(p.expectedPrice) : null)}
                            {row("Reserve Price", p.reservePrice ? formatINR(p.reservePrice) : null)}
                            {row("Negotiable", p.negotiable === true ? "Yes" : p.negotiable === false ? "No" : null)}
                            {row("Auction Start", p.auctionStartDate ? formatDate(p.auctionStartDate) : null)}
                            {row("Auction End", p.auctionEndDate ? formatDate(p.auctionEndDate) : null)}
                        </div>
                    </div>

                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                        {sec("📍 Location")}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {row("City", p.city || p.location)}
                            {row("State", p.state)}
                            {row("Pincode", p.pincode)}
                            {row("Landmark", p.landmark)}
                            {p.addressLine1 && row("Full Address", [p.addressLine1, p.addressLine2, p.landmark, p.city, p.state, p.pincode].filter(Boolean).join(", "), null, true)}
                        </div>
                        <div style={{ marginTop: 14 }}>
                            <MiniMap lat={p.latitude} lng={p.longitude} label={p.address || p.title} />
                        </div>
                    </div>

                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                        {sec("🏗️ Property Details")}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                            {row("Bedrooms", p.bedrooms ? `${p.bedrooms} BHK` : null)}
                            {row("Bathrooms", p.bathrooms)}
                            {row("Floors", p.floors)}
                            {row("Floor No.", p.floorNumber)}
                            {row("Parking", p.parking)}
                            {row("Furnishing", p.furnishing)}
                            {row("Total Area", p.totalArea ? `${p.totalArea} sq ft` : null)}
                            {row("Built-up Area", p.builtUpArea ? `${p.builtUpArea} sq ft` : null)}
                            {row("Property Age", p.propertyAge ? `${p.propertyAge} yrs` : null)}
                            {row("Condition", p.propertyStatus)}
                            {row("Availability", p.availabilityStatus)}
                        </div>
                        {p.description && <div style={{ marginTop: 12 }}>{row("Description", p.description, null, true)}</div>}
                    </div>

                    {amenitiesDisplay.length > 0 && (
                        <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                            {sec("✨ Amenities")}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {amenitiesDisplay.map(a => (
                                    <span key={a} style={{ background: "#e0f2fe", color: "#0ea5e9", padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600 }}>✓ {a}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {p.ownerName && (
                        <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                            {sec("👤 Owner / Seller")}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                {row("Name", p.ownerName)}
                                {row("Phone", p.ownerPhone)}
                                {row("Email", p.ownerEmail)}
                                {row("Alt Phone", p.ownerAltPhone)}
                                {p.ownerAddress && row("Owner Address", p.ownerAddress, null, true)}
                            </div>
                        </div>
                    )}

                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                        {sec("🏷️ Submission Info")}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {row("Auctioneer", p.auctioneer?.name || "Unknown")}
                            {row("Email", p.auctioneer?.email)}
                            {row("Submitted", formatDate(p.createdAt))}
                            {row("Property ID", `#${p.id}`)}
                        </div>
                    </div>

                    {(p.documentUrl || p.regCertUrl || p.legalDocUrl) && (
                        <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                            {sec("📄 Documents")}
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                {p.documentUrl && <a href={`${BASE}${p.documentUrl}`} target="_blank" rel="noreferrer" style={{ color: "#0ea5e9", fontWeight: 700, fontSize: 13, textDecoration: "none", background: "#e0f2fe", padding: "7px 14px", borderRadius: 8 }}>📄 Ownership Doc</a>}
                                {p.regCertUrl && <a href={`${BASE}${p.regCertUrl}`} target="_blank" rel="noreferrer" style={{ color: "#059669", fontWeight: 700, fontSize: 13, textDecoration: "none", background: "#ecfdf5", padding: "7px 14px", borderRadius: 8 }}>📋 Registration Cert</a>}
                                {p.legalDocUrl && <a href={`${BASE}${p.legalDocUrl}`} target="_blank" rel="noreferrer" style={{ color: "#d97706", fontWeight: 700, fontSize: 13, textDecoration: "none", background: "#fffbeb", padding: "7px 14px", borderRadius: 8 }}>⚖️ Legal Clearance</a>}
                            </div>
                        </div>
                    )}

                    {p.status === "REJECTED" && p.rejectionReason && (
                        <div style={{ background: "#fef2f2", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#991b1b", textTransform: "uppercase", marginBottom: 4 }}>❌ Rejection Reason</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#dc2626" }}>{p.rejectionReason}</div>
                        </div>
                    )}

                    {p.status === "PENDING" && (
                        <div style={{ borderTop: "1px solid var(--dash-border)", paddingTop: 16 }}>
                            {!showRejectInput ? (
                                <div style={{ display: "flex", gap: 10 }}>
                                    <button onClick={() => { onApprove(p.id); onClose() }} disabled={isActing}
                                        style={{ padding: "11px 24px", background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                                        {isActing ? <Spinner size={14} color="#4ade80" /> : "✅ Approve Property"}
                                    </button>
                                    <button onClick={() => setShowRejectInput(true)} disabled={isActing}
                                        style={{ padding: "11px 24px", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                                        ❌ Reject
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>Provide rejection reason:</div>
                                    <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                        placeholder="e.g. Documents are incomplete or missing..."
                                        style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1.5px solid #fecaca", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "var(--dash-font)" }} />
                                    <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                                        <button onClick={() => { if (rejectReason.trim()) { onReject(p.id, rejectReason.trim()); onClose() } }} disabled={isActing || !rejectReason.trim()}
                                            style={{ padding: "10px 20px", background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                                            Confirm Reject
                                        </button>
                                        <button onClick={() => setShowRejectInput(false)}
                                            style={{ padding: "10px 20px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Main Admin Dashboard ───────────────────────────────────────────────────────
export default function AdminDashboard() {
    const navigate = useNavigate()
    const name = localStorage.getItem("name") || sessionStorage.getItem("name") || "Admin"
    const [activeTab, setActiveTab] = useState("dashboard")
    const [pending, setPending] = useState([])
    const [loadingPending, setLoadingPending] = useState(false)
    const [pendingError, setPendingError] = useState("")
    const [allProps, setAllProps] = useState([])
    const [loadingAll, setLoadingAll] = useState(false)
    const [allError, setAllError] = useState("")
    const [actionLoadingId, setActionLoadingId] = useState(null)
    const [actionError, setActionError] = useState("")
    const [selectedProperty, setSelectedProperty] = useState(null)
    const [deletionRequests, setDeletionRequests] = useState([])
    const [loadingDeletion, setLoadingDeletion] = useState(false)
    const [deletionActionId, setDeletionActionId] = useState(null)
    const [rejectDeletionId, setRejectDeletionId] = useState(null)
    const [rejectDeletionReason, setRejectDeletionReason] = useState("")
    const [deletionMsg, setDeletionMsg] = useState("")
    const [deletionError, setDeletionError] = useState("")

    const adminStats = useMemo(() => {
        const pCount = pending.length
        const aCount = allProps.filter(p => p.status === "APPROVED").length
        const rCount = allProps.filter(p => p.status === "REJECTED").length
        const tCount = allProps.length || (pCount + aCount + rCount)
        return { pending: pCount, approved: aCount, rejected: rCount, total: tCount }
    }, [pending, allProps])
    const pendingCount = adminStats.pending

    useEffect(() => {
        if (!document.getElementById("leaflet-css")) {
            const l = document.createElement("link"); l.id = "leaflet-css"; l.rel = "stylesheet"
            l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(l)
        }
        if (!window.L) {
            const s = document.createElement("script"); s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            s.async = true; document.head.appendChild(s)
        }
    }, [])

    const fetchPending = async () => {
        setLoadingPending(true); setPendingError("")
        try { const r = await getPendingProperties(); setPending(Array.isArray(r.data) ? r.data : []) }
        catch (e) { setPendingError(e?.response?.data?.message || e?.message || "Failed."); setPending([]) }
        finally { setLoadingPending(false) }
    }

    const fetchAll = async () => {
        setLoadingAll(true); setAllError("")
        try {
            const [pr, ar] = await Promise.all([getPendingProperties(), getApprovedProperties()])
            const map = new Map()
                ; (Array.isArray(pr.data) ? pr.data : []).forEach(p => map.set(p.id, p))
                ; (Array.isArray(ar.data) ? ar.data : []).forEach(p => map.set(p.id, p))
            setAllProps([...map.values()])
        } catch (e) { setAllError(e?.response?.data?.message || e?.message || "Failed."); setAllProps([]) }
        finally { setLoadingAll(false) }
    }

    useEffect(() => { fetchPending(); fetchAll() }, [])
    useEffect(() => { if (activeTab === "all") fetchAll() }, [activeTab])

    const fetchDeletionRequests = async () => {
        setLoadingDeletion(true)
        try {
            const res = await getDeletionRequests()
            setDeletionRequests(Array.isArray(res.data) ? res.data : [])
        } catch (err) {
            setDeletionError(err?.response?.data?.message || err?.message || "Failed.")
        }
        setLoadingDeletion(false)
    }

    useEffect(() => {
        if (activeTab === "deletion") fetchDeletionRequests()
    }, [activeTab])

    const handleLogout = async () => {
        try { await logout() } catch { } finally {
            localStorage.clear()
            sessionStorage.clear()
            navigate("/login")
        }
    }

    const handleApprove = async (id) => {
        setActionError(""); setActionLoadingId(id)
        try {
            const r = await approveProperty(id)
            setPending(prev => prev.filter(p => p.id !== id))
            if (r?.data) setAllProps(prev => prev.map(p => p.id === id ? r.data : p))
        } catch (e) { setActionError(e?.response?.data?.message || e?.message || "Failed.") }
        finally { setActionLoadingId(null) }
    }

    const handleReject = async (id, reason) => {
        if (!reason?.trim()) { setActionError("Please provide a rejection reason."); return }
        setActionError(""); setActionLoadingId(id)
        try {
            const r = await rejectProperty(id, reason.trim())
            setPending(prev => prev.filter(p => p.id !== id))
            if (r?.data) setAllProps(prev => prev.map(p => p.id === id ? r.data : p))
        } catch (e) { setActionError(e?.response?.data?.message || e?.message || "Failed.") }
        finally { setActionLoadingId(null) }
    }

    const handleApproveDeletion = async (id) => {
        setDeletionActionId(id)
        try {
            await approveDeletion(id)
            setDeletionMsg("✅ Property permanently deleted.")
            fetchDeletionRequests()
            setTimeout(() => setDeletionMsg(""), 3000)
        } catch (err) {
            setDeletionError(err?.response?.data?.message || err?.message || "Failed.")
        }
        setDeletionActionId(null)
    }

    const handleRejectDeletion = async () => {
        if (!rejectDeletionReason.trim()) return
        setDeletionActionId(rejectDeletionId)
        try {
            await rejectDeletion(rejectDeletionId, rejectDeletionReason.trim())
            setDeletionMsg("Deletion rejected. Property restored to APPROVED.")
            setRejectDeletionId(null)
            setRejectDeletionReason("")
            fetchDeletionRequests()
            setTimeout(() => setDeletionMsg(""), 3000)
        } catch (err) {
            setDeletionError(err?.response?.data?.message || err?.message || "Failed.")
        }
        setDeletionActionId(null)
    }

    // ── Style helpers ─────────────────────────────────────────────────────────
    const S = {
        btn: (v) => {
            const b = { borderRadius: 8, border: "none", cursor: "pointer", padding: "9px 14px", fontWeight: 600, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--dash-font)" }
            if (v === "ghost") return { ...b, background: "var(--dash-accent-light)", color: "var(--dash-accent)" }
            if (v === "success") return { ...b, background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.3)" }
            if (v === "danger") return { ...b, background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)" }
            return { ...b, background: "var(--dash-accent)", color: "white" }
        },
        banner: (t) => ({ padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, marginTop: 10, background: t === "error" ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)", color: t === "error" ? "#f87171" : "#4ade80", border: `1px solid ${t === "error" ? "rgba(239, 68, 68, 0.3)" : "rgba(34, 197, 94, 0.3)"}` }),
    }

    // ── Dashboard tab ─────────────────────────────────────────────────────────
    const renderDashboard = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="dc-welcome">
                <div>
                    <div className="dc-welcome-title">System Overview 🛡️</div>
                    <div className="dc-welcome-sub">Manage the platform — review properties, monitor activity, and maintain quality standards.</div>
                </div>
                <button onClick={() => { fetchPending(); fetchAll() }} className="dc-btn" style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }} disabled={loadingPending || loadingAll}>
                    {loadingPending || loadingAll ? <Spinner size={16} color="white" /> : "↻ Refresh All"}
                </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
                {[
                    ["🏠", "Total Submissions", adminStats.total, "#6366f1", "rgba(99,102,241,0.08)"],
                    ["⏳", "Pending Review", adminStats.pending, "#f59e0b", "rgba(245,158,11,0.08)"],
                    ["✅", "Approved", adminStats.approved, "#10b981", "rgba(16,185,129,0.08)"],
                    ["❌", "Rejected", adminStats.rejected, "#ef4444", "rgba(239,68,68,0.08)"],
                ].map(([icon, label, val, fg, bg]) => (
                    <div key={label} className="dc-stat-card" style={{ borderTop: `3px solid ${fg}` }}>
                        <div className="dc-stat-icon" style={{ background: bg, color: fg }}>{icon}</div>
                        <div className="dc-stat-label" style={{ color: fg }}>{label}</div>
                        <div className="dc-stat-value">{loadingPending || loadingAll ? <Spinner size={22} color={fg} /> : val}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
                <div className="dc-card">
                    <div className="dc-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        📋 Recent Activity
                        {adminStats.pending > 0 && <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>{adminStats.pending} Action Required</span>}
                    </div>
                    {adminStats.pending > 0 ? (
                        <div style={{ color: "var(--dash-muted)", fontSize: 14 }}>
                            There are currently <b style={{ color: "var(--dash-text)" }}>{adminStats.pending}</b> properties awaiting your review.
                            <button onClick={() => setActiveTab("pending")} style={{ background: "none", border: "none", color: "var(--dash-accent)", fontWeight: 700, cursor: "pointer", marginLeft: 6 }}>Review Now →</button>
                        </div>
                    ) : (
                        <div style={{ color: "var(--dash-muted)", fontSize: 14 }}>No pending properties at the moment. Well done! ✨</div>
                    )}
                </div>
                <div className="dc-card" style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)", border: "none" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>Property Archives</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>Access all historical listing data.</div>
                    <button onClick={() => setActiveTab("all")} style={{ ...S.btn("ghost"), marginTop: 12, background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}>Browse All</button>
                </div>
            </div>
        </div>
    )

    // ── Pending tab ───────────────────────────────────────────────────────────
    const renderPending = () => (
        <div>
            <div className="dc-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                    <div className="dc-section-title" style={{ marginBottom: 4 }}>Pending Properties</div>
                    <div style={{ fontSize: 13, color: "var(--dash-muted)" }}>Click any card to view full details before approving or rejecting.</div>
                </div>
                <button onClick={fetchPending} style={S.btn("ghost")} disabled={loadingPending}>
                    {loadingPending ? <><Spinner size={16} /> Refreshing</> : "↻ Refresh"}
                </button>
            </div>
            {pendingError && <div style={S.banner("error")}>{pendingError}</div>}
            {actionError && <div style={S.banner("error")}>{actionError}</div>}
            {loadingPending ? (
                <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--dash-muted)", padding: 16 }}><Spinner size={20} /> Loading...</div>
            ) : pending.length === 0 ? (
                <div className="dc-card" style={{ color: "var(--dash-muted)", textAlign: "center", padding: 40 }}>🎉 No pending properties!</div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
                    {pending.map(p => {
                        const img = getImg(p)
                        const isActing = actionLoadingId === p.id
                        return (
                            <div key={p.id} className="dc-prop-card" onClick={() => setSelectedProperty(p)}>
                                <div style={{ height: 160, background: "#f1f5f9", position: "relative" }}>
                                    {img ? <img src={img} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { e.target.style.display = "none" }} />
                                        : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dash-muted)" }}>No Image</div>}
                                    <span style={{ position: "absolute", top: 10, right: 10, padding: "4px 10px", borderRadius: 999, background: "#fef9c3", color: "#854d0e", fontSize: 11, fontWeight: 700 }}>PENDING</span>
                                    {p.latitude && p.longitude && <span style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6 }}>📍 Map</span>}
                                </div>
                                <div style={{ padding: 14 }}>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dash-text)" }}>{p.title} <span style={{ fontSize: 11, color: "var(--dash-accent)" }}>View Details →</span></div>
                                    {p.propertyType && <div style={{ fontSize: 11, color: "var(--dash-accent)", fontWeight: 600, marginTop: 2 }}>{p.propertyType} • {p.category}</div>}
                                    <div style={{ fontSize: 13, color: "var(--dash-muted)", marginTop: 6 }}>📍 {p.city || p.location}</div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dash-accent)", marginTop: 4 }}>{formatINR(p.startingPrice)}</div>
                                    {p.bedrooms && <div style={{ fontSize: 12, color: "var(--dash-muted)", marginTop: 4 }}>🛏️ {p.bedrooms} BHK • 🚿 {p.bathrooms || "—"} Bath</div>}
                                    <div style={{ fontSize: 11, color: "var(--dash-muted)", marginTop: 4 }}>👤 {p.auctioneer?.name || "Unknown"} • {formatDate(p.createdAt)}</div>
                                    <div style={{ display: "flex", gap: 8, marginTop: 12 }} onClick={e => e.stopPropagation()}>
                                        <button onClick={() => handleApprove(p.id)} style={S.btn("success")} disabled={isActing}>
                                            {isActing ? <Spinner size={13} color="#166534" /> : "✅ Approve"}
                                        </button>
                                        <button onClick={() => setSelectedProperty(p)} style={S.btn("danger")} disabled={isActing}>❌ Reject</button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )

    // ── All properties tab ────────────────────────────────────────────────────
    const renderAll = () => (
        <div>
            <div className="dc-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                    <div className="dc-section-title" style={{ marginBottom: 4 }}>All Properties</div>
                    <div style={{ fontSize: 13, color: "var(--dash-muted)" }}>Pending + Approved combined. Click View for full details.</div>
                </div>
                <button onClick={fetchAll} style={S.btn("ghost")} disabled={loadingAll}>
                    {loadingAll ? <><Spinner size={16} /> Refreshing</> : "↻ Refresh"}
                </button>
            </div>
            {allError && <div style={S.banner("error")}>{allError}</div>}
            {loadingAll ? (
                <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--dash-muted)", padding: 16 }}><Spinner size={20} /> Loading...</div>
            ) : allProps.length === 0 ? (
                <div className="dc-card" style={{ color: "var(--dash-muted)", textAlign: "center", padding: 40 }}>No properties found.</div>
            ) : (
                <div className="dc-card" style={{ padding: 0, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr>
                                {["ID", "Title", "Type", "Location", "Price", "BHK", "Status", "Auctioneer", "Date", ""].map(h => (
                                    <th key={h} style={{ textAlign: "left", padding: "12px 14px", background: "#f8fafc", borderBottom: "1px solid var(--dash-border)", fontWeight: 700, color: "var(--dash-muted)", whiteSpace: "nowrap", fontSize: 12 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {allProps.map(p => {
                                const badge = statusBadge(p.status)
                                return (
                                    <tr key={p.id} style={{ transition: "background 0.1s" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                        onMouseLeave={e => e.currentTarget.style.background = ""}>
                                        <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--dash-border)", color: "var(--dash-muted)" }}>#{p.id}</td>
                                        <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--dash-border)", fontWeight: 600, color: "var(--dash-text)" }}>{p.title}</td>
                                        <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--dash-border)", color: "var(--dash-muted)" }}>{p.propertyType || "—"}</td>
                                        <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--dash-border)", color: "var(--dash-muted)" }}>{p.city || p.location}</td>
                                        <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--dash-border)", fontWeight: 700, color: "var(--dash-accent)" }}>{formatINR(p.startingPrice)}</td>
                                        <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--dash-border)", color: "var(--dash-muted)" }}>{p.bedrooms ? `${p.bedrooms} BHK` : "—"}</td>
                                        <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--dash-border)" }}>
                                            <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.fg }}>{p.status}</span>
                                        </td>
                                        <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--dash-border)", color: "var(--dash-muted)" }}>{p.auctioneer?.name || "—"}</td>
                                        <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--dash-border)", color: "var(--dash-muted)", whiteSpace: "nowrap" }}>{formatDate(p.createdAt)}</td>
                                        <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--dash-border)" }}>
                                            <button onClick={() => setSelectedProperty(p)} style={S.btn("ghost")}>View →</button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )

    const renderDeletionRequests = () => (
        <div>
            <div className="dc-card" style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div className="dc-section-title">🗑️ Deletion Requests</div>
                        <div style={{ fontSize: 13, color: "var(--dash-muted)", marginTop: 4 }}>
                            Auctioneers requesting deletion of their approved properties.
                        </div>
                    </div>
                    <button onClick={fetchDeletionRequests} className="dc-btn dc-btn-ghost dc-btn-sm" disabled={loadingDeletion}>
                        {loadingDeletion ? "Loading..." : "↻ Refresh"}
                    </button>
                </div>
                {deletionError && <div className="dc-banner dc-banner-error" style={{ marginTop: 12 }}>{deletionError}</div>}
                {deletionMsg && <div className="dc-banner dc-banner-success" style={{ marginTop: 12 }}>{deletionMsg}</div>}
            </div>

            {loadingDeletion ? (
                <div style={{ padding: 20, color: "var(--dash-muted)" }}>Loading...</div>
            ) : deletionRequests.length === 0 ? (
                <div className="dc-card" style={{ textAlign: "center", color: "var(--dash-muted)", padding: 40 }}>
                    🎉 No pending deletion requests.
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
                    {deletionRequests.map(p => {
                        const img = p.imageUrl ? `${BASE}${p.imageUrl}` : null
                        const isActing = deletionActionId === p.id
                        return (
                            <div key={p.id} className="dc-card" style={{ padding: 0, overflow: "hidden" }}>
                                <div style={{ height: 140, background: "#f1f5f9" }}>
                                    {img
                                        ? <img src={img} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { e.target.style.display = "none" }} />
                                        : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontWeight: 600 }}>No Image</div>}
                                </div>
                                <div style={{ padding: 16 }}>
                                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{p.title}</div>
                                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>📍 {p.city || p.location}</div>
                                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>👤 {p.auctioneer?.name} — {p.auctioneer?.email}</div>

                                    {p.deletionReason && (
                                        <div style={{ marginTop: 10, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "8px 12px" }}>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: "#c2410c", textTransform: "uppercase", marginBottom: 3 }}>Reason</div>
                                            <div style={{ fontSize: 13, color: "#7c2d12" }}>{p.deletionReason}</div>
                                        </div>
                                    )}

                                    {p.deletionProofUrl && (
                                        <a href={`${BASE}${p.deletionProofUrl}`} target="_blank" rel="noreferrer"
                                            style={{ display: "inline-block", marginTop: 10, fontSize: 12, fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "5px 12px", borderRadius: 6, textDecoration: "none" }}>
                                            📎 View Proof Document
                                        </a>
                                    )}

                                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                                        <button onClick={() => handleApproveDeletion(p.id)} disabled={isActing}
                                            style={{ padding: "8px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 800, opacity: isActing ? 0.6 : 1 }}>
                                            {isActing ? "..." : "✅ Approve & Delete"}
                                        </button>
                                        <button onClick={() => { setRejectDeletionId(p.id); setRejectDeletionReason("") }} disabled={isActing}
                                            style={{ padding: "8px 16px", background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 800 }}>
                                            ❌ Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {rejectDeletionId && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
                    onClick={() => setRejectDeletionId(null)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440 }}
                        onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 800 }}>❌ Reject Deletion Request</h3>
                        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 14 }}>Property will be restored to APPROVED.</p>
                        <textarea value={rejectDeletionReason} onChange={e => setRejectDeletionReason(e.target.value)}
                            placeholder="Reason for rejecting the deletion request..."
                            rows={3}
                            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", marginBottom: 16, fontFamily: "inherit" }}
                        />
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={handleRejectDeletion} disabled={deletionActionId === rejectDeletionId}
                                style={{ padding: "10px 20px", background: "#374151", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 14, fontWeight: 800 }}>
                                Confirm Reject
                            </button>
                            <button onClick={() => setRejectDeletionId(null)}
                                style={{ padding: "10px 18px", background: "#f1f5f9", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )

    const navItems = [
        { id: "dashboard", icon: "📊", label: "Dashboard" },
        { id: "pending", icon: "⏳", label: "Pending Review", badge: pendingCount, badgeMuted: pendingCount === 0 },
        { id: "all", icon: "🏠", label: "All Properties" },
        {
            id: "deletion",
            icon: "🗑️",
            label: "Deletion Requests",
            badge: deletionRequests.length,
            badgeMuted: deletionRequests.length === 0,
        },
    ]
    const pageTitle =
        activeTab === "dashboard" ? "Admin Dashboard" :
            activeTab === "pending" ? "Pending Review" :
                activeTab === "all" ? "All Properties" :
                    "Deletion Requests"

    return (
        <DashboardLayout
            navItems={navItems}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onNavigate={navigate}
            userName={name}
            userRole="Admin"
            onLogout={handleLogout}
            pageTitle={pageTitle}
        >
            {activeTab === "dashboard" && renderDashboard()}
            {activeTab === "pending" && renderPending()}
            {activeTab === "all" && renderAll()}
            {activeTab === "deletion" && renderDeletionRequests()}
            {selectedProperty && (
                <AdminPropertyModal p={selectedProperty} onClose={() => setSelectedProperty(null)}
                    onApprove={handleApprove} onReject={handleReject} actionLoadingId={actionLoadingId} />
            )}
        </DashboardLayout>
    )
}