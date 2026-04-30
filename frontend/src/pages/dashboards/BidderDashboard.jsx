import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getApprovedProperties, getActiveAuctions, getMyApplications, logout, withdrawApplication } from "../../services/authService"
import DashboardLayout from "../../components/DashboardLayout"
import ApplyModal from "../../components/ApplyModal"

// ── Constants ──────────────────────────────────────────────────────────────────
const BASE = "http://localhost:8081"

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
function getImg(p) {
    const u = p?.imageUrl || p?.imagePath || null
    if (!u) return null
    return u.startsWith("http") ? u : `${BASE}${u}`
}
function getImgList(p) {
    if (p?.imageUrls) {
        const list = p.imageUrls.split(",").map(u => u.trim()).filter(Boolean)
        if (list.length > 0) return list.map(u => u.startsWith("http") ? u : `${BASE}${u}`)
    }
    const s = getImg(p)
    return s ? [s] : []
}
// Returns true if the auction hasn't started yet — bidder can still withdraw
function canWithdraw(auction) {
    if (!auction) return false
    const s = String(auction.status || "").toUpperCase()
    if (s === "CANCELLED" || s === "COMPLETED") return false
    const startRaw = auction.startTime ?? auction.startDate
    if (!startRaw) return true
    return new Date(startRaw).getTime() > Date.now()
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 18, color = "#0ea5e9" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 50 50" style={{ display: "inline-block", verticalAlign: "middle" }}>
            <circle cx="25" cy="25" r="20" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray="90 60">
                <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.9s" repeatCount="indefinite" />
            </circle>
        </svg>
    )
}

// ── Live user location hook ───────────────────────────────────────────────────
function useUserLocation() {
    const [loc, setLoc] = useState(null)
    useEffect(() => {
        if (!navigator.geolocation) return
        navigator.geolocation.getCurrentPosition(
            pos => setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => { }, { enableHighAccuracy: true, timeout: 10000 }
        )
    }, [])
    return loc
}

// ── Mini Map (card preview) ───────────────────────────────────────────────────
function CardMap({ lat, lng }) {
    const ref = useRef(null)
    const mapRef = useRef(null)
    const uid = useRef(`cm_${Math.random().toString(36).slice(2)}`)
    useEffect(() => {
        if (!lat || !lng) return
        const init = () => {
            if (!window.L || !ref.current) return
            if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
            ref.current.id = uid.current
            mapRef.current = window.L.map(ref.current, { zoomControl: false, scrollWheelZoom: false, dragging: false, keyboard: false, attributionControl: false }).setView([lat, lng], 15)
            window.L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {}).addTo(mapRef.current)
            window.L.circleMarker([lat, lng], { radius: 7, color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 1 }).addTo(mapRef.current)
        }
        if (window.L) init()
        else { const iv = setInterval(() => { if (window.L) { clearInterval(iv); init() } }, 200); return () => clearInterval(iv) }
        return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
    }, [lat, lng])
    if (!lat || !lng) return null
    return <div ref={ref} style={{ height: 110, width: "100%", borderTop: "1px solid var(--dash-border)" }} />
}

// ── Full map in modal ─────────────────────────────────────────────────────────
function ModalMap({ lat, lng, label }) {
    const ref = useRef(null)
    const mapRef = useRef(null)
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
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: 16, textAlign: "center", color: "var(--dash-muted)", fontSize: 13, marginTop: 10 }}>
            📍 No map coordinates saved for this property
        </div>
    )
    return (
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1.5px solid var(--dash-border)", marginTop: 10 }}>
            <div ref={ref} style={{ height: 220 }} />
            <div style={{ background: "#f8fafc", padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--dash-border)" }}>
                <span style={{ fontSize: 12, color: "var(--dash-muted)", fontWeight: 600 }}>📍 {lat.toFixed(5)}, {lng.toFixed(5)}</span>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", textDecoration: "none", padding: "4px 10px", background: "#eff6ff", borderRadius: 6 }}>
                    🗺️ Get Directions
                </a>
            </div>
        </div>
    )
}

// ── Property Detail Modal ─────────────────────────────────────────────────────
function PropertyModal({ p, onClose, userLoc, onGoToAuctions, onApplyToAuction, auctions, myApplications }) {
    const [imgIdx, setImgIdx] = useState(0)
    if (!p) return null

    const propAuctions = (auctions || []).filter(
        a => a.property?.id === p.id && (a.status === "SCHEDULED" || a.status === "LIVE" || a.status === "ACTIVE")
    )
    const activeAuction = propAuctions[0] || null
    const myAppForThis = activeAuction
        ? (myApplications || []).find(app => app.auction?.id === activeAuction.id)
        : null
    const appStatus = myAppForThis?.status || null

    const APP_STATUS_COLORS = {
        PENDING: { bg: "#fef9c3", color: "#854d0e", label: "⏳ Pending Review" },
        APPROVED: { bg: "#dcfce7", color: "#166534", label: "✅ Approved to Bid" },
        REJECTED: { bg: "#fee2e2", color: "#991b1b", label: "❌ Application Rejected" },
    }
    const imgs = getImgList(p)
    const curImg = imgs[imgIdx] || null

    let amenitiesDisplay = []
    if (p.amenitiesJson) {
        try { const obj = JSON.parse(p.amenitiesJson); amenitiesDisplay = Object.entries(obj).filter(([, v]) => v).map(([k]) => k.replace(/([A-Z])/g, " $1").trim()) } catch { }
    }

    const row = (label, value, color) => {
        if (value === null || value === undefined || value === "") return null
        return (
            <div key={label} style={{ display: "flex", borderBottom: "1px solid #f1f5f9", padding: "8px 0", alignItems: "flex-start" }}>
                <div style={{ width: "140px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: color || "#1e293b", lineHeight: 1.4, flex: 1 }}>{value}</div>
            </div>
        )
    }
    const sectionTitle = (title) => (
        <div style={{ fontSize: 13, fontWeight: 800, color: "#0ea5e9", textTransform: "uppercase", letterSpacing: 1, marginTop: 24, marginBottom: 12, borderBottom: "2px solid #0ea5e9", display: "inline-block" }}>{title}</div>
    )
    const gmapsUrl = userLoc && p.latitude && p.longitude
        ? `https://www.google.com/maps/dir/${userLoc.lat},${userLoc.lng}/${p.latitude},${p.longitude}`
        : p.latitude && p.longitude ? `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}` : null

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 16 }} onClick={onClose}>
            <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 800, maxHeight: "93vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px 0" }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{p.title}</h2>
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            {p.propertyType && <span style={{ fontSize: 11, fontWeight: 700, color: "#0ea5e9", background: "#e0f2fe", padding: "4px 12px", borderRadius: 999 }}>{p.propertyType}</span>}
                            {p.category && <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "4px 12px", borderRadius: 999 }}>{p.category}</span>}
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999, background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>✅ APPROVED</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: 18, fontWeight: 900, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>

                {imgs.length > 0 && (
                    <div style={{ margin: "20px 24px 0" }}>
                        <div style={{ height: 320, background: "#f8fafc", borderRadius: 16, overflow: "hidden", position: "relative", border: "1px solid #e2e8f0" }}>
                            {curImg ? <img src={curImg} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontWeight: 700 }}>No Image Available</div>}
                            {imgs.length > 1 && (
                                <>
                                    <button onClick={() => setImgIdx(i => (i - 1 + imgs.length) % imgs.length)} style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.9)", color: "#0f172a", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", fontSize: 24 }}>‹</button>
                                    <button onClick={() => setImgIdx(i => (i + 1) % imgs.length)} style={{ position: "absolute", right: 15, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.9)", color: "#0f172a", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", fontSize: 24 }}>›</button>
                                    <div style={{ position: "absolute", bottom: 15, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
                                        {imgs.map((_, i) => <div key={i} onClick={() => setImgIdx(i)} style={{ width: 8, height: 8, borderRadius: "50%", background: i === imgIdx ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer" }} />)}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <div style={{ padding: "0 24px 40px" }}>
                    {sectionTitle("📝 Description")}
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#334155", lineHeight: 1.6, background: "#f8fafc", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>{p.description || "No description provided."}</div>
                    {sectionTitle("💰 Pricing")}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 40px" }}>
                        {row("Starting Bid", formatINR(p.startingPrice), "#0ea5e9")}
                        {row("Expected Price", p.expectedPrice ? formatINR(p.expectedPrice) : "Not Specified")}
                    </div>
                    {sectionTitle("🏠 Specifications")}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 40px" }}>
                        {row("Bedrooms", p.bedrooms ? `${p.bedrooms} BHK` : "N/A")}
                        {row("Bathrooms", p.bathrooms || "N/A")}
                        {row("Total Area", p.totalArea ? `${p.totalArea} sq ft` : "N/A")}
                        {row("Built-up Area", p.builtUpArea ? `${p.builtUpArea} sq ft` : "N/A")}
                        {row("Parking", p.parking || "N/A")}
                        {row("Furnishing", p.furnishing || "N/A")}
                    </div>
                    {sectionTitle("📍 Location")}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 40px" }}>
                        {row("City / Location", p.city || p.location)}
                        {row("State", p.state)}
                        {row("Pincode", p.pincode)}
                    </div>
                    {amenitiesDisplay.length > 0 && (
                        <>
                            {sectionTitle("✨ Amenities")}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, background: "#f8fafc", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                                {amenitiesDisplay.map(a => <span key={a} style={{ background: "#fff", color: "#0ea5e9", padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "1px solid #e2e8f0" }}>✓ {a}</span>)}
                            </div>
                        </>
                    )}
                    {sectionTitle("🗺️ Map & Navigation")}
                    <ModalMap lat={p.latitude} lng={p.longitude} label={p.address || p.title} />
                    {gmapsUrl && (
                        <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
                            <a href={gmapsUrl} target="_blank" rel="noreferrer" style={{ padding: "12px 24px", background: "#0ea5e9", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                                🗺️ {userLoc ? "Navigate from My Location" : "Open in Google Maps"}
                            </a>
                        </div>
                    )}
                </div>

                <div style={{ padding: "20px 24px", display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap", borderTop: "1px solid #f1f5f9", background: "#f8fafc", borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
                    {activeAuction && (
                        appStatus ? (
                            <span style={{ padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: APP_STATUS_COLORS[appStatus]?.bg || "#f1f5f9", color: APP_STATUS_COLORS[appStatus]?.color || "#475569", display: "inline-flex", alignItems: "center" }}>
                                {APP_STATUS_COLORS[appStatus]?.label || appStatus}
                            </span>
                        ) : (
                            <button onClick={() => { onClose(); onApplyToAuction(activeAuction) }}
                                style={{ padding: "12px 24px", background: "#10b981", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                                🔨 Apply for Auction
                            </button>
                        )
                    )}
                    <button onClick={() => { onClose(); onGoToAuctions(p.id) }}
                        style={{ padding: "12px 24px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                        🏛️ View Auctions
                    </button>
                    <button onClick={onClose} style={{ padding: "12px 24px", background: "#fff", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>Close</button>
                </div>
            </div>
        </div>
    )
}

// ── Application Status Colors ─────────────────────────────────────────────────
const APP_STATUS = {
    PENDING: { bg: "#fef9c3", color: "#854d0e", label: "⏳ Pending Review" },
    APPROVED: { bg: "#dcfce7", color: "#166534", label: "✅ Approved to Bid" },
    REJECTED: { bg: "#fee2e2", color: "#991b1b", label: "❌ Rejected" },
}

// ── Small reusable components ─────────────────────────────────────────────────
function Chip({ label, onRemove }) {
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--dash-accent-light)", color: "var(--dash-accent)", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
            {label}
            <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dash-accent)", fontSize: 13, lineHeight: 1, padding: 0, fontWeight: 900 }}>×</button>
        </span>
    )
}
function SpecRow({ icon, label, value }) {
    if (!value && value !== 0) return null
    return (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 5, minWidth: 0 }}>
            <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{icon}</span>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: 0.4, lineHeight: 1 }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dash-text)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
            </div>
        </div>
    )
}

// ── Withdraw Confirm Modal ────────────────────────────────────────────────────
function WithdrawModal({ auction, onConfirm, onClose, withdrawing }) {
    if (!auction) return null
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: 16 }}
            onClick={onClose}>
            <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 420, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
                onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: 48, textAlign: "center", marginBottom: 12 }}>↩️</div>
                <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#111827", textAlign: "center" }}>Withdraw Application?</h3>
                <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.6, textAlign: "center", margin: "0 0 24px" }}>
                    You are about to withdraw your application for <strong>{auction.property?.title || "this auction"}</strong>.
                    <br /><br />
                    You can re-apply later as long as the auction hasn't started yet.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <button onClick={onConfirm} disabled={withdrawing}
                        style={{ padding: "11px 28px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 10, cursor: withdrawing ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 800, opacity: withdrawing ? 0.7 : 1 }}>
                        {withdrawing ? "⏳ Withdrawing…" : "Yes, Withdraw"}
                    </button>
                    <button onClick={onClose}
                        style={{ padding: "11px 24px", background: "#f1f5f9", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#374151" }}>
                        Keep Application
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Main Bidder Dashboard ─────────────────────────────────────────────────────
export default function BidderDashboard() {
    const navigate = useNavigate()
    const [applyingToAuction, setApplyingToAuction] = useState(null)
    const name = sessionStorage.getItem("name") || localStorage.getItem("name") || "Bidder"
    const userLoc = useUserLocation()

    const [activeTab, setActiveTab] = useState("dashboard")
    const [selectedProp, setSelectedProp] = useState(null)
    const [properties, setProperties] = useState([])
    const [loadingProps, setLoadingProps] = useState(false)
    const [propsError, setPropsError] = useState("")
    const [showMapCards, setShowMapCards] = useState(false)

    const [auctions, setAuctions] = useState([])
    const [myApplications, setMyApplications] = useState([])
    const [loadingAuctions, setLoadingAuctions] = useState(false)
    const [auctionsError, setAuctionsError] = useState("")
    const [auctionPropertyFilter, setAuctionPropertyFilter] = useState(null)

    // ── Withdraw state ────────────────────────────────────────────────────
    const [withdrawTarget, setWithdrawTarget] = useState(null) // { auction, applicationId }
    const [withdrawing, setWithdrawing] = useState(false)
    const [withdrawToast, setWithdrawToast] = useState("")

    // ── Filter state ──────────────────────────────────────────────────────
    const [search, setSearch] = useState("")
    const [filterType, setFilterType] = useState("")
    const [filterCity, setFilterCity] = useState("")
    const [filterState, setFilterState] = useState("")
    const [filterFurnish, setFilterFurnish] = useState("")
    const [filterMinArea, setFilterMinArea] = useState("")
    const [filterMaxArea, setFilterMaxArea] = useState("")
    const [filterMinPrice, setFilterMinPrice] = useState("")
    const [filterMaxPrice, setFilterMaxPrice] = useState("")
    const [filterBedrooms, setFilterBedrooms] = useState("")
    const [showFilters, setShowFilters] = useState(false)
    const [sortBy, setSortBy] = useState("default")

    const cityOptions = useMemo(() => [...new Set(properties.map(p => p.city || p.location).filter(Boolean))].sort(), [properties])
    const stateOptions = useMemo(() => [...new Set(properties.map(p => p.state).filter(Boolean))].sort(), [properties])
    const approvedCount = useMemo(() => properties.length, [properties])
    const activeFilters = [filterType, filterCity, filterState, filterFurnish, filterBedrooms,
        filterMinArea, filterMaxArea, filterMinPrice, filterMaxPrice].filter(Boolean).length

    const filtered = useMemo(() => {
        let list = [...properties]
        const q = search.trim().toLowerCase()
        if (q) list = list.filter(p =>
            p.title?.toLowerCase().includes(q) || (p.city || p.location)?.toLowerCase().includes(q) ||
            p.state?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) ||
            p.propertyType?.toLowerCase().includes(q) || String(p.pincode || "").includes(q)
        )
        if (filterType) list = list.filter(p => p.propertyType === filterType)
        if (filterCity) list = list.filter(p => (p.city || p.location) === filterCity)
        if (filterState) list = list.filter(p => p.state === filterState)
        if (filterFurnish) list = list.filter(p => p.furnishing === filterFurnish)
        if (filterBedrooms) list = list.filter(p => String(p.bedrooms) === filterBedrooms)
        if (filterMinArea) list = list.filter(p => Number(p.totalArea || 0) >= Number(filterMinArea))
        if (filterMaxArea) list = list.filter(p => Number(p.totalArea || Infinity) <= Number(filterMaxArea))
        if (filterMinPrice) list = list.filter(p => Number(p.startingPrice || 0) >= Number(filterMinPrice))
        if (filterMaxPrice) list = list.filter(p => Number(p.startingPrice || Infinity) <= Number(filterMaxPrice))
        if (sortBy === "price_asc") list.sort((a, b) => Number(a.startingPrice) - Number(b.startingPrice))
        if (sortBy === "price_desc") list.sort((a, b) => Number(b.startingPrice) - Number(a.startingPrice))
        if (sortBy === "area_asc") list.sort((a, b) => Number(a.totalArea || 0) - Number(b.totalArea || 0))
        if (sortBy === "area_desc") list.sort((a, b) => Number(b.totalArea || 0) - Number(a.totalArea || 0))
        return list
    }, [properties, search, filterType, filterCity, filterState, filterFurnish, filterBedrooms,
        filterMinArea, filterMaxArea, filterMinPrice, filterMaxPrice, sortBy])

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

    const fetchApproved = async () => {
        setLoadingProps(true); setPropsError("")
        try { const r = await getApprovedProperties(); setProperties(Array.isArray(r.data) ? r.data : []) }
        catch (e) { setPropsError(e?.response?.data?.message || e?.message || "Failed to load properties."); setProperties([]) }
        finally { setLoadingProps(false) }
    }

    const fetchAuctions = async () => {
        setLoadingAuctions(true); setAuctionsError("")
        try {
            const auctRes = await getActiveAuctions()
            setAuctions(Array.isArray(auctRes.data) ? auctRes.data : [])
        } catch (e) {
            setAuctionsError(e?.response?.data?.message || "Failed to load auctions.")
        }
        try {
            const appRes = await getMyApplications()
            setMyApplications(Array.isArray(appRes.data) ? appRes.data : [])
        } catch (e) {
            if (e?.response?.status !== 403) console.warn("Could not load applications:", e?.response?.data?.message || e.message)
            setMyApplications([])
        } finally { setLoadingAuctions(false) }
    }

    useEffect(() => {
        fetchApproved()
        fetchAuctions()
        const interval = setInterval(fetchAuctions, 30_000)
        return () => clearInterval(interval)
    }, [])
    
    useEffect(() => {
        if (activeTab === "auctions") fetchAuctions()
    }, [activeTab])
    

    const handleLogout = async () => {
        try { await logout() } catch { } finally {
            localStorage.clear()
            sessionStorage.clear()
            navigate("/login")
        }
    }

    const clearFilters = () => {
        setSearch(""); setFilterType(""); setFilterCity(""); setFilterState("")
        setFilterFurnish(""); setFilterBedrooms(""); setFilterMinArea(""); setFilterMaxArea("")
        setFilterMinPrice(""); setFilterMaxPrice(""); setSortBy("default")
    }

    // ── Withdraw handler ──────────────────────────────────────────────────
    const handleWithdraw = async () => {
        if (!withdrawTarget?.auction?.id) return
        setWithdrawing(true)
        try {
            await withdrawApplication(withdrawTarget.auction.id)
            setWithdrawTarget(null)
            setWithdrawToast(`✅ Application for "${withdrawTarget.auction.property?.title || "auction"}" withdrawn successfully.`)
            setTimeout(() => setWithdrawToast(""), 4000)
            await fetchAuctions() // refresh both auctions + myApplications
        } catch (err) {
            setWithdrawToast(`❌ ${err?.response?.data || err?.message || "Failed to withdraw."}`)
            setTimeout(() => setWithdrawToast(""), 4000)
            setWithdrawTarget(null)
        } finally { setWithdrawing(false) }
    }

    const S = {
        btn: (v) => {
            const base = { borderRadius: 8, border: "none", cursor: "pointer", padding: "9px 14px", fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--dash-font)", position: "relative" }
            if (v === "ghost" || v === "sm-ghost") return { ...base, background: "var(--dash-accent-light)", color: "var(--dash-accent)", padding: v === "sm-ghost" ? "6px 12px" : "9px 14px", fontSize: v === "sm-ghost" ? 12 : 13 }
            if (v === "sm") return { ...base, background: "var(--dash-accent)", color: "#fff", padding: "6px 12px", fontSize: 12 }
            return { ...base, background: "var(--dash-accent)", color: "white" }
        },
        inp: { padding: "9px 12px", border: "1px solid var(--dash-border)", borderRadius: 8, background: "var(--dash-surface)", color: "var(--dash-text)", fontSize: 13, outline: "none", fontFamily: "var(--dash-font)" },
        sel: { padding: "9px 12px", border: "1px solid var(--dash-border)", borderRadius: 8, background: "var(--dash-surface)", color: "var(--dash-text)", fontSize: 13, outline: "none", fontFamily: "var(--dash-font)", cursor: "pointer" },
    }

    const renderFilterBar = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                    <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 15, opacity: 0.5 }}>🔍</span>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, city, state, pincode..."
                        style={{ ...S.inp, width: "100%", paddingLeft: 34, boxSizing: "border-box" }} />
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...S.sel, minWidth: 160 }}>
                    <option value="default">Sort: Default</option>
                    <option value="price_asc">Price: Low → High</option>
                    <option value="price_desc">Price: High → Low</option>
                    <option value="area_asc">Area: Small → Large</option>
                    <option value="area_desc">Area: Large → Small</option>
                </select>
                <button onClick={() => setShowFilters(f => !f)} style={{ ...S.btn(showFilters ? "sm" : "ghost"), position: "relative" }}>
                    ⚙️ Filters
                    {activeFilters > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900 }}>{activeFilters}</span>}
                </button>
                {(search || activeFilters > 0) && <button onClick={clearFilters} style={S.btn("sm-ghost")}>✕ Clear</button>}
                <button onClick={fetchApproved} style={S.btn("ghost")} disabled={loadingProps}>
                    {loadingProps ? <><Spinner size={14} color="var(--dash-accent)" /> Refreshing</> : "↻ Refresh"}
                </button>
            </div>
            {showFilters && (
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, border: "1px solid var(--dash-border)", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
                    {[["Property Type", filterType, setFilterType, ["Apartment", "Independent House", "Villa", "Land", "Commercial"]],
                    ["City", filterCity, setFilterCity, cityOptions],
                    ["State", filterState, setFilterState, stateOptions],
                    ["Furnishing", filterFurnish, setFilterFurnish, ["Furnished", "Semi-Furnished", "Unfurnished"]],
                    ].map(([label, val, setter, opts]) => (
                        <div key={label} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</label>
                            <select value={val} onChange={e => setter(e.target.value)} style={S.sel}>
                                <option value="">All</option>
                                {opts.map(o => <option key={o}>{o}</option>)}
                            </select>
                        </div>
                    ))}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>Bedrooms (BHK)</label>
                        <select value={filterBedrooms} onChange={e => setFilterBedrooms(e.target.value)} style={S.sel}>
                            <option value="">Any</option>
                            {["1", "2", "3", "4", "5"].map(b => <option key={b} value={b}>{b} BHK</option>)}
                        </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button onClick={clearFilters} style={{ ...S.btn("ghost"), width: "100%", justifyContent: "center" }}>🗑️ Reset All</button>
                    </div>
                </div>
            )}
            {activeFilters > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {filterType && <Chip label={filterType} onRemove={() => setFilterType("")} />}
                    {filterCity && <Chip label={`City: ${filterCity}`} onRemove={() => setFilterCity("")} />}
                    {filterState && <Chip label={`State: ${filterState}`} onRemove={() => setFilterState("")} />}
                    {filterFurnish && <Chip label={filterFurnish} onRemove={() => setFilterFurnish("")} />}
                    {filterBedrooms && <Chip label={`${filterBedrooms} BHK`} onRemove={() => setFilterBedrooms("")} />}
                </div>
            )}
        </div>
    )

    const renderCard = (p) => {
        const img = getImg(p)
        let amenityKeys = []
        if (p.amenitiesJson) {
            try { const obj = JSON.parse(p.amenitiesJson); amenityKeys = Object.entries(obj).filter(([, v]) => v).map(([k]) => k) } catch { }
        }
        const AMENITY_META = {
            waterSupply: { icon: "💧", label: "Water Supply" }, electricity: { icon: "⚡", label: "Electricity" },
            lift: { icon: "🛗", label: "Lift" }, security: { icon: "🔒", label: "Security" },
            garden: { icon: "🌳", label: "Garden" }, swimmingPool: { icon: "🏊", label: "Pool" },
            gym: { icon: "🏋️", label: "Gym" }, powerBackup: { icon: "🔋", label: "Power Backup" },
            internet: { icon: "📶", label: "WiFi" },
        }
        return (
            <div key={p.id} className="dc-prop-card" onClick={() => setSelectedProp(p)}>
                <div style={{ height: 175, background: "#f1f5f9", position: "relative" }}>
                    {img ? <img src={img} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { e.target.style.display = "none" }} />
                        : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dash-muted)", fontSize: 13 }}>No Image</div>}
                    {p.propertyType && <span style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6 }}>{p.propertyType}</span>}
                    <span style={{ position: "absolute", top: 10, right: 10, padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>✅ Approved</span>
                </div>
                <div style={{ padding: "14px 16px 0" }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--dash-text)", lineHeight: 1.3 }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: "var(--dash-muted)", marginTop: 6 }}>📍 {[p.city || p.location, p.state].filter(Boolean).join(", ") || "—"}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "var(--dash-accent)", marginTop: 10 }}>{formatINR(p.startingPrice)}</div>
                    <div style={{ height: 1, background: "var(--dash-border)", margin: "10px 0" }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 5, columnGap: 12, marginBottom: 10 }}>
                        {p.bedrooms && <SpecRow icon="🛏️" label="Bedrooms" value={`${p.bedrooms} BHK`} />}
                        {p.bathrooms && <SpecRow icon="🚿" label="Bathrooms" value={p.bathrooms} />}
                        {p.totalArea && <SpecRow icon="📐" label="Total Area" value={`${p.totalArea} sq ft`} />}
                        {p.furnishing && <SpecRow icon="🛋️" label="Furnishing" value={p.furnishing} />}
                    </div>
                    {amenityKeys.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                            {amenityKeys.slice(0, 4).map(k => {
                                const m = AMENITY_META[k] || { icon: "✓", label: k.replace(/([A-Z])/g, " $1").trim() }
                                return <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "var(--dash-accent-light)", color: "var(--dash-accent)", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{m.icon} {m.label}</span>
                            })}
                        </div>
                    )}
                </div>
                <div style={{ padding: "8px 16px 14px", display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--dash-accent)", background: "var(--dash-accent-light)", padding: "5px 12px", borderRadius: 999 }}>View Full Details →</span>
                </div>
                {showMapCards && p.latitude && p.longitude && <CardMap lat={p.latitude} lng={p.longitude} />}
            </div>
        )
    }

    // ── Auctions tab with withdraw button ─────────────────────────────────
    const renderAuctions = () => {
        const appMap = {}
        myApplications.forEach(a => { appMap[a.auction?.id] = { status: a.status, app: a } })

        // Show only auctions the bidder has applied to
        let displayedAuctions = auctions.filter(a => appMap[a.id])
        if (auctionPropertyFilter) {
            displayedAuctions = displayedAuctions.filter(a => a.property?.id === auctionPropertyFilter)
        }
        const filteredPropTitle = auctionPropertyFilter
            ? (auctions.find(a => a.property?.id === auctionPropertyFilter)?.property?.title || "Selected Property")
            : null

        const STATUS_COLOR = {
            SCHEDULED: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", label: "Scheduled" },
            LIVE: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", label: "Live Now 🔴" },
            COMPLETED: { bg: "#f8fafc", border: "#e2e8f0", text: "#64748b", label: "Completed" },
            CANCELLED: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", label: "Cancelled" },
        }

        return (
            <div>
                <div className="dc-card" style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                        <div>
                            <div className="dc-section-title" style={{ marginBottom: 4 }}>📋 My Auctions</div>
                            {auctionPropertyFilter ? (
                                <div style={{ fontSize: 13, color: "var(--dash-muted)" }}>
                                    Showing applied auctions for: <strong style={{ color: "var(--dash-text)" }}>{filteredPropTitle}</strong>
                                    <button onClick={() => setAuctionPropertyFilter(null)}
                                        style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: "#0ea5e9", background: "#e0f2fe", border: "none", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
                                        ✕ Show All
                                    </button>
                                </div>
                            ) : (
                                <div style={{ fontSize: 13, color: "var(--dash-muted)" }}>
                                    View the auctions you have applied for. You can withdraw before the auction starts.
                                </div>
                            )}
                        </div>
                        <button onClick={fetchAuctions} style={S.btn("ghost")} disabled={loadingAuctions}>
                            {loadingAuctions ? <><Spinner size={14} color="var(--dash-accent)" /> Loading</> : "↻ Refresh"}
                        </button>
                    </div>
                </div>

                {auctionsError && <div className="dc-banner dc-banner-error" style={{ marginBottom: 12 }}>{auctionsError}</div>}

                {loadingAuctions ? (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--dash-muted)", padding: 24 }}>
                        <Spinner size={20} color="var(--dash-accent)" /> Loading auctions...
                    </div>
                ) : displayedAuctions.length === 0 ? (
                    <div className="dc-card" style={{ textAlign: "center", padding: 60, color: "var(--dash-muted)" }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🏗️</div>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>
                            {auctionPropertyFilter ? "No applied auctions for this property" : "You haven't applied to any auctions yet"}
                        </div>
                        <div style={{ fontSize: 13, marginBottom: 16 }}>Browse properties and click 'Apply for Auction' to participate.</div>
                        {auctionPropertyFilter && (
                            <button onClick={() => setAuctionPropertyFilter(null)} style={{ padding: "8px 20px", background: "var(--dash-accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
                                Browse All Auctions
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
                        {displayedAuctions.map(auction => {
                            const prop = auction.property || {}
                            const st = STATUS_COLOR[auction.status] || STATUS_COLOR.SCHEDULED
                            const appEntry = appMap[auction.id]
                            const appStatus = appEntry?.status
                            const appBadge = appStatus ? APP_STATUS[appStatus] : null
                            const allowWithdraw = canWithdraw(auction)

                            return (
                                <div key={auction.id} className="dc-prop-card" style={{ cursor: "default" }}>
                                    <div style={{ height: 150, background: "linear-gradient(135deg,#e0f2fe,#bfdbfe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, position: "relative" }}>
                                        🏠
                                        <span style={{ position: "absolute", top: 10, right: 10, background: st.bg, color: st.text, border: `1px solid ${st.border}`, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999 }}>
                                            {st.label}
                                        </span>
                                    </div>
                                    <div style={{ padding: "14px 16px" }}>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dash-text)", marginBottom: 4 }}>
                                            {prop.title || "Property Auction"}
                                        </div>
                                        <div style={{ fontSize: 12, color: "var(--dash-muted)", marginBottom: 12 }}>
                                            📍 {prop.city || prop.location || "Location not specified"}
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                                            {[
                                                ["Starting Bid", formatINR(auction.startingBid)],
                                                ["Current Bid", formatINR(auction.currentBid)],
                                                ["Starts", formatDate(auction.startTime)],
                                                ["Ends", formatDate(auction.endTime)],
                                            ].map(([k, v]) => (
                                                <div key={k} style={{ background: "var(--dash-surface)", borderRadius: 8, padding: "8px 10px", border: "1px solid var(--dash-border)" }}>
                                                    <div style={{ fontSize: 10, color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{k}</div>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginTop: 2 }}>{v}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Application status badge */}
                                    
{appBadge && (
    <div style={{ textAlign: "center", padding: "10px 14px", borderRadius: 8,
        background: appBadge.bg, color: appBadge.color, fontSize: 13,
        fontWeight: 700, border: `1px solid ${appBadge.color}22`,
        marginBottom: (allowWithdraw || (appStatus === "APPROVED" && auction.status === "LIVE")) ? 10 : 0 }}>
        {appBadge.label}
    </div>
)}

{/* ── ENTER LIVE ROOM button — shows when approved + auction is LIVE ── */}
{appStatus === "APPROVED" && auction.status === "LIVE" && (
    <button
        onClick={() => navigate(`/bidder/auction/${auction.id}/live`)}
        style={{
            width: "100%", padding: "11px", borderRadius: 8, border: "none",
            background: "linear-gradient(135deg, #1b5e20, #2e7d32)",
            color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, marginBottom: allowWithdraw ? 10 : 0,
            boxShadow: "0 0 12px rgba(76,175,80,0.4)",
            animation: "pulse 2s infinite"
        }}>
        🔴 Enter Live Room
    </button>
)}

                                        {/* Withdraw button — only before auction starts */}
                                        {allowWithdraw && (
                                            <button
                                                onClick={() => setWithdrawTarget({ auction })}
                                                style={{
                                                    width: "100%", padding: "9px", borderRadius: 8,
                                                    border: "1px solid #fde68a",
                                                    background: "#fffbeb", color: "#92400e",
                                                    cursor: "pointer", fontSize: 13, fontWeight: 700,
                                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                                                }}>
                                                ↩️ Withdraw Application
                                            </button>
                                        )}
                                        {/* If auction already started and bidder has application */}
                                        {!allowWithdraw && appStatus && (
                                            <div style={{ textAlign: "center", fontSize: 11, color: "var(--dash-muted)", marginTop: 8, fontStyle: "italic" }}>
                                                Auction has started — withdrawal not possible
                                            </div>
                                        )}

                                        {/* Winner banner in My Auctions tab for completed auctions */}
                                        {String(auction.status || "").toUpperCase() === "COMPLETED" && (() => {
                                            const myId = sessionStorage.getItem("userId") || localStorage.getItem("userId")
                                            const iWon = auction.winner?.id != null && String(auction.winner.id) === String(myId)
                                            return (
                                                <div style={{
                                                    marginTop: 10, padding: "10px 14px", borderRadius: 8,
                                                    background: iWon ? "#dcfce7" : "#f1f5f9",
                                                    color: iWon ? "#166534" : "#64748b",
                                                    fontSize: 13, fontWeight: 700, textAlign: "center"
                                                }}>
                                                    {iWon ? "🏆 You won this auction!" : `🏁 Ended — Winner: ${auction.winner?.name || "No bids"}`}
                                                </div>
                                            )
                                        })()}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    const renderDashboard = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="dc-welcome">
                <div>
                    <div className="dc-welcome-title">Hello, {name} 👋</div>
                    <div className="dc-welcome-sub">Browse approved properties and participate in live auctions.</div>
                    {userLoc && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 600, marginTop: 6 }}>📡 Live location active — navigation enabled</div>}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={() => setActiveTab("auctions")} className="dc-btn" style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}>📋 My Auctions</button>
                    <button onClick={() => setActiveTab("browse")} className="dc-btn dc-btn-primary" style={{ background: "white", color: "var(--dash-accent)" }}>Browse Properties →</button>
                </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
                {[
                    ["🏠", "Properties", approvedCount, "#6366f1", "rgba(99,102,241,0.08)"],
                    ["🔨", "Open Auctions", auctions.length, "#0ea5e9", "rgba(14,165,233,0.08)"],
                    ["📋", "My Applications", myApplications.length, "#10b981", "rgba(16,185,129,0.08)"],
                    ["✅", "Approved", myApplications.filter(a => a.status === "APPROVED").length, "#f59e0b", "rgba(245,158,11,0.08)"],
                ].map(([icon, label, val, fg, bg]) => (
                    <div key={label} className="dc-stat-card" style={{ borderTop: `3px solid ${fg}` }}>
                        <div className="dc-stat-icon" style={{ background: bg, color: fg }}>{icon}</div>
                        <div className="dc-stat-label" style={{ color: fg }}>{label}</div>
                        <div className="dc-stat-value">{val}</div>
                    </div>
                ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="dc-card" style={{ cursor: "pointer" }} onClick={() => setActiveTab("auctions")}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "var(--dash-text)", marginBottom: 6 }}>My Auctions</div>
                    <div style={{ fontSize: 13, color: "var(--dash-muted)", marginBottom: 14 }}>Track your applications and withdraw before auctions start.</div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--dash-accent)", background: "var(--dash-accent-light)", padding: "5px 14px", borderRadius: 999 }}>View My Auctions →</span>
                </div>
                <div className="dc-card" style={{ cursor: "pointer" }} onClick={() => setActiveTab("browse")}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🏡</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "var(--dash-text)", marginBottom: 6 }}>Browse Properties</div>
                    <div style={{ fontSize: 13, color: "var(--dash-muted)", marginBottom: 14 }}>Explore all admin-approved properties with full details and map navigation.</div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--dash-accent)", background: "var(--dash-accent-light)", padding: "5px 14px", borderRadius: 999 }}>Go to Properties →</span>
                </div>
            </div>
            {myApplications.length > 0 && (
                <div className="dc-card">
                    <div className="dc-section-title" style={{ marginBottom: 14 }}>📋 My Applications</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {myApplications.map(app => {
                            const badge = APP_STATUS[app.status] || APP_STATUS.PENDING
                            const auction = auctions.find(a => a.id === app.auction?.id) || app.auction
                            const allowWithdraw = canWithdraw(auction)
                            return (
                                <div key={app.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--dash-surface)", borderRadius: 10, border: "1px solid var(--dash-border)", gap: 12, flexWrap: "wrap" }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--dash-text)" }}>{app.auction?.property?.title || "Auction #" + app.auction?.id}</div>
                                        <div style={{ fontSize: 12, color: "var(--dash-muted)", marginTop: 3 }}>Applied {formatDate(app.appliedAt)}</div>
                                        {app.status === "REJECTED" && app.rejectionReason && (
                                            <div style={{ fontSize: 12, color: "#991b1b", marginTop: 4 }}>Reason: {app.rejectionReason}</div>
                                        )}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                        <span style={{ background: badge.bg, color: badge.color, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 999, whiteSpace: "nowrap" }}>
                                            {badge.label}
                                        </span>
                                        {allowWithdraw && (
                                            <button onClick={() => setWithdrawTarget({ auction: auction || app.auction })}
                                                style={{ fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 8, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e", cursor: "pointer", whiteSpace: "nowrap" }}>
                                                ↩️ Withdraw
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
            <div className="dc-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div className="dc-section-title" style={{ marginBottom: 0 }}>🏡 Approved Properties</div>
                    <button onClick={() => setActiveTab("browse")} style={S.btn("ghost")}>View All →</button>
                </div>
                {renderFilterBar()}
                {propsError && <div className="dc-banner dc-banner-error" style={{ marginBottom: 10 }}>{propsError}</div>}
                {loadingProps ? (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--dash-muted)", padding: 16 }}><Spinner size={20} color="var(--dash-accent)" /> Loading...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ color: "var(--dash-muted)", padding: "20px 0", textAlign: "center" }}>
                        {properties.length === 0 ? "No approved properties yet." : "No properties match your filters."}
                    </div>
                ) : (
                    <>
                        <div style={{ fontSize: 13, color: "var(--dash-muted)", marginBottom: 12 }}>Showing {filtered.length} of {approvedCount} properties</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>{filtered.map(p => renderCard(p))}</div>
                    </>
                )}
            </div>
        </div>
    )

    const renderBrowse = () => (
        <div>
            <div className="dc-card" style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <div className="dc-section-title" style={{ marginBottom: 4 }}>Browse All Properties</div>
                        <div style={{ fontSize: 13, color: "var(--dash-muted)" }}>Click any card to view full details, map &amp; navigation.</div>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--dash-muted)", cursor: "pointer" }}>
                        <input type="checkbox" checked={showMapCards} onChange={e => setShowMapCards(e.target.checked)} style={{ accentColor: "var(--dash-accent)" }} />
                        Show map previews
                    </label>
                </div>
                {renderFilterBar()}
                {propsError && <div className="dc-banner dc-banner-error" style={{ marginTop: 10 }}>{propsError}</div>}
            </div>
            {loadingProps ? (
                <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--dash-muted)", padding: 16 }}><Spinner size={20} color="var(--dash-accent)" /> Loading properties...</div>
            ) : filtered.length === 0 ? (
                <div className="dc-card" style={{ color: "var(--dash-muted)", textAlign: "center", padding: 40 }}>
                    {properties.length === 0 ? "No approved properties yet." : "No properties match your filters."}
                </div>
            ) : (
                <>
                    <div style={{ fontSize: 13, color: "var(--dash-muted)", marginBottom: 12 }}>Showing {filtered.length} of {approvedCount} properties</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>{filtered.map(p => renderCard(p))}</div>
                </>
            )}
        </div>
    )

    const navItems = [
        { id: "dashboard", icon: "📊", label: "Dashboard" },
        { id: "auctions", icon: "📋", label: "My Auctions", badge: myApplications.length, badgeMuted: myApplications.length === 0 },
        { id: "browse", icon: "🏡", label: "Browse Properties", badge: approvedCount, badgeMuted: approvedCount === 0 },
        { id: "results", icon: "🏆", label: "My Results" },
    ]
    const pageTitle = { dashboard: "Bidder Dashboard", auctions: "My Auctions", browse: "Browse Properties", results: "My Results" }[activeTab] || "Bidder Dashboard"

    const renderResults = () => {
        const completedMyAuctions = auctions.filter(a => {
            const s = String(a.status || "").toUpperCase()
            return (s === "COMPLETED") && myApplications.some(app => app.auction?.id === a.id)
        })

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="dc-card">
                    <div className="dc-section-title" style={{ marginBottom: 4 }}>🏆 My Auction Results</div>
                    <div style={{ fontSize: 13, color: "var(--dash-muted)" }}>
                        Completed auctions you participated in.
                    </div>
                </div>

                {completedMyAuctions.length === 0 ? (
                    <div className="dc-card" style={{ textAlign: "center", padding: 60, color: "var(--dash-muted)" }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🏛️</div>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>No completed auctions yet</div>
                        <div style={{ fontSize: 13 }}>Your results will appear here once auctions you&apos;ve joined close.</div>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
                        {completedMyAuctions.map(auction => {
                            const myApp = myApplications.find(app => app.auction?.id === auction.id)
                            const myId = sessionStorage.getItem("userId") || localStorage.getItem("userId")
                            const iWon = auction.winner?.id != null && String(auction.winner.id) === String(myId)
                            const prop = auction.property || {}

                            return (
                                <div key={auction.id} style={{
                                    background: iWon
                                        ? "linear-gradient(135deg, #f0fdf4, #dcfce7)"
                                        : "var(--dash-surface)",
                                    border: iWon ? "2px solid #16a34a" : "1px solid var(--dash-border)",
                                    borderRadius: 16, padding: 20,
                                    boxShadow: iWon ? "0 4px 20px rgba(22,163,74,0.15)" : "none"
                                }}>
                                    {iWon && (
                                        <div style={{
                                            background: "#16a34a", color: "#fff",
                                            borderRadius: 10, padding: "10px 16px",
                                            fontSize: 15, fontWeight: 800,
                                            textAlign: "center", marginBottom: 14,
                                            display: "flex", alignItems: "center",
                                            justifyContent: "center", gap: 8
                                        }}>
                                            🏆 You Won This Auction!
                                        </div>
                                    )}
                                    {!iWon && auction.winner && (
                                        <div style={{
                                            background: "#f1f5f9", color: "#64748b",
                                            borderRadius: 10, padding: "8px 14px",
                                            fontSize: 13, fontWeight: 700,
                                            textAlign: "center", marginBottom: 14
                                        }}>
                                            🏁 Auction Ended
                                        </div>
                                    )}

                                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)", marginBottom: 6 }}>
                                        {prop.title || "Property Auction"}
                                    </div>
                                    <div style={{ fontSize: 12, color: "var(--dash-muted)", marginBottom: 14 }}>
                                        📍 {prop.city || prop.location || "—"}
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                                        {[
                                            ["Starting Bid", formatINR(auction.startingBid)],
                                            ["Final Bid", formatINR(auction.currentBid)],
                                            ["Your Status", myApp?.status || "—"],
                                            ["Winner", auction.winner?.name || "No bids"],
                                        ].map(([k, v]) => (
                                            <div key={k} style={{
                                                background: "#fff", borderRadius: 8,
                                                padding: "8px 10px",
                                                border: "1px solid var(--dash-border)"
                                            }}>
                                                <div style={{ fontSize: 10, color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{k}</div>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginTop: 2 }}>{v}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {iWon && (
                                        <div style={{
                                            background: "#dcfce7", borderRadius: 10,
                                            padding: "10px 14px", fontSize: 13,
                                            color: "#166534", fontWeight: 600,
                                            lineHeight: 1.5
                                        }}>
                                            🎉 Congratulations! The auctioneer will contact you soon to complete the purchase. Check your email for details.
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    return (
        <DashboardLayout navItems={navItems} activeTab={activeTab} onTabChange={setActiveTab}
            onNavigate={navigate} userName={name} userRole="Bidder" onLogout={handleLogout} pageTitle={pageTitle}>
            {activeTab === "dashboard" && renderDashboard()}
            {activeTab === "auctions" && renderAuctions()}
            {activeTab === "browse" && renderBrowse()}
            {activeTab === "results" && renderResults()}
            {selectedProp && (
                <PropertyModal p={selectedProp} onClose={() => setSelectedProp(null)} userLoc={userLoc}
                    auctions={auctions} myApplications={myApplications}
                    onApplyToAuction={setApplyingToAuction}
                    onGoToAuctions={(propId) => { setAuctionPropertyFilter(propId || null); setActiveTab("auctions") }} />
            )}
            {applyingToAuction && (
                <ApplyModal auction={applyingToAuction} onClose={() => setApplyingToAuction(null)}
                    onSuccess={() => { setApplyingToAuction(null); fetchAuctions() }} />
            )}

            {/* Withdraw Confirm Modal */}
            <WithdrawModal
                auction={withdrawTarget?.auction}
                onConfirm={handleWithdraw}
                onClose={() => setWithdrawTarget(null)}
                withdrawing={withdrawing}
            />

            {/* Toast notification */}
            {withdrawToast && (
                <div style={{
                    position: "fixed", bottom: 24, right: 24,
                    background: withdrawToast.startsWith("✅") ? "#f0fdf4" : "#fef2f2",
                    color: withdrawToast.startsWith("✅") ? "#16a34a" : "#dc2626",
                    border: `1px solid ${withdrawToast.startsWith("✅") ? "#bbf7d0" : "#fecaca"}`,
                    padding: "14px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 9999,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.12)"
                }}>
                    {withdrawToast}
                </div>
            )}
        </DashboardLayout>
    )
}