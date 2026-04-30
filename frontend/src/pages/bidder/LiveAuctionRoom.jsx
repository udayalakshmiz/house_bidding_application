import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import SockJS from "sockjs-client"
import { Client } from "@stomp/stompjs"
import { getAuctionRoomState } from "../../services/authService"

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`

function pad(n) { return String(Math.floor(n)).padStart(2, "0") }

function CountdownTimer({ endTime, onExpire }) {
    const [secs, setSecs] = useState(0)

    useEffect(() => {
        const calc = () => {
            const diff = Math.max(0,
                Math.floor((new Date(endTime) - Date.now()) / 1000))
            setSecs(diff)
            if (diff === 0) onExpire?.()
        }
        calc()
        const id = setInterval(calc, 1000)
        return () => clearInterval(id)
    }, [endTime])

    const h = pad(secs / 3600)
    const m = pad((secs % 3600) / 60)
    const s = pad(secs % 60)
    const urgent = secs < 60

    return (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {[[h, "HRS"], [m, "MIN"], [s, "SEC"]].map(([val, lbl]) => (
                <div key={lbl} style={{ textAlign: "center" }}>
                    <div style={{
                        background: urgent ? "#3a0f0f" : "#0f1f0f",
                        border: `1px solid ${urgent ? "#c62828" : "#1b5e20"}`,
                        borderRadius: 8, padding: "6px 12px",
                        fontSize: 22, fontWeight: 800, fontFamily: "monospace",
                        color: urgent ? "#ef5350" : "#66bb6a",
                        minWidth: 48, textAlign: "center"
                    }}>{val}</div>
                    <div style={{
                        fontSize: 9, color: "#555", marginTop: 3,
                        letterSpacing: 1
                    }}>{lbl}</div>
                </div>
            ))}
        </div>
    )
}

function BidRow({ bid, index }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", borderRadius: 8,
            background: index === 0 ? "#0b2a14" : "#0d0d0d",
            border: `1px solid ${index === 0 ? "#2e7d32" : "#1a1a1a"}`,
            marginBottom: 6, animation: index === 0 ? "slideIn .3s ease" : "none"
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: index === 0 ? "#1b5e20" : "#1a1a2e",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700,
                    color: index === 0 ? "#a5d6a7" : "#7986cb"
                }}>
                    {bid.bidderName?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                    <div style={{ color: "#ccc", fontSize: 13, fontWeight: 600 }}>
                        {index === 0 && "👑 "}{bid.bidderName || "Anonymous"}
                    </div>
                    <div style={{ color: "#444", fontSize: 11 }}>
                        {bid.timestamp
                            ? new Date(bid.timestamp).toLocaleTimeString("en-IN")
                            : "just now"}
                    </div>
                </div>
            </div>
            <div style={{
                color: index === 0 ? "#66bb6a" : "#888",
                fontSize: index === 0 ? 16 : 14, fontWeight: 700
            }}>
                {fmt(bid.amount)}
            </div>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LiveAuctionRoom() {
    const { auctionId } = useParams()
    const navigate = useNavigate()

    // auction state
    const [auction, setAuction] = useState(null)
    const [loading, setLoading] = useState(true)
    const [ended, setEnded] = useState(false)

    // bidding state
    const [bids, setBids] = useState([])
    const [currentBid, setCurrentBid] = useState(0)
    const [endTime, setEndTime] = useState(null)
    const [bidInput, setBidInput] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [connected, setConnected] = useState(false)
    const [statusMsg, setStatusMsg] = useState("Connecting…")

    const clientRef = useRef(null)
    const token = sessionStorage.getItem("token") || localStorage.getItem("token")

    // ── Load initial auction state ────────────────────────────────────────
    useEffect(() => {
        getAuctionRoomState(auctionId)
            .then(({ data }) => {
                const auc = data.auction || data // fallback just in case backend takes time to reload
                setAuction(auc)
                setCurrentBid(auc.currentBid || auc.startingBid)
                setEndTime(auc.endTime)
                if (auc.status === "COMPLETED" || auc.status === "CANCELLED") {
                    setEnded(true)
                }
                if (data.bidHistory) {
                    setBids(data.bidHistory)
                }
            })
            .catch(() => navigate("/bidder/auctions"))
            .finally(() => setLoading(false))
    }, [auctionId])

    // ── WebSocket connection ──────────────────────────────────────────────
    useEffect(() => {
        const role = sessionStorage.getItem("role")
if (!role) { navigate("/login"); return }

        const client = new Client({
            webSocketFactory: () =>
                new SockJS("http://localhost:8081/ws-auction"),

            connectHeaders: {
                Authorization: token ? `Bearer ${token}` : "",
            },

            onConnect: () => {
                setConnected(true)
                setStatusMsg("Live")

                // Subscribe to this auction's topic
                client.subscribe(
                    `/topic/auction/${auctionId}`,
                    (frame) => {
                        const msg = JSON.parse(frame.body)
                        handleMessage(msg)
                    }
                )
            },

            onDisconnect: () => {
                setConnected(false)
                setStatusMsg("Disconnected — reconnecting…")
            },

            onStompError: () => {
                setStatusMsg("Connection error")
            },

            reconnectDelay: 3000,   // auto-reconnect every 3s
        })

        client.activate()
        clientRef.current = client

        return () => { client.deactivate() }
    }, [auctionId, token])

    // ── Handle incoming messages ──────────────────────────────────────────
    const handleMessage = useCallback((msg) => {
        if (msg.type === "BID") {
            setBids(prev => [{
                bidderName: msg.bidderName,
                amount: msg.amount,
                timestamp: msg.timestamp
            }, ...prev].slice(0, 50))   // keep last 50 bids
            setCurrentBid(msg.newCurrentBid)
            if (msg.remainingSeconds) {
                const newEnd = new Date(Date.now() +
                    msg.remainingSeconds * 1000).toISOString()
                setEndTime(newEnd)
            }
            setError("")
        }

        if (msg.type === "ERROR") {
            setError(msg.message)
            setSubmitting(false)
        }

        if (msg.type === "AUCTION_END") {
            setEnded(true)
        }
    }, [])

    // ── Place bid ─────────────────────────────────────────────────────────
    const placeBid = () => {
        const amount = parseFloat(bidInput)
        const minBid = currentBid + (auction?.minIncrement || 0)

        if (!amount || amount < minBid) {
            setError(`Minimum bid is ${fmt(minBid)}`)
            return
        }

        if (!clientRef.current?.connected) {
            setError("Not connected. Please wait…")
            return
        }

        setSubmitting(true)
        setError("")

        clientRef.current.publish({
            destination: "/app/bid",
            headers: {
                Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify({ auctionId: Number(auctionId), amount })
        })

        setBidInput("")
        setTimeout(() => setSubmitting(false), 1000)
    }

    // ── Render ────────────────────────────────────────────────────────────
    if (loading) return (
        <div style={{
            minHeight: "100vh", background: "#080808",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#555", fontFamily: "'Segoe UI', sans-serif"
        }}>
            Loading auction room…
        </div>
    )

    const prop = auction?.property || {}
    const minNext = currentBid + (auction?.minIncrement || 0)

    return (
        <div style={{
            minHeight: "100vh", background: "#080808",
            fontFamily: "'Segoe UI', sans-serif", color: "#eee"
        }}>

            {/* ── Top bar ─────────────────────────────────────────────── */}
            <div style={{
                background: "#0d0d0d", borderBottom: "1px solid #1a1a1a",
                padding: "12px 24px", display: "flex",
                alignItems: "center", justifyContent: "space-between"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={() => navigate("/bidder/auctions")}
                        style={{
                            background: "none", border: "1px solid #222",
                            borderRadius: 8, color: "#888", cursor: "pointer",
                            padding: "6px 12px", fontSize: 13
                        }}>← Back</button>
                    <span style={{ color: "#eee", fontWeight: 700, fontSize: 16 }}>
                        {prop.title || "Live Auction"}
                    </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: connected ? "#4caf50" : "#ef5350",
                        boxShadow: connected
                            ? "0 0 6px #4caf50" : "0 0 6px #ef5350"
                    }} />
                    <span style={{
                        fontSize: 12,
                        color: connected ? "#4caf50" : "#ef5350"
                    }}>
                        {statusMsg}
                    </span>
                </div>
            </div>

            {/* ── Body ────────────────────────────────────────────────── */}
            <div style={{
                maxWidth: 1100, margin: "0 auto", padding: "28px 24px",
                display: "grid",
                gridTemplateColumns: "1fr 360px",
                gap: 24
            }}>

                {/* ── Left column ─────────────────────────────────────── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                    {/* Current bid hero */}
                    <div style={{
                        background: "#0d0d0d", border: "1px solid #1a1a1a",
                        borderRadius: 16, padding: 28
                    }}>
                        <div style={{
                            color: "#555", fontSize: 12,
                            textTransform: "uppercase", letterSpacing: 1,
                            marginBottom: 6
                        }}>Current Highest Bid</div>
                        <div style={{
                            fontSize: 44, fontWeight: 800,
                            color: "#66bb6a", lineHeight: 1
                        }}>
                            {fmt(currentBid)}
                        </div>
                        <div style={{
                            marginTop: 8, color: "#555", fontSize: 13
                        }}>
                            Starting bid: {fmt(auction?.startingBid)} &nbsp;·&nbsp;
                            Min increment: {fmt(auction?.minIncrement)}
                        </div>
                    </div>

                    {/* Timer */}
                    <div style={{
                        background: "#0d0d0d", border: "1px solid #1a1a1a",
                        borderRadius: 16, padding: "20px 28px",
                        display: "flex", alignItems: "center",
                        justifyContent: "space-between"
                    }}>
                        <div>
                            <div style={{
                                color: "#555", fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: 1, marginBottom: 8
                            }}>
                                Time Remaining
                            </div>
                            {ended ? (
                                <div style={{
                                    fontSize: 20, color: "#ef5350",
                                    fontWeight: 700
                                }}>
                                    Auction Ended
                                </div>
                            ) : endTime ? (
                                <CountdownTimer
                                    endTime={endTime}
                                    onExpire={() => setEnded(true)} />
                            ) : (
                                <div style={{ color: "#555" }}>—</div>
                            )}
                        </div>
                        <div style={{
                            background: ended ? "#3a0f0f" : "#0b2a14",
                            border: `1px solid ${ended ? "#c62828" : "#2e7d32"}`,
                            borderRadius: 20, padding: "4px 16px",
                            fontSize: 13, fontWeight: 700,
                            color: ended ? "#ef5350" : "#66bb6a"
                        }}>
                            {ended ? "ENDED" : "LIVE"}
                        </div>
                    </div>

                    {/* Bid input */}
                    {!ended && (
                        <div style={{
                            background: "#0d0d0d", border: "1px solid #1a1a1a",
                            borderRadius: 16, padding: 24
                        }}>
                            <div style={{
                                color: "#888", fontSize: 13,
                                marginBottom: 12
                            }}>
                                Place your bid — minimum{" "}
                                <span style={{
                                    color: "#66bb6a",
                                    fontWeight: 700
                                }}>{fmt(minNext)}</span>
                            </div>

                            <div style={{ display: "flex", gap: 10 }}>
                                <div style={{ position: "relative", flex: 1 }}>
                                    <span style={{
                                        position: "absolute", left: 14, top: "50%",
                                        transform: "translateY(-50%)",
                                        color: "#555", fontSize: 15
                                    }}>₹</span>
                                    <input
                                        type="number"
                                        value={bidInput}
                                        onChange={e => setBidInput(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && placeBid()}
                                        placeholder={minNext.toLocaleString("en-IN")}
                                        disabled={submitting || !connected}
                                        style={{
                                            width: "100%", padding: "13px 14px 13px 28px",
                                            background: "#111", border: "1px solid #222",
                                            borderRadius: 10, color: "#eee", fontSize: 16,
                                            outline: "none", boxSizing: "border-box"
                                        }} />
                                </div>
                                <button
                                    onClick={placeBid}
                                    disabled={submitting || !connected || ended}
                                    style={{
                                        padding: "13px 24px", borderRadius: 10, border: "none",
                                        background: submitting || !connected
                                            ? "#1a1a1a"
                                            : "linear-gradient(135deg, #1b5e20, #2e7d32)",
                                        color: submitting || !connected ? "#555" : "#fff",
                                        cursor: submitting || !connected
                                            ? "not-allowed" : "pointer",
                                        fontSize: 15, fontWeight: 700,
                                        whiteSpace: "nowrap"
                                    }}>
                                    {submitting ? "Sending…" : "Place Bid"}
                                </button>
                            </div>

                            {error && (
                                <div style={{
                                    marginTop: 10, padding: "10px 14px",
                                    background: "#2a0d0d",
                                    border: "1px solid #c62828",
                                    borderRadius: 8, color: "#ef5350", fontSize: 13
                                }}>
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {ended && (
                        <div style={{
                            background: "#1a0a0a",
                            border: "1px solid #c62828",
                            borderRadius: 16, padding: 28,
                            textAlign: "center"
                        }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>🏁</div>
                            <div style={{
                                fontSize: 20, fontWeight: 700,
                                color: "#ef5350"
                            }}>
                                Auction Closed
                            </div>
                            <div style={{ color: "#666", marginTop: 6, fontSize: 14 }}>
                                Final bid: {fmt(currentBid)}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Right column — bid history ───────────────────────── */}
                <div style={{
                    background: "#0d0d0d", border: "1px solid #1a1a1a",
                    borderRadius: 16, padding: 20,
                    display: "flex", flexDirection: "column",
                    maxHeight: "calc(100vh - 140px)", overflow: "hidden"
                }}>
                    <div style={{
                        display: "flex", alignItems: "center",
                        justifyContent: "space-between", marginBottom: 16
                    }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>
                            Bid History
                        </div>
                        <div style={{
                            background: "#111", borderRadius: 12,
                            padding: "3px 10px", fontSize: 12, color: "#555"
                        }}>
                            {bids.length} bids
                        </div>
                    </div>

                    <div style={{ overflowY: "auto", flex: 1 }}>
                        {bids.length === 0 ? (
                            <div style={{
                                textAlign: "center", color: "#333",
                                paddingTop: 40, fontSize: 13
                            }}>
                                No bids yet. Be the first!
                            </div>
                        ) : (
                            bids.map((b, i) => (
                                <BidRow key={i} bid={b} index={i} />
                            ))
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}