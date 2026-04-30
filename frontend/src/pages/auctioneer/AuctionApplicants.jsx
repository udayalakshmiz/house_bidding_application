import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { getAuctionApplications, approveApplication, rejectApplication } from "../../services/authService"

const STATUS_STYLE = {
    PENDING: { bg: "#1e2a1a", color: "#ffd54f", label: "Pending" },
    APPROVED: { bg: "#0d2a0d", color: "#4caf50", label: "Approved" },
    REJECTED: { bg: "#2a0d0d", color: "#e57373", label: "Rejected" },
}

const HISTORY_BADGE = {
    NONE: { bg: "#1a1a2e", color: "#7986cb", label: "First-time Bidder" },
    CLEAN: { bg: "#0d2a0d", color: "#4caf50", label: "Clean Record" },
    HAS_DEFAULTS: { bg: "#2a1a0d", color: "#ff9800", label: "Has Defaults" },
}

// ── Bidder Detail Modal ───────────────────────────────────────────────────────
function BidderDetailModal({ app, onClose, onApprove, onReject }) {
    const [rejecting, setRejecting] = useState(false)
    const [rejectReason, setRejectReason] = useState("")
    const [loading, setLoading] = useState(false)
    const [imageZoomed, setImageZoomed] = useState(false)
    const [incomeProofZoomed, setIncomeProofZoomed] = useState(false)

    const hist = HISTORY_BADGE[app.pastBiddingHistory] || HISTORY_BADGE.NONE
    const sts = STATUS_STYLE[app.status] || STATUS_STYLE.PENDING

    // Build URLs for uploaded files
    const aadhaarImgUrl = app.aadhaarImagePath
        ? `http://localhost:8081${app.aadhaarImagePath.startsWith("/") ? "" : "/"}${app.aadhaarImagePath}`
        : null
    const incomeProofUrl = app.incomeProofPath
        ? `http://localhost:8081${app.incomeProofPath.startsWith("/") ? "" : "/"}${app.incomeProofPath}`
        : null
    const incomeProofIsPdf = incomeProofUrl && app.incomeProofPath?.toLowerCase().endsWith(".pdf")

    const handleApprove = async () => {
        setLoading(true)
        await onApprove(app.id)
        setLoading(false)
        onClose()
    }

    const handleReject = async () => {
        if (!rejectReason.trim()) return
        setLoading(true)
        await onReject(app.id, rejectReason)
        setLoading(false)
        onClose()
    }

    const row = (label, value, accent) => (
        <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            padding: "10px 0", borderBottom: "1px solid #1a1a1a"
        }}>
            <span style={{ color: "#555", fontSize: 13 }}>{label}</span>
            <span style={{
                color: accent || "#ccc", fontSize: 13, fontWeight: 600,
                textAlign: "right", maxWidth: "60%"
            }}>{value || "—"}</span>
        </div>
    )

    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20
        }}>
            <div style={{
                background: "#161616", border: "1px solid #2a2a2a", borderRadius: 16,
                width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto",
                padding: 28
            }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                        <h2 style={{ color: "#eee", margin: 0, fontSize: 18 }}>Bidder Application</h2>
                        <p style={{ color: "#666", margin: "4px 0 0", fontSize: 13 }}>
                            Applied {new Date(app.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{
                            background: sts.bg, color: sts.color, borderRadius: 20,
                            padding: "4px 12px", fontSize: 12, fontWeight: 700
                        }}>
                            {sts.label}
                        </span>
                        <button onClick={onClose}
                            style={{
                                background: "none", border: "none", color: "#666", fontSize: 22,
                                cursor: "pointer", lineHeight: 1
                            }}>✕</button>
                    </div>
                </div>

                {/* ── Aadhaar Verification Section (Manual) ── */}
                <div style={{
                    background: "#0d1117", border: "1px solid #1e3a5f",
                    borderRadius: 12, padding: 18, marginBottom: 20
                }}>
                    {/* Section header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                        <span style={{ fontSize: 22 }}>🪪</span>
                        <span style={{ fontWeight: 700, color: "#60aaff", fontSize: 15 }}>Aadhaar Verification</span>
                        <span style={{
                            marginLeft: "auto", background: "#1e2a3a", color: "#ffd54f",
                            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700
                        }}>
                            🔍 Manual Check Required
                        </span>
                    </div>

                    {/* Aadhaar Number — shown in full for auctioneer */}
                    <div style={{
                        background: "#111", border: "1px solid #2a2a2a", borderRadius: 8,
                        padding: "10px 14px", marginBottom: 14
                    }}>
                        <div style={{ color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                            Aadhaar Number (Entered by Bidder)
                        </div>
                        <div style={{ color: "#eee", fontSize: 18, fontWeight: 700, letterSpacing: 3, fontFamily: "monospace" }}>
                            {app.aadhaarNumber
                                ? `${app.aadhaarNumber.slice(0, 4)} ${app.aadhaarNumber.slice(4, 8)} ${app.aadhaarNumber.slice(8, 12)}`
                                : "Not provided"}
                        </div>
                    </div>

                    {/* Uploaded Aadhaar Card Image */}
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                            Uploaded Aadhaar Card Image
                        </div>
                        {aadhaarImgUrl ? (
                            <div
                                onClick={() => setImageZoomed(!imageZoomed)}
                                style={{
                                    cursor: "pointer", borderRadius: 8, overflow: "hidden",
                                    border: "1px solid #2a2a2a", background: "#0d0d0d",
                                    position: "relative"
                                }}>
                                <img
                                    src={aadhaarImgUrl}
                                    alt="Aadhaar Card"
                                    style={{
                                        width: "100%", display: "block",
                                        maxHeight: imageZoomed ? "none" : 200,
                                        objectFit: imageZoomed ? "contain" : "cover",
                                        transition: "max-height 0.3s ease"
                                    }}
                                />
                                <div style={{
                                    position: "absolute", bottom: 8, right: 8,
                                    background: "rgba(0,0,0,0.7)", color: "#aaa",
                                    padding: "3px 8px", borderRadius: 4, fontSize: 11
                                }}>
                                    {imageZoomed ? "🔍 Click to shrink" : "🔍 Click to expand"}
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                background: "#1a1a1a", borderRadius: 8, padding: "20px",
                                textAlign: "center", color: "#555", fontSize: 13,
                                border: "1px dashed #2a2a2a"
                            }}>
                                ⚠️ No Aadhaar image uploaded
                            </div>
                        )}
                    </div>

                    {/* Verification instruction */}
                    <div style={{
                        background: "#1a1a0d", border: "1px solid #ffd54f33",
                        borderRadius: 8, padding: "10px 14px", marginTop: 10
                    }}>
                        <div style={{ color: "#ffd54f", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                            ⚠️ Please verify manually:
                        </div>
                        <ul style={{ color: "#aaa", fontSize: 12, margin: "0", paddingLeft: 18, lineHeight: 1.8 }}>
                            <li>Check that the uploaded image is a valid Aadhaar card</li>
                            <li>Verify the name on the card matches the full name below</li>
                            <li>Confirm the 12-digit number on the card matches the entered number above</li>
                        </ul>
                    </div>
                </div>

                {/* Personal Info */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{
                        color: "#60aaff", fontSize: 11, letterSpacing: 1,
                        textTransform: "uppercase", marginBottom: 10, fontWeight: 700
                    }}>
                        Personal Details
                    </div>
                    {row("Full Name", app.fullName)}
                    {row("Phone", app.phone)}
                    {row("Occupation", app.occupation)}
                    {row("Annual Income", app.annualIncome ? `₹${Number(app.annualIncome).toLocaleString("en-IN")}` : null)}
                    {row("Address", app.address)}
                </div>

                {/* Income Proof Document */}
                <div style={{
                    background: "#0d1117", border: "1px solid #1e3a5f",
                    borderRadius: 12, padding: 18, marginBottom: 20
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                        <span style={{ fontSize: 20 }}>📄</span>
                        <span style={{ fontWeight: 700, color: "#60aaff", fontSize: 15 }}>Income Proof</span>
                        <span style={{
                            marginLeft: "auto", background: "#1e2a3a", color: "#ffd54f",
                            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700
                        }}>
                            🔍 Manual Review
                        </span>
                    </div>

                    {incomeProofUrl ? (
                        incomeProofIsPdf ? (
                            // PDF — open in new tab
                            <a
                                href={incomeProofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: "flex", alignItems: "center", gap: 12,
                                    background: "#111", border: "1px solid #2a2a2a",
                                    borderRadius: 8, padding: "14px 16px",
                                    textDecoration: "none", cursor: "pointer",
                                    transition: "border-color 0.2s"
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = "#60aaff"}
                                onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2a2a"}>
                                <span style={{ fontSize: 28 }}>📅</span>
                                <div>
                                    <div style={{ color: "#60aaff", fontWeight: 700, fontSize: 14 }}>PDF Document</div>
                                    <div style={{ color: "#555", fontSize: 12, marginTop: 2 }}>Click to open in new tab</div>
                                </div>
                                <span style={{ marginLeft: "auto", color: "#60aaff", fontSize: 18 }}>↗️</span>
                            </a>
                        ) : (
                            // Image — show inline with zoom
                            <div
                                onClick={() => setIncomeProofZoomed(!incomeProofZoomed)}
                                style={{
                                    cursor: "pointer", borderRadius: 8, overflow: "hidden",
                                    border: "1px solid #2a2a2a", background: "#0d0d0d",
                                    position: "relative"
                                }}>
                                <img
                                    src={incomeProofUrl}
                                    alt="Income Proof"
                                    style={{
                                        width: "100%", display: "block",
                                        maxHeight: incomeProofZoomed ? "none" : 200,
                                        objectFit: incomeProofZoomed ? "contain" : "cover",
                                        transition: "max-height 0.3s ease"
                                    }}
                                />
                                <div style={{
                                    position: "absolute", bottom: 8, right: 8,
                                    background: "rgba(0,0,0,0.7)", color: "#aaa",
                                    padding: "3px 8px", borderRadius: 4, fontSize: 11
                                }}>
                                    {incomeProofZoomed ? "🔍 Click to shrink" : "🔍 Click to expand"}
                                </div>
                            </div>
                        )
                    ) : (
                        <div style={{
                            background: "#1a1a1a", borderRadius: 8, padding: "20px",
                            textAlign: "center", color: "#555", fontSize: 13,
                            border: "1px dashed #2a2a2a"
                        }}>
                            ⚠️ No income proof uploaded
                        </div>
                    )}

                    <div style={{
                        background: "#1a1a0d", border: "1px solid #ffd54f33",
                        borderRadius: 8, padding: "10px 14px", marginTop: 12
                    }}>
                        <div style={{ color: "#ffd54f", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                            ⚠️ Verify income document:
                        </div>
                        <ul style={{ color: "#aaa", fontSize: 12, margin: "0", paddingLeft: 18, lineHeight: 1.8 }}>
                            <li>Document should match the declared annual income of ₹{app.annualIncome ? Number(app.annualIncome).toLocaleString("en-IN") : "—"}</li>
                            <li>Accepted: salary slip, ITR, or last 3 months bank statement</li>
                            <li>Verify the name on the document matches the bidder's full name</li>
                        </ul>
                    </div>
                </div>

                {/* Bidding History */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{
                        color: "#60aaff", fontSize: 11, letterSpacing: 1,
                        textTransform: "uppercase", marginBottom: 10, fontWeight: 700
                    }}>
                        Bidding History
                    </div>
                    <div style={{
                        background: hist.bg, border: `1px solid ${hist.color}33`,
                        borderRadius: 8, padding: "10px 14px", marginBottom: 10
                    }}>
                        <span style={{ color: hist.color, fontWeight: 700, fontSize: 14 }}>{hist.label}</span>
                    </div>
                    {app.pastHistoryDetails && (
                        <div style={{
                            background: "#0d0d0d", borderRadius: 8, padding: "10px 14px",
                            color: "#aaa", fontSize: 13, lineHeight: 1.6
                        }}>
                            {app.pastHistoryDetails}
                        </div>
                    )}
                </div>

                {/* Rejection reason if already rejected */}
                {app.status === "REJECTED" && app.rejectionReason && (
                    <div style={{
                        background: "#2a0d0d", border: "1px solid #e5737333",
                        borderRadius: 8, padding: "10px 14px", marginBottom: 20
                    }}>
                        <div style={{ color: "#e57373", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Rejection Reason</div>
                        <div style={{ color: "#aaa", fontSize: 13 }}>{app.rejectionReason}</div>
                    </div>
                )}

                {/* Action buttons — only show if still PENDING */}
                {app.status === "PENDING" && (
                    <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 18 }}>
                        {!rejecting ? (
                            <div style={{ display: "flex", gap: 10 }}>
                                <button onClick={handleApprove} disabled={loading}
                                    style={{
                                        flex: 1, padding: 12, borderRadius: 8, border: "none",
                                        background: "#1a4a1a", color: "#4caf50", cursor: loading ? "not-allowed" : "pointer",
                                        fontWeight: 700, fontSize: 14
                                    }}>
                                    {loading ? "Processing…" : "✓ Approve Bidder"}
                                </button>
                                <button onClick={() => setRejecting(true)} disabled={loading}
                                    style={{
                                        flex: 1, padding: 12, borderRadius: 8, border: "none",
                                        background: "#3a0d0d", color: "#e57373", cursor: "pointer",
                                        fontWeight: 700, fontSize: 14
                                    }}>
                                    ✕ Reject Bidder
                                </button>
                            </div>
                        ) : (
                            <div>
                                <label style={{
                                    display: "block", color: "#888", fontSize: 12,
                                    textTransform: "uppercase", letterSpacing: 1, marginBottom: 8
                                }}>
                                    Rejection Reason
                                </label>
                                <textarea
                                    value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                    placeholder="Explain why this bidder is being rejected…"
                                    style={{
                                        width: "100%", boxSizing: "border-box", background: "#111",
                                        border: "1px solid #2a2a2a", borderRadius: 8, color: "#eee",
                                        padding: "10px 13px", fontSize: 14, outline: "none",
                                        resize: "vertical", minHeight: 80
                                    }} />
                                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                                    <button onClick={() => setRejecting(false)}
                                        style={{
                                            flex: 1, padding: 11, borderRadius: 8, border: "1px solid #2a2a2a",
                                            background: "none", color: "#888", cursor: "pointer"
                                        }}>
                                        Cancel
                                    </button>
                                    <button onClick={handleReject} disabled={loading || !rejectReason.trim()}
                                        style={{
                                            flex: 2, padding: 11, borderRadius: 8, border: "none",
                                            background: rejectReason.trim() ? "#3a0d0d" : "#1a1a1a",
                                            color: rejectReason.trim() ? "#e57373" : "#555",
                                            cursor: rejectReason.trim() && !loading ? "pointer" : "not-allowed",
                                            fontWeight: 700, fontSize: 14
                                        }}>
                                        {loading ? "Processing…" : "Confirm Rejection"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Full-screen image lightbox ── */}
            {imageZoomed && aadhaarImgUrl && (
                <div
                    onClick={() => setImageZoomed(false)}
                    style={{
                        position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        zIndex: 2000, cursor: "zoom-out"
                    }}>
                    <img
                        src={aadhaarImgUrl}
                        alt="Aadhaar Card Full View"
                        style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8 }}
                    />
                    <div style={{
                        position: "absolute", top: 20, right: 20,
                        color: "#fff", fontSize: 28, cursor: "pointer"
                    }}>✕</div>
                </div>
            )}
        </div>
    )
}

// ── Applicant Row Card ────────────────────────────────────────────────────────
function ApplicantRow({ app, onClick }) {
    const sts = STATUS_STYLE[app.status] || STATUS_STYLE.PENDING
    const hist = HISTORY_BADGE[app.pastBiddingHistory] || HISTORY_BADGE.NONE

    return (
        <div onClick={onClick}
            style={{
                background: "#111", border: "1px solid #1e1e1e", borderRadius: 12,
                padding: "16px 20px", cursor: "pointer", transition: "all .15s",
                display: "flex", alignItems: "center", gap: 16
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.background = "#161616" }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e1e1e"; e.currentTarget.style.background = "#111" }}>

            {/* Avatar */}
            <div style={{
                width: 44, height: 44, borderRadius: "50%", background: "#1a1a2e",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, flexShrink: 0
            }}>
                👤
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#eee", fontWeight: 700, fontSize: 15 }}>{app.fullName || "—"}</div>
                <div style={{ color: "#555", fontSize: 12, marginTop: 2 }}>
                    {app.bidder?.email} · Applied {new Date(app.appliedAt).toLocaleDateString("en-IN")}
                </div>
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                <span style={{
                    background: hist.bg, color: hist.color, fontSize: 11,
                    fontWeight: 700, padding: "3px 10px", borderRadius: 20
                }}>
                    {hist.label}
                </span>
                <span style={{
                    background: sts.bg, color: sts.color, fontSize: 11,
                    fontWeight: 700, padding: "3px 10px", borderRadius: 20
                }}>
                    {sts.label}
                </span>
                {app.aadhaarVerified
                    ? <span title="Aadhaar Verified" style={{ color: "#4caf50", fontSize: 16 }}>🪪✓</span>
                    : <span title="Aadhaar Not Verified" style={{ color: "#ff9800", fontSize: 16 }}>🪪⚠</span>}
                <span style={{ color: "#555", fontSize: 18 }}>›</span>
            </div>
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AuctionApplicants() {
    const { auctionId } = useParams()
    const [apps, setApps] = useState([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState(null)
    const [filter, setFilter] = useState("ALL")
    const [error, setError] = useState("")

    const load = async () => {
        setLoading(true)
        setError("")
        try {
            const { data } = await getAuctionApplications(auctionId)
            setApps(data)
        } catch (e) {
            setError(e?.response?.data || "Failed to load applicants.")
        }
        setLoading(false)
    }

    useEffect(() => { load() }, [auctionId])

    const handleApprove = async (id) => {
        try { await approveApplication(id); await load() }
        catch (e) { alert(e?.response?.data || "Failed to approve.") }
    }

    const handleReject = async (id, reason) => {
        try { await rejectApplication(id, reason); await load() }
        catch (e) { alert(e?.response?.data || "Failed to reject.") }
    }

    const filtered = filter === "ALL" ? apps : apps.filter(a => a.status === filter)

    const counts = {
        ALL: apps.length,
        PENDING: apps.filter(a => a.status === "PENDING").length,
        APPROVED: apps.filter(a => a.status === "APPROVED").length,
        REJECTED: apps.filter(a => a.status === "REJECTED").length,
    }

    return (
        <div style={{
            minHeight: "100vh", background: "#0d0d0d", padding: "32px 24px",
            fontFamily: "'Segoe UI', sans-serif"
        }}>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ marginBottom: 28 }}>
                    <h1 style={{ color: "#eee", margin: 0, fontSize: 26, fontWeight: 800 }}>
                        👥 Auction Applicants
                    </h1>
                    <p style={{ color: "#555", margin: "8px 0 0", fontSize: 14 }}>
                        Review bidder applications, check Aadhaar verification status, and approve or reject.
                    </p>
                </div>

                {/* Summary cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                    {[
                        ["Total", counts.ALL, "#60aaff", "#0d1f3a"],
                        ["Pending", counts.PENDING, "#ffd54f", "#1e2a1a"],
                        ["Approved", counts.APPROVED, "#4caf50", "#0d2a0d"],
                        ["Rejected", counts.REJECTED, "#e57373", "#2a0d0d"],
                    ].map(([label, count, color, bg]) => (
                        <div key={label} style={{
                            background: bg, border: `1px solid ${color}22`,
                            borderRadius: 10, padding: "14px 16px", textAlign: "center"
                        }}>
                            <div style={{ color, fontSize: 24, fontWeight: 800 }}>{count}</div>
                            <div style={{ color: "#666", fontSize: 12, marginTop: 2 }}>{label}</div>
                        </div>
                    ))}
                </div>

                {/* Filter tabs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    {["ALL", "PENDING", "APPROVED", "REJECTED"].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            style={{
                                padding: "7px 16px", borderRadius: 20, border: "none",
                                background: filter === f ? "#1e4a8a" : "#1a1a1a",
                                color: filter === f ? "#fff" : "#666",
                                cursor: "pointer", fontSize: 13, fontWeight: filter === f ? 700 : 400
                            }}>
                            {f.charAt(0) + f.slice(1).toLowerCase()} ({counts[f]})
                        </button>
                    ))}
                </div>

                {error && (
                    <div style={{
                        background: "#2a0d0d", border: "1px solid #e57373", borderRadius: 8,
                        padding: "12px 16px", color: "#e57373", marginBottom: 20
                    }}>{error}</div>
                )}

                {loading ? (
                    <div style={{ textAlign: "center", color: "#555", paddingTop: 60 }}>Loading applicants…</div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#555", paddingTop: 60 }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                        <p>{filter === "ALL" ? "No applications yet." : `No ${filter.toLowerCase()} applications.`}</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {filtered.map(app => (
                            <ApplicantRow key={app.id} app={app} onClick={() => setSelected(app)} />
                        ))}
                    </div>
                )}
            </div>

            {selected && (
                <BidderDetailModal
                    app={selected}
                    onClose={() => setSelected(null)}
                    onApprove={handleApprove}
                    onReject={handleReject} />
            )}
        </div>
    )
}