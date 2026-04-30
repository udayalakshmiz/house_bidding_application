import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { createProperty, getMyProperties, getMyAuctions, logout, resubmitProperty, deleteMyProperty, requestPropertyDeletion, cancelAuction } from "../../services/authService"
import DashboardLayout from "../../components/DashboardLayout"

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE = "http://localhost:8081"
const PRIMARY = "#4f46e5"

// ── Utilities ─────────────────────────────────────────────────────────────────
function formatINR(v) {
    const n = Number(v)
    if (isNaN(n)) return "₹0"
    try { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n) }
    catch { return `₹${n.toLocaleString("en-IN")}` }
}
function formatDate(iso) {
    if (!iso) return "—"
    const d = new Date(iso)
    if (isNaN(d)) return "—"
    return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}
function statusBadge(s) {
    if (s === "APPROVED") return { bg: "rgba(34, 197, 94, 0.15)", fg: "#4ade80" }
    if (s === "REJECTED") return { bg: "rgba(239, 68, 68, 0.15)", fg: "#f87171" }
    return { bg: "rgba(234, 179, 8, 0.15)", fg: "#facc15" }
}
function getImg(p) {
    const u = p?.imageUrl || p?.imagePath || null
    if (!u) return null
    return u.startsWith("http") ? u : `${BASE}${u}`
}
function auctionTimes(a) {
    const startRaw = a.startTime ?? a.startDate ?? a.auctionStartTime ?? a.auctionStartDate
    const endRaw = a.endTime ?? a.endDate ?? a.auctionEndTime ?? a.auctionEndDate
    const start = startRaw ? new Date(startRaw) : null
    const end = endRaw ? new Date(endRaw) : null
    return {
        start: start && !isNaN(start.getTime()) ? start : null,
        end: end && !isNaN(end.getTime()) ? end : null,
    }
}
function isAuctionCompleted(a) {
    const s = String(a.status || "").toUpperCase()
    if (s === "CANCELLED" || s === "CANCELED" || s === "ENDED" || s === "COMPLETED" || s === "CLOSED") return true
    const { end } = auctionTimes(a)
    if (end && end.getTime() <= Date.now()) return true
    return false
}
function auctionPropertyTitle(a) {
    return a.property?.title || a.propertyTitle || a.title || (a.propertyId != null ? `Property #${a.propertyId}` : `Auction #${a.id ?? "—"}`)
}
function upcomingPhase(a) {
    const { start, end } = auctionTimes(a)
    const now = Date.now()
    if (start && start.getTime() > now) return { label: "Scheduled", bg: "rgba(234, 179, 8, 0.15)", fg: "#facc15" }
    if (end && end.getTime() > now) return { label: "Live", bg: "rgba(34, 197, 94, 0.15)", fg: "#4ade80" }
    return { label: "Active", bg: "rgba(99, 102, 241, 0.15)", fg: "#818cf8" }
}
// Returns true if the auction hasn't started yet and can be cancelled
function canCancelAuction(a) {
    const s = String(a.status || "").toUpperCase()
    if (s === "CANCELLED" || s === "CANCELED" || s === "COMPLETED" || s === "ENDED") return false
    const { start } = auctionTimes(a)
    if (!start) return true // no start time set — allow cancel
    return start.getTime() > Date.now()
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 18, color = PRIMARY }) {
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
    const ref = useRef(null)
    const mapRef = useRef(null)
    useEffect(() => {
        if (!lat || !lng) return
        const init = () => {
            if (!window.L || !ref.current) return
            if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
            mapRef.current = window.L.map(ref.current, { zoomControl: true, scrollWheelZoom: false })
                .setView([lat, lng], 16)
            window.L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", { attribution: "&copy; Google Maps" }).addTo(mapRef.current)
            window.L.marker([lat, lng]).addTo(mapRef.current).bindPopup(label || "Property Location").openPopup()
        }
        if (window.L) init()
        else { const iv = setInterval(() => { if (window.L) { clearInterval(iv); init() } }, 200); return () => clearInterval(iv) }
        return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
    }, [lat, lng, label])
    if (!lat || !lng) return (
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "16px", textAlign: "center", color: "var(--text-dim)", fontSize: 13, fontWeight: 700, marginTop: 10 }}>
            📍 No map coordinates saved for this property
        </div>
    )
    return (
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1.5px solid #e2e8f0", marginTop: 10 }}>
            <div ref={ref} style={{ height: 200 }} />
            <div style={{ background: "rgba(255,255,255,0.01)", padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 700 }}>📍 {lat.toFixed(5)}, {lng.toFixed(5)}</span>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", textDecoration: "none", padding: "4px 10px", background: "#eff6ff", borderRadius: 6 }}>
                    🗺️ Get Directions
                </a>
            </div>
        </div>
    )
}

// ── Property Detail Modal ─────────────────────────────────────────────────────
function PropertyDetailModal({ p, onClose, onEdit, onDelete, deleting }) {
    if (!p) return null
    const badge = statusBadge(p.status)
    const img = getImg(p)
    const row = (label, value, color) => {
        if (!value && value !== 0) return null
        return (
            <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: color || "#1e293b", lineHeight: 1.5 }}>{value}</div>
            </div>
        )
    }
    let amenitiesDisplay = null
    if (p.amenitiesJson) {
        try {
            const obj = JSON.parse(p.amenitiesJson)
            const active = Object.entries(obj).filter(([, v]) => v).map(([k]) => k)
            if (active.length > 0) amenitiesDisplay = active.map(k => k.replace(/([A-Z])/g, " $1").trim()).join(" • ")
        } catch { }
    }
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 16 }} onClick={onClose}>
            <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px 0" }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#0f172a" }}>{p.title}</h2>
                        {p.propertyType && <span style={{ fontSize: 12, fontWeight: 700, color: PRIMARY, background: "#eef2ff", padding: "3px 10px", borderRadius: 999, marginTop: 6, display: "inline-block" }}>{p.propertyType} • {p.category}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, background: badge.bg, color: badge.fg }}>{p.status}</span>
                        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.02)", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16, fontWeight: 700, color: "#475569" }}>✕</button>
                    </div>
                </div>
                <div style={{ height: 220, background: "var(--glass-border)", margin: "16px 24px", borderRadius: 12, overflow: "hidden" }}>
                    {img ? <img src={img} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none" }} />
                        : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontWeight: 800 }}>No Image</div>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: "0 24px" }}>
                    {row("💰 Starting Bid", formatINR(p.startingPrice), PRIMARY)}
                    {row("📍 City", p.city || p.location)}
                    {row("🏛️ State", p.state)}
                    {row("🛏️ Bedrooms", p.bedrooms ? `${p.bedrooms} BHK` : null)}
                    {row("📐 Total Area", p.totalArea ? `${p.totalArea} sq ft` : null)}
                    {p.description && (
                        <div style={{ gridColumn: "1 / -1" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>📝 Description</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", lineHeight: 1.6 }}>{p.description}</div>
                        </div>
                    )}
                    {amenitiesDisplay && (
                        <div style={{ gridColumn: "1 / -1" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>✨ Amenities</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {amenitiesDisplay.split(" • ").map(a => (
                                    <span key={a} style={{ background: "#eff6ff", color: PRIMARY, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>✓ {a}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    <div style={{ gridColumn: "1 / -1" }}>
                        <MiniMap lat={p.latitude} lng={p.longitude} label={p.address || p.title} />
                    </div>
                    {p.status === "REJECTED" && p.rejectionReason && (
                        <div style={{ gridColumn: "1 / -1", background: "#fef2f2", borderRadius: 10, padding: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>❌ Rejection Reason</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>{p.rejectionReason}</div>
                        </div>
                    )}
                </div>
                <div style={{ padding: "16px 24px 24px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid #f1f5f9", marginTop: 16 }}>
                    {(p.status === "REJECTED" || p.status === "PENDING") && onEdit && (
                        <button onClick={() => { onClose(); onEdit(p) }}
                            style={{ padding: "10px 20px", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: 9, cursor: "pointer", fontSize: 14, fontWeight: 800 }}>
                            {p.status === "PENDING" ? "✏️ Edit Property" : "✏️ Edit & Resubmit"}
                        </button>
                    )}
                    {onDelete && (
                        <button type="button" disabled={deleting} onClick={() => onDelete(p)}
                            style={{ padding: "10px 20px", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 9, cursor: deleting ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 800, opacity: deleting ? 0.65 : 1 }}>
                            {deleting ? "⏳ Deleting…" : "🗑️ Delete property"}
                        </button>
                    )}
                    <button onClick={onClose} style={{ padding: "10px 20px", background: "rgba(255,255,255,0.02)", color: "#475569", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>Close</button>
                </div>
            </div>
        </div>
    )
}

// ── Cancel Auction Confirm Modal ──────────────────────────────────────────────
function CancelAuctionModal({ auction, onConfirm, onClose, cancelling }) {
    if (!auction) return null
    const { start } = auctionTimes(auction)
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: 16 }}
            onClick={onClose}>
            <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
                onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: 48, textAlign: "center", marginBottom: 12 }}>🚫</div>
                <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#111827", textAlign: "center" }}>Cancel Auction?</h3>
                <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.6, textAlign: "center", margin: "0 0 20px" }}>
                    You are about to cancel the auction for <strong>{auctionPropertyTitle(auction)}</strong>.
                    {start && <><br /><span style={{ color: "#0ea5e9" }}>Scheduled start: {formatDate(start)}</span></>}
                    <br /><br />
                    <span style={{ color: "#dc2626", fontWeight: 700 }}>This action cannot be undone.</span> All applicants will lose their application for this auction.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <button onClick={onConfirm} disabled={cancelling}
                        style={{ padding: "11px 28px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 10, cursor: cancelling ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 800, opacity: cancelling ? 0.7 : 1 }}>
                        {cancelling ? "⏳ Cancelling…" : "Yes, Cancel Auction"}
                    </button>
                    <button onClick={onClose}
                        style={{ padding: "11px 24px", background: "#f1f5f9", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#374151" }}>
                        Keep Auction
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AuctioneerDashboard() {
    const navigate = useNavigate()
    const location = useLocation()
    const name = sessionStorage.getItem("name") || localStorage.getItem("name") || "Auctioneer"
    const [activeTab, setActiveTab] = useState("dashboard")
    const [selectedProp, setSelectedProp] = useState(null)
    const [editingProp, setEditingProp] = useState(null)
    const [myProperties, setMyProperties] = useState([])
    const [loadingMyProps, setLoadingMyProps] = useState(false)
    const [myPropsError, setMyPropsError] = useState("")

    const [editTitle, setEditTitle] = useState("")
    const [editLocation, setEditLocation] = useState("")
    const [editAddress, setEditAddress] = useState("")
    const [editPrice, setEditPrice] = useState("")
    const [editDescription, setEditDescription] = useState("")
    const [editImageFile, setEditImageFile] = useState(null)
    const [editDocFile, setEditDocFile] = useState(null)
    const [editSubmitting, setEditSubmitting] = useState(false)
    const [editError, setEditError] = useState("")
    const [editSuccess, setEditSuccess] = useState("")
    const [saveSuccessToast, setSaveSuccessToast] = useState("")
    const [deletingId, setDeletingId] = useState(null)
    const [deletionReqId, setDeletionReqId] = useState(null)
    const [deletionReason, setDeletionReason] = useState("")
    const [deletionProof, setDeletionProof] = useState(null)
    const [deletionError, setDeletionError] = useState("")
    const [deletionSuccess, setDeletionSuccess] = useState("")
    const [deletionLoading, setDeletionLoading] = useState(false)

    const [myAuctions, setMyAuctions] = useState([])
    const [loadingAuctions, setLoadingAuctions] = useState(false)
    const [auctionsError, setAuctionsError] = useState("")

    // ── Cancel auction state ──────────────────────────────────────────────
    const [cancelTarget, setCancelTarget] = useState(null)   // auction to cancel
    const [cancelling, setCancelling] = useState(false)
    const [cancelToast, setCancelToast] = useState("")

    const stats = useMemo(() => {
        const live = myAuctions.filter(a => !isAuctionCompleted(a) && upcomingPhase(a).label === "Live").length
        const scheduled = myAuctions.filter(a => !isAuctionCompleted(a) && upcomingPhase(a).label === "Scheduled").length
        const completed = myAuctions.filter(isAuctionCompleted).length
        return {
            total: myProperties.length,
            pending: myProperties.filter(p => p.status === "PENDING").length,
            approved: myProperties.filter(p => p.status === "APPROVED").length,
            rejected: myProperties.filter(p => p.status === "REJECTED").length,
            live, scheduled, completed
        }
    }, [myProperties, myAuctions])

    const { upcomingAuctions, completedAuctions } = useMemo(() => {
        const upcoming = [], completed = []
        for (const a of myAuctions) {
            if (isAuctionCompleted(a)) completed.push(a)
            else upcoming.push(a)
        }
        const tStart = (x) => auctionTimes(x).start?.getTime() ?? 0
        const tEnd = (x) => auctionTimes(x).end?.getTime() ?? 0
        upcoming.sort((x, y) => tStart(x) - tStart(y))
        completed.sort((x, y) => tEnd(y) - tEnd(x))
        return { upcomingAuctions: upcoming, completedAuctions: completed }
    }, [myAuctions])

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

    const fetchMyProperties = async () => {
        setLoadingMyProps(true); setMyPropsError("")
        try {
            const res = await getMyProperties()
            setMyProperties(Array.isArray(res.data) ? res.data : [])
        } catch (err) {
            setMyPropsError(err?.response?.data?.message || err?.message || "Failed to load.")
            setMyProperties([])
        } finally { setLoadingMyProps(false) }
    }
    useEffect(() => { fetchMyProperties() }, [])

    const fetchMyAuctions = useCallback(async () => {
        setLoadingAuctions(true); setAuctionsError("")
        try {
            const res = await getMyAuctions()
            const raw = res.data
            const list = Array.isArray(raw) ? raw : Array.isArray(raw?.content) ? raw.content : Array.isArray(raw?.auctions) ? raw.auctions : []
            setMyAuctions(list)
        } catch (err) {
            setAuctionsError(err?.response?.data?.message || err?.message || "Failed to load auctions.")
            setMyAuctions([])
        } finally { setLoadingAuctions(false) }
    }, [])
    useEffect(() => { fetchMyAuctions() }, [fetchMyAuctions])

    useEffect(() => {
        if (location.state?.tab === "auctions") setActiveTab("auctions")
        if (location.state?.tab === "my") setActiveTab("my")
        if (location.state?.propertySavedMessage) {
            setSaveSuccessToast(location.state.propertySavedMessage)
            setTimeout(() => setSaveSuccessToast(""), 3500)
            navigate(location.pathname, { replace: true, state: {} })
        }
    }, [location.state])

    const handleLogout = async () => {
        try { await logout() } catch { } finally {
            localStorage.clear()
            sessionStorage.clear()
            navigate("/login")
        }
    }

    const openEditModal = (p) => {
        setEditingProp(p); setEditTitle(p.title || ""); setEditLocation(p.location || "")
        setEditAddress(p.address || ""); setEditPrice(String(p.startingPrice || ""))
        setEditDescription(p.description || ""); setEditImageFile(null); setEditDocFile(null)
        setEditError(""); setEditSuccess("")
    }

    const handleResubmit = async (e) => {
        e.preventDefault(); setEditError(""); setEditSuccess("")
        const priceNum = Number(editPrice)
        if (!editTitle.trim() || !editLocation.trim() || !editDescription.trim()) { setEditError("Please fill all required fields."); return }
        if (isNaN(priceNum) || priceNum <= 0) { setEditError("Please enter a valid starting price."); return }
        setEditSubmitting(true)
        try {
            const fd = new FormData()
            fd.append("data", JSON.stringify({
                title: editTitle.trim(), location: editLocation.trim(),
                address: editAddress.trim() || editLocation.trim(),
                startingPrice: priceNum, description: editDescription.trim(),
                latitude: editingProp.latitude || null, longitude: editingProp.longitude || null,
            }))
            if (editImageFile) fd.append("image", editImageFile)
            if (editDocFile) fd.append("document", editDocFile)
            await resubmitProperty(editingProp.id, fd)
            const successMsg = editingProp?.status === "PENDING" ? "✅ Property updated successfully." : "✅ Resubmitted! Now pending admin approval."
            setEditSuccess(successMsg)
            await fetchMyProperties()
            setTimeout(() => {
                setEditingProp(null); setEditSuccess(""); setActiveTab("my")
                navigate("/auctioneer/dashboard", { state: { tab: "my", propertySavedMessage: successMsg } })
            }, 800)
        } catch (err) {
            setEditError(err?.response?.data?.message || err?.message || "Resubmit failed.")
        }
        setEditSubmitting(false)
    }

    const handleDeleteProperty = async (p) => {
        if (!p?.id) return
        if (p.status === "APPROVED" || p.status === "DELETION_REQUESTED") {
            if (p.status === "DELETION_REQUESTED") {
                setMyPropsError("⏳ Deletion already pending admin approval.")
                setTimeout(() => setMyPropsError(""), 3000)
                return
            }
            setDeletionReqId(p.id); setDeletionReason(""); setDeletionProof(null); setDeletionError(""); return
        }
        if (!window.confirm(`Delete "${p.title || "this property"}"? This cannot be undone.`)) return
        setMyPropsError(""); setDeletingId(p.id)
        try {
            await deleteMyProperty(p.id)
            setMyProperties(prev => prev.filter(x => x.id !== p.id))
            setSelectedProp(cur => (cur?.id === p.id ? null : cur))
            await fetchMyProperties()
        } catch (err) {
            setMyPropsError(err?.response?.data?.message || err?.message || "Could not delete property.")
        } finally { setDeletingId(null) }
    }

    const handleRequestDeletion = async () => {
        if (!deletionReason.trim()) { setDeletionError("Please provide a reason."); return }
        setDeletionError(""); setDeletionLoading(true)
        try {
            await requestPropertyDeletion(deletionReqId, deletionReason.trim(), deletionProof)
            setDeletionSuccess("✅ Deletion request sent to Admin for approval.")
            setDeletionReqId(null); setDeletionReason(""); setDeletionProof(null)
            await fetchMyProperties()
            setTimeout(() => setDeletionSuccess(""), 4000)
        } catch (err) {
            setDeletionError(err?.response?.data?.message || err?.message || "Request failed.")
        }
        setDeletionLoading(false)
    }

    // ── Cancel auction handler ────────────────────────────────────────────
    const handleCancelAuction = async () => {
        if (!cancelTarget?.id) return
        setCancelling(true)
        try {
            await cancelAuction(cancelTarget.id)
            setCancelTarget(null)
            setCancelToast(`✅ Auction for "${auctionPropertyTitle(cancelTarget)}" has been cancelled.`)
            setTimeout(() => setCancelToast(""), 4000)
            await fetchMyAuctions()
        } catch (err) {
            setCancelToast(`❌ ${err?.response?.data || err?.message || "Failed to cancel auction."}`)
            setTimeout(() => setCancelToast(""), 4000)
            setCancelTarget(null)
        } finally { setCancelling(false) }
    }

    const S = {
        card: { background: "var(--dash-card, #fff)", borderRadius: 14, border: "1px solid var(--dash-border, #e2e8f0)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
        btn: (v) => {
            const base = { borderRadius: 8, border: "none", cursor: "pointer", padding: "9px 16px", fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--dash-font)" }
            if (v === "ghost") return { ...base, background: "var(--dash-accent-light)", color: "var(--dash-accent)" }
            if (v === "warn") return { ...base, background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }
            if (v === "danger") return { ...base, background: "#fff5f5", color: "#dc2626", border: "1px solid #fee2e2" }
            return { ...base, background: "var(--dash-accent)", color: "white" }
        },
    }

    const renderDashboard = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="dc-welcome">
                <div>
                    <div className="dc-welcome-title">Hello, {name} 👋</div>
                    <div className="dc-welcome-sub">Your properties and auctions are performing well. Here is a summary of your activity.</div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={() => navigate("/auctioneer/add-property")} className="dc-btn dc-btn-primary" style={{ background: "white", color: "var(--dash-accent)" }}>➕ Add Property</button>
                    <button onClick={fetchMyProperties} className="dc-btn" style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }} disabled={loadingMyProps}>
                        {loadingMyProps ? <Spinner size={16} color="white" /> : "↻ Refresh"}
                    </button>
                </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
                {[["🏠", "Total Properties", stats.total, "#6366f1", "rgba(99,102,241,0.08)"],
                ["⏳", "Under Review", stats.pending, "#f59e0b", "rgba(245,158,11,0.08)"],
                ["✅", "Approved", stats.approved, "#10b981", "rgba(16,185,129,0.08)"],
                ["❌", "Rejected", stats.rejected, "#ef4444", "rgba(239,68,68,0.08)"],
                ].map(([icon, label, val, fg, bg]) => (
                    <div key={label} className="dc-stat-card" style={{ borderTop: `3px solid ${fg}` }}>
                        <div className="dc-stat-icon" style={{ background: bg, color: fg }}>{icon}</div>
                        <div className="dc-stat-label" style={{ color: fg }}>{label}</div>
                        <div className="dc-stat-value">{loadingMyProps ? <Spinner size={22} color={fg} /> : val}</div>
                    </div>
                ))}
            </div>
            <div className="dc-card">
                <div className="dc-section-title">🔨 Auction Overview</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                    {[["🔥", "Live Now", stats.live, "#10b981", "rgba(16,185,129,0.08)"],
                    ["📅", "Upcoming", stats.scheduled, "var(--dash-accent)", "rgba(14,165,233,0.08)"],
                    ["✅", "Completed", stats.completed, "#64748b", "rgba(100,116,139,0.08)"],
                    ].map(([icon, label, val, fg, bg]) => (
                        <div key={label} style={{ background: bg, borderRadius: 10, padding: "20px 24px", border: `1px solid ${fg}33`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: 11.5, fontWeight: 600, color: fg, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--dash-text)", marginTop: 6 }}>{loadingAuctions ? <Spinner size={22} color={fg} /> : val}</div>
                            </div>
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${fg}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
                <div className="dc-card">
                    <div className="dc-section-title">🚀 Quick Actions</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <button onClick={() => navigate("/auctioneer/add-property")} className="dc-action-tile"><span className="dc-tile-icon">🏠</span><span>List New Property</span></button>
                        <button onClick={() => navigate("/auctioneer/create-auction")} className="dc-action-tile"><span className="dc-tile-icon">🔨</span><span>Schedule Auction</span></button>
                    </div>
                </div>
                <div className="dc-card" style={{ background: "linear-gradient(135deg, var(--dash-accent) 0%, var(--dash-accent-teal) 100%)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", border: "none" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>📈</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Ready to sell?</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4, lineHeight: 1.5 }}>Monitor live auctions and interact with bidders in real-time.</div>
                    <button onClick={() => setActiveTab("auctions")} className="dc-btn dc-btn-primary" style={{ background: "white", color: "var(--dash-accent)", marginTop: 14 }}>View All Auctions</button>
                </div>
            </div>
        </div>
    )

    const renderMyProperties = () => (
        <div>
            <div className="dc-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                    <div className="dc-section-title" style={{ marginBottom: 4 }}>My Properties</div>
                    <div style={{ fontSize: 13, color: "var(--dash-muted)" }}>Click any card to view full details &amp; map.</div>
                </div>
                <button onClick={fetchMyProperties} className="dc-btn dc-btn-ghost dc-btn-sm" disabled={loadingMyProps}>
                    {loadingMyProps ? <><Spinner size={14} color="var(--dash-accent)" /> Loading</> : "↻ Refresh"}
                </button>
            </div>
            {myPropsError && <div className="dc-banner dc-banner-error" style={{ marginBottom: 12 }}>{myPropsError}</div>}
            {loadingMyProps ? (
                <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--dash-muted)", fontSize: 14, padding: 16 }}>
                    <Spinner size={20} color="var(--dash-accent)" /> Loading properties...
                </div>
            ) : myProperties.length === 0 ? (
                <div className="dc-card" style={{ color: "var(--dash-muted)", textAlign: "center", padding: 40 }}>No properties yet. Add your first property!</div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
                    {myProperties.map(p => {
                        const badge = statusBadge(p.status)
                        const img = getImg(p)
                        const badgeClass = p.status === "APPROVED" ? "dc-badge dc-badge-approved" : p.status === "REJECTED" ? "dc-badge dc-badge-rejected" : "dc-badge dc-badge-pending"
                        return (
                            <div key={p.id} className="dc-prop-card" onClick={() => setSelectedProp(p)}>
                                <div style={{ height: 160, background: "#f1f5f9", position: "relative" }}>
                                    {img ? <img src={img} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { e.target.style.display = "none" }} />
                                        : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dash-muted)", fontWeight: 500, fontSize: 13 }}>No Image</div>}
                                    <span className={badgeClass} style={{ position: "absolute", top: 10, right: 10 }}>{p.status}</span>
                                </div>
                                <div style={{ padding: 16 }}>
                                    <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--dash-text)" }}>{p.title}</div>
                                    <div style={{ fontSize: 12.5, color: "var(--dash-muted)", marginTop: 6 }}>📍 {p.city || p.location}</div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dash-accent)", marginTop: 6 }}>{formatINR(p.startingPrice)}</div>
                                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                                        {(p.status === "REJECTED" || p.status === "PENDING") && (
                                            <>
                                                {p.rejectionReason && <div style={{ width: "100%", color: "#dc2626", fontWeight: 600, fontSize: 12 }}>❌ {p.rejectionReason}</div>}
                                                <button type="button" onClick={e => { e.stopPropagation(); openEditModal(p) }} className="dc-btn dc-btn-warn dc-btn-sm">
                                                    {p.status === "PENDING" ? "✏️ Edit Property" : "✏️ Edit & Resubmit"}
                                                </button>
                                            </>
                                        )}
                                        <button type="button"
                                            disabled={deletingId === p.id || p.status === "DELETION_REQUESTED"}
                                            onClick={e => { e.stopPropagation(); handleDeleteProperty(p) }}
                                            className="dc-btn dc-btn-danger dc-btn-sm"
                                            style={{ opacity: (deletingId === p.id || p.status === "DELETION_REQUESTED") ? 0.6 : 1 }}>
                                            {deletingId === p.id ? "⏳" : p.status === "DELETION_REQUESTED" ? "⏳ Pending Admin" : p.status === "APPROVED" ? "📋 Request Deletion" : "🗑️ Delete"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )

    // ── Auction card with cancel button ───────────────────────────────────
    const renderAuctionCard = (a, { showPhase }) => {
        const prop = a.property
        const img = prop ? getImg(prop) : null
        const { start, end } = auctionTimes(a)
        const phase = showPhase ? upcomingPhase(a) : null
        const opening = a.startingBid ?? a.startBid
        const inc = a.minIncrement ?? a.minimumIncrement
        const completedBadge = !showPhase
            ? (String(a.status || "").toUpperCase() === "CANCELLED" || String(a.status || "").toUpperCase() === "CANCELED"
                ? { bg: "#fee2e2", fg: "#991b1b", label: "Cancelled" }
                : { bg: "#f1f5f9", fg: "#475569", label: "Completed" })
            : null
        const showCancelBtn = showPhase && canCancelAuction(a)

        return (
            <div key={a.id ?? `a-${a.propertyId}`} style={{ ...S.card, padding: 0, overflow: "hidden" }}>
                <div style={{ height: 120, background: "var(--glass-border)", position: "relative" }}>
                    {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { e.target.style.display = "none" }} />
                        : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontWeight: 800, fontSize: 13 }}>No Image</div>}
                    {phase && (
                        <span style={{ position: "absolute", top: 10, right: 10, padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: phase.bg, color: phase.fg }}>{phase.label}</span>
                    )}
                    {completedBadge && (
                        <span style={{ position: "absolute", top: 10, right: 10, padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: completedBadge.bg, color: completedBadge.fg }}>{completedBadge.label}</span>
                    )}
                </div>
                <div style={{ padding: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text-main)" }}>{auctionPropertyTitle(a)}</div>
                    {prop && (prop.city || prop.location) && (
                        <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 700, marginTop: 4 }}>📍 {prop.city || prop.location}</div>
                    )}
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8, fontWeight: 600 }}>🗓️ {formatDate(start)} → {formatDate(end)}</div>
                    {opening != null && !isNaN(Number(opening)) && (
                        <div style={{ fontSize: 14, fontWeight: 800, color: PRIMARY, marginTop: 8 }}>Opening bid {formatINR(opening)}</div>
                    )}
                    {inc != null && !isNaN(Number(inc)) && (
                        <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>Min. increment {formatINR(inc)}</div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                        {a.id && (
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/auctioneer/auction/${a.id}/applicants`) }}
                                style={{
                                    width: "100%", padding: "9px 0", borderRadius: 8, border: "none",
                                    background: "var(--dash-accent-light, #e0f2fe)", color: "var(--dash-accent, #0ea5e9)",
                                    cursor: "pointer", fontSize: 13, fontWeight: 700,
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                                }}>
                                👥 Review Applicants
                            </button>
                        )}
                        {/* Enter Live Room — watch-only for auctioneer */}
                        {String(a.status || "").toUpperCase() === "LIVE" && a.id && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    navigate(`/auctioneer/auction/${a.id}/live`)
                                }}
                                style={{
                                    width: "100%", padding: "9px 0", borderRadius: 8,
                                    border: "none",
                                    background: "linear-gradient(135deg, #1b5e20, #2e7d32)",
                                    color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700,
                                    display: "flex", alignItems: "center",
                                    justifyContent: "center", gap: 6,
                                    boxShadow: "0 0 10px rgba(76,175,80,0.35)",
                                    animation: "pulse 2s infinite"
                                }}>
                                🔴 Watch Live Room
                            </button>
                        )}
                        {/* Cancel button — only shown before start time */}
                        {showCancelBtn && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setCancelTarget(a) }}
                                style={{
                                    width: "100%", padding: "9px 0", borderRadius: 8,
                                    border: "1px solid #fecaca",
                                    background: "#fff5f5", color: "#dc2626",
                                    cursor: "pointer", fontSize: 13, fontWeight: 700,
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                                }}>
                                🚫 Cancel Auction
                            </button>
                        )}
                    </div>

                    {/* Winner panel — shown on completed auction cards */}
                    {!showPhase && (() => {
                        const isCancelled = String(a.status || "").toUpperCase() === "CANCELLED" ||
                                            String(a.status || "").toUpperCase() === "CANCELED"
                        if (isCancelled) return null
                        return (
                            <div style={{
                                marginTop: 12,
                                background: a.winner ? "#f0fdf4" : "#f8fafc",
                                border: `1px solid ${a.winner ? "#bbf7d0" : "#e2e8f0"}`,
                                borderRadius: 10, padding: "12px 14px"
                            }}>
                                <div style={{
                                    fontSize: 11, fontWeight: 800, color: "var(--dash-muted)",
                                    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6
                                }}>
                                    {a.winner ? "🏆 Winning Result" : "🏁 Auction Closed"}
                                </div>
                                {a.winner ? (
                                    <>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: "#166534" }}>
                                            {a.winner.name}
                                        </div>
                                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                                            {a.winner.email}
                                        </div>
                                        <div style={{
                                            fontSize: 16, fontWeight: 900, color: "#16a34a", marginTop: 6
                                        }}>
                                            {formatINR(a.currentBid)}
                                        </div>
                                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                            Final winning bid
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
                                        No bids were placed on this auction.
                                    </div>
                                )}
                            </div>
                        )
                    })()}
                </div>
            </div>
        )
    }

    const renderMyAuctions = () => (
        <div>
            <div className="dc-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <div>
                    <div className="dc-section-title" style={{ marginBottom: 4 }}>My Auctions</div>
                    <div style={{ fontSize: 13, color: "var(--dash-muted)" }}>You can cancel upcoming auctions before their start time.</div>
                </div>
                <button type="button" onClick={fetchMyAuctions} className="dc-btn dc-btn-ghost dc-btn-sm" disabled={loadingAuctions}>
                    {loadingAuctions ? <><Spinner size={14} color="var(--dash-accent)" /> Loading</> : "↻ Refresh"}
                </button>
            </div>
            {auctionsError && <div className="dc-banner dc-banner-error" style={{ marginBottom: 12 }}>{auctionsError}</div>}
            {loadingAuctions ? (
                <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--dash-muted)", fontSize: 14, padding: 16 }}>
                    <Spinner size={20} color="var(--dash-accent)" /> Loading auctions...
                </div>
            ) : (
                <>
                    <div className="dc-card" style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                            <div className="dc-section-title" style={{ marginBottom: 0 }}>🔜 Upcoming</div>
                            <span className="dc-badge dc-badge-blue">{upcomingAuctions.length}</span>
                        </div>
                        {upcomingAuctions.length === 0 ? (
                            <div style={{ color: "var(--dash-muted)", fontSize: 14 }}>No upcoming auctions. Create one from an approved property.</div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
                                {upcomingAuctions.map(a => renderAuctionCard(a, { showPhase: true }))}
                            </div>
                        )}
                    </div>
                    <div className="dc-card">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                            <div className="dc-section-title" style={{ marginBottom: 0 }}>✅ Completed / Cancelled</div>
                            <span className="dc-badge dc-badge-completed">{completedAuctions.length}</span>
                        </div>
                        {completedAuctions.length === 0 ? (
                            <div style={{ color: "var(--dash-muted)", fontSize: 14 }}>No completed auctions yet.</div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
                                {completedAuctions.map(a => renderAuctionCard(a, { showPhase: false }))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )

    const navItems = [
        { id: "dashboard", icon: "📊", label: "Dashboard" },
        { id: "auctions", icon: "🔨", label: "My Auctions", badge: myAuctions.length, badgeMuted: myAuctions.length === 0 },
        { id: "my", icon: "🏠", label: "My Properties", badge: stats.total, badgeMuted: stats.total === 0 },
    ]
    const navActions = [
        { id: "add-property", icon: "➕", label: "Add Property", path: "/auctioneer/add-property" },
        { id: "create-auction", icon: "📅", label: "Create Auction", path: "/auctioneer/create-auction" },
    ]
    const pageTitle = activeTab === "dashboard" ? "Auctioneer Dashboard" : activeTab === "auctions" ? "My Auctions" : "My Properties"

    return (
        <DashboardLayout
            navItems={navItems}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            actions={navActions}
            onNavigate={navigate}
            userName={name}
            userRole="Auctioneer"
            onLogout={handleLogout}
            pageTitle={pageTitle}
        >
            {activeTab === "dashboard" && renderDashboard()}
            {activeTab === "auctions" && renderMyAuctions()}
            {activeTab === "my" && renderMyProperties()}

            {selectedProp && (
                <PropertyDetailModal p={selectedProp} onClose={() => setSelectedProp(null)}
                    onEdit={openEditModal} onDelete={handleDeleteProperty} deleting={deletingId === selectedProp.id} />
            )}

            {editingProp && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 16 }}
                    onClick={() => setEditingProp(null)}>
                    <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", padding: 28, fontFamily: "var(--dash-font)" }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--dash-text)" }}>
                                {editingProp?.status === "PENDING" ? "✏️ Edit Property" : "✏️ Edit & Resubmit"}
                            </h3>
                            <button onClick={() => setEditingProp(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>✕</button>
                        </div>
                        {editError && <div className="dc-banner dc-banner-error" style={{ marginBottom: 12 }}>{editError}</div>}
                        {editSuccess && <div className="dc-banner dc-banner-success" style={{ marginBottom: 12 }}>{editSuccess}</div>}
                        <form onSubmit={handleResubmit}>
                            {[["Title *", editTitle, setEditTitle, "text", "e.g. Green Villa"],
                            ["Location *", editLocation, setEditLocation, "text", "e.g. Hyderabad"],
                            ["Address", editAddress, setEditAddress, "text", "Full address"],
                            ["Starting Price *", editPrice, setEditPrice, "number", "e.g. 5000000"]].map(([label, val, setter, type, ph]) => (
                                <div key={label} style={{ marginBottom: 14 }}>
                                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>{label}</label>
                                    <input type={type} value={val} onChange={e => setter(e.target.value)} placeholder={ph}
                                        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "var(--dash-font)" }} />
                                </div>
                            ))}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>Description *</label>
                                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Describe the property..."
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", minHeight: 90, resize: "vertical", fontFamily: "var(--dash-font)" }} />
                            </div>
                            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                                <button type="submit" className="dc-btn dc-btn-primary" disabled={editSubmitting} style={{ opacity: editSubmitting ? 0.7 : 1 }}>
                                    {editSubmitting ? "Submitting..." : editingProp?.status === "PENDING" ? "💾 Save Changes" : "🚀 Resubmit for Approval"}
                                </button>
                                <button type="button" onClick={() => setEditingProp(null)} className="dc-btn dc-btn-outline">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deletionReqId && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: 16 }}
                    onClick={() => setDeletionReqId(null)}>
                    <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111827" }}>📋 Request Property Deletion</h3>
                            <button onClick={() => setDeletionReqId(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>✕</button>
                        </div>
                        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 13, color: "#92400e", fontWeight: 600 }}>
                            ⚠️ Since this property is <strong>APPROVED</strong>, deletion requires Admin approval.
                        </div>
                        {deletionError && <div style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, fontWeight: 700 }}>{deletionError}</div>}
                        <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Reason for Deletion *</label>
                        <textarea value={deletionReason} onChange={e => setDeletionReason(e.target.value)} placeholder="e.g. Property already sold privately..." rows={4}
                            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", marginBottom: 16, fontFamily: "inherit" }} />
                        <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Supporting Proof (optional)</label>
                        <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={e => setDeletionProof(e.target.files[0] || null)}
                            style={{ width: "100%", padding: "10px", border: "1.5px dashed #cbd5e1", borderRadius: 8, fontSize: 13, boxSizing: "border-box", marginBottom: 20, cursor: "pointer" }} />
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={handleRequestDeletion} disabled={deletionLoading}
                                style={{ padding: "11px 24px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 9, cursor: deletionLoading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 800, opacity: deletionLoading ? 0.7 : 1 }}>
                                {deletionLoading ? "⏳ Sending..." : "📤 Submit Request"}
                            </button>
                            <button onClick={() => setDeletionReqId(null)} style={{ padding: "11px 20px", background: "#f1f5f9", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#374151" }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Auction Confirm Modal */}
            <CancelAuctionModal
                auction={cancelTarget}
                onConfirm={handleCancelAuction}
                onClose={() => setCancelTarget(null)}
                cancelling={cancelling}
            />

            {/* Toasts */}
            {cancelToast && (
                <div style={{
                    position: "fixed", bottom: 24, right: 24,
                    background: cancelToast.startsWith("✅") ? "#f0fdf4" : "#fef2f2",
                    color: cancelToast.startsWith("✅") ? "#16a34a" : "#dc2626",
                    border: `1px solid ${cancelToast.startsWith("✅") ? "#bbf7d0" : "#fecaca"}`,
                    padding: "14px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.12)"
                }}>
                    {cancelToast}
                </div>
            )}
            {deletionSuccess && (
                <div style={{ position: "fixed", bottom: 24, right: 24, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", padding: "14px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
                    {deletionSuccess}
                </div>
            )}
            {saveSuccessToast && (
                <div style={{ position: "fixed", bottom: 24, right: 24, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", padding: "14px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
                    {saveSuccessToast}
                </div>
            )}
        </DashboardLayout>
    )
}