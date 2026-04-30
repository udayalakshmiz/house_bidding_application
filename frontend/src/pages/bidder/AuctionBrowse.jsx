import { useState, useEffect } from "react"
import { getActiveAuctions, applyToAuction, getMyApplicationForAuction } from "../../services/authService"

const STATUS_COLOR = {
    SCHEDULED: { bg: "#1e3a5f", text: "#60aaff", label: "Scheduled" },
    LIVE: { bg: "#1a3a1a", text: "#4caf50", label: "Live Now" },
    COMPLETED: { bg: "#2a2a2a", text: "#888", label: "Completed" },
    CANCELLED: { bg: "#3a1a1a", text: "#e57373", label: "Cancelled" },
}

const HISTORY_OPTIONS = [
    { value: "NONE", label: "First-time bidder – no history" },
    { value: "CLEAN", label: "I have bid before – clean record" },
    { value: "HAS_DEFAULTS", label: "I have had defaults / disputes" },
]

import ApplyModal from "../../components/ApplyModal"

// ── Auction Card ──────────────────────────────────────────────────────────────
function AuctionCard({ auction, myApps, onApply }) {
    const st = STATUS_COLOR[auction.status] || STATUS_COLOR.SCHEDULED
    const prop = auction.property || {}
    const appStatus = myApps[auction.id]

    return (
        <div style={{
            background: "#111", border: "1px solid #1e1e1e", borderRadius: 14,
            overflow: "hidden", transition: "border-color .2s"
        }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#2a2a2a"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#1e1e1e"}>

            {/* Image placeholder */}
            <div style={{
                height: 160, background: "linear-gradient(135deg,#0d1a2d,#1a1a2e)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 48, position: "relative"
            }}>
                🏠
                <div style={{
                    position: "absolute", top: 12, right: 12,
                    background: st.bg, color: st.text, borderRadius: 20,
                    padding: "3px 12px", fontSize: 12, fontWeight: 700
                }}>
                    {st.label}
                </div>
            </div>

            <div style={{ padding: 18 }}>
                <h3 style={{ color: "#eee", margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>
                    {prop.title || "Property Auction"}
                </h3>
                <p style={{ color: "#666", fontSize: 12, margin: "0 0 14px" }}>
                    {prop.location || "Location not specified"}
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                    {[
                        ["Starting Bid", `₹${auction.startingBid?.toLocaleString("en-IN") || "0"}`],
                        ["Current Bid", `₹${auction.currentBid?.toLocaleString("en-IN") || "0"}`],
                        ["Starts", auction.startTime ? new Date(auction.startTime).toLocaleDateString("en-IN") : "TBD"],
                        ["Ends", auction.endTime ? new Date(auction.endTime).toLocaleDateString("en-IN") : "TBD"],
                    ].map(([k, v]) => (
                        <div key={k} style={{ background: "#0d0d0d", borderRadius: 8, padding: "8px 12px" }}>
                            <div style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{k}</div>
                            <div style={{ color: "#ccc", fontSize: 14, fontWeight: 600, marginTop: 2 }}>{v}</div>
                        </div>
                    ))}
                </div>

                {/* Button logic - FIXED */}
                {(() => {
                    // If status is null, undefined, or "NOT_APPLIED" - show Apply button
                    if (!appStatus || appStatus === "NOT_APPLIED") {
                        return (
                            <button
                                onClick={() => onApply(auction)}
                                style={{
                                    width: "100%", padding: "11px", borderRadius: 8, border: "none",
                                    background: "#1e4a8a", color: "#fff", cursor: "pointer",
                                    fontSize: 14, fontWeight: 700
                                }}>
                                Apply to Bid
                            </button>
                        )
                    }

                    // Otherwise show status
                    return (
                        <div style={{
                            textAlign: "center", padding: "10px", borderRadius: 8,
                            background: "#0d0d0d",
                            color: appStatus === "APPROVED" ? "#4caf50" :
                                appStatus === "REJECTED" ? "#e57373" : "#888",
                            fontSize: 14
                        }}>
                            {appStatus === "PENDING" && "⏳ Pending Review"}
                            {appStatus === "APPROVED" && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <div style={{
                                        textAlign: "center", padding: "8px", borderRadius: 8,
                                        background: "#0d2a0d", color: "#4caf50", fontSize: 13
                                    }}>
                                        ✅ Approved to Bid
                                    </div>
                                    {(auction.status === "LIVE" || auction.status === "live") && (
    <button
        onClick={() => window.location.href = `/bidder/auction/${auction.id}/live`}
                                            style={{
                                                width: "100%", padding: "11px", borderRadius: 8, border: "none",
                                                background: "linear-gradient(135deg, #1a6b3a, #0f4d2a)",
                                                color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700,
                                                animation: "pulse 2s infinite"
                                            }}>
                                            🔴 Enter Live Room
                                        </button>
                                    )}
                                </div>
                            )}
                            {appStatus === "REJECTED" && "❌ Rejected"}
                        </div>
                    )
                })()}
            </div>
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AuctionBrowse() {
    const [auctions, setAuctions] = useState([])
    const [myApps, setMyApps] = useState({}) // auctionId → status
    const [loading, setLoading] = useState(true)
    const [selectedAuction, setSelected] = useState(null)
    const [successId, setSuccessId] = useState(null)

    const load = async () => {
        setLoading(true)
        try {
            const { data } = await getActiveAuctions()
            console.log("Auctions loaded:", data)
            setAuctions(data)

            // fetch application status for each auction INDIVIDUALLY
            const statusMap = {}

            for (const auction of data) {
                try {
                    const res = await getMyApplicationForAuction(auction.id)
                    console.log(`Application status for auction ${auction.id}:`, res.data)

                    // Handle different response formats
                    if (res.data) {
                        if (res.data.status) {
                            // Format 1: {status: "APPROVED"} OR {status: "NOT_APPLIED"}
                            statusMap[auction.id] = res.data.status
                        } else if (res.data.id) {
                            // Format 2: Full application object with status property
                            statusMap[auction.id] = res.data.status || "PENDING"
                        }
                    } else {
                        statusMap[auction.id] = null // No application
                    }
                } catch (err) {
                    // 404 means no application exists - this is NORMAL
                    console.log(`No application for auction ${auction.id}`)
                    statusMap[auction.id] = null
                }
            }

            console.log("Final status map:", statusMap)
            setMyApps(statusMap)
        } catch (err) {
            console.error("Failed to load auctions:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
        // Poll every 30 seconds to catch status changes (SCHEDULED → LIVE)
        const interval = setInterval(load, 30_000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div style={{
            minHeight: "100vh", background: "#0d0d0d", padding: "32px 24px",
            fontFamily: "'Segoe UI', sans-serif"
        }}>

            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                {/* Header */}
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ color: "#eee", margin: 0, fontSize: 28, fontWeight: 800 }}>
                        🏛️ Active Auctions
                    </h1>
                    <p style={{ color: "#555", margin: "8px 0 0", fontSize: 15 }}>
                        Browse open auctions and submit your application to participate.
                    </p>
                </div>

                {successId && (
                    <div style={{
                        background: "#0d2a0d", border: "1px solid #4caf50", borderRadius: 10,
                        padding: "14px 18px", marginBottom: 24, color: "#4caf50", fontSize: 14
                    }}>
                        ✅ Application submitted! The auctioneer will review your details and notify you.
                        <button onClick={() => setSuccessId(null)}
                            style={{
                                float: "right", background: "none", border: "none",
                                color: "#4caf50", cursor: "pointer", fontSize: 16
                            }}>✕</button>
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: "center", color: "#555", paddingTop: 80 }}>Loading auctions…</div>
                ) : auctions.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#555", paddingTop: 80 }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🏗️</div>
                        <p>No active auctions at the moment. Check back soon.</p>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
                        {auctions.map(a => (
                            <AuctionCard
                                key={a.id}
                                auction={a}
                                myApps={myApps}
                                onApply={setSelected} />
                        ))}
                    </div>
                )}
            </div>

            {selectedAuction && (
                <ApplyModal
                    auction={selectedAuction}
                    onClose={() => setSelected(null)}
                    onSuccess={handleSuccess} />
            )}
        </div>
    )
}