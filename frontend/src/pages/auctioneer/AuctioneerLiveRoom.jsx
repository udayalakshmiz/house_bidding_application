import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import SockJS from "sockjs-client"
import { Client } from "@stomp/stompjs"
import { getAuctionRoomState } from "../../services/authService"

const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`
function pad(n) { return String(Math.floor(n)).padStart(2, "0") }

function CountdownTimer({ endTime, onExpire }) {
    const [secs, setSecs] = useState(0)
    useEffect(() => {
        const calc = () => {
            const diff = Math.max(0, Math.floor((new Date(endTime) - Date.now()) / 1000))
            setSecs(diff)
            if (diff === 0) onExpire?.()
        }
        calc()
        const id = setInterval(calc, 1000)
        return () => clearInterval(id)
    }, [endTime])
    const urgent = secs < 60
    return (
        <div style={{ display: "flex", gap: 8 }}>
            {[[pad(secs / 3600), "HRS"], [pad((secs % 3600) / 60), "MIN"], [pad(secs % 60), "SEC"]].map(([v, l]) => (
                <div key={l} style={{ textAlign: "center" }}>
                    <div style={{
                        background: urgent ? "#3a0f0f" : "#0f1f0f",
                        border: `1px solid ${urgent ? "#c62828" : "#1b5e20"}`,
                        borderRadius: 8, padding: "6px 12px",
                        fontSize: 22, fontWeight: 800, fontFamily: "monospace",
                        color: urgent ? "#ef5350" : "#66bb6a", minWidth: 48,
                        textAlign: "center"
                    }}>{v}</div>
                    <div style={{ fontSize: 9, color: "#555", marginTop: 3, letterSpacing: 1 }}>{l}</div>
                </div>
            ))}
        </div>
    )
}

export default function AuctioneerLiveRoom() {
    const { auctionId } = useParams()
    const navigate = useNavigate()

    const [auction, setAuction] = useState(null)
    const [loading, setLoading] = useState(true)
    const [ended, setEnded] = useState(false)
    const [bids, setBids] = useState([])
    const [currentBid, setCurrentBid] = useState(0)
    const [endTime, setEndTime] = useState(null)
    const [connected, setConnected] = useState(false)
    const [statusMsg, setStatusMsg] = useState("Connecting…")

    const clientRef = useRef(null)

    useEffect(() => {
        getAuctionRoomState(auctionId)
            .then(({ data }) => {
                const auc = data.auction || data
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
            .catch(() => navigate("/auctioneer/dashboard"))
            .finally(() => setLoading(false))
    }, [auctionId])

    const handleMessage = useCallback((msg) => {
        if (msg.type === "BID") {
            setBids(prev => [{
                bidderName: msg.bidderName,
                amount: msg.amount,
                timestamp: msg.timestamp
            }, ...prev].slice(0, 50))
            setCurrentBid(msg.newCurrentBid)
            if (msg.remainingSeconds) {
                setEndTime(new Date(Date.now() +
                    msg.remainingSeconds * 1000).toISOString())
            }
        }
        if (msg.type === "AUCTION_END") setEnded(true)
    }, [])

    useEffect(() => {
        const role = sessionStorage.getItem("role")
        if (!role) { navigate("/login"); return }

        const client = new Client({
            webSocketFactory: () =>
                new SockJS("http://localhost:8081/ws-auction"),
            connectHeaders: {},
            onConnect: () => {
                setConnected(true)
                setStatusMsg("Live — Watch Only")
                client.subscribe(`/topic/auction/${auctionId}`, (frame) => {
                    handleMessage(JSON.parse(frame.body))
                })
            },
            onDisconnect: () => {
                setConnected(false)
                setStatusMsg("Disconnected — reconnecting…")
            },
            reconnectDelay: 3000,
        })

        client.activate()
        clientRef.current = client
        return () => { client.deactivate() }
    }, [auctionId])

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

    return (
        <div style={{ minHeight: "100vh", background: "#080808", fontFamily: "'Segoe UI', sans-serif", color: "#eee" }}>

            {/* Top bar */}
            <div style={{
                background: "#0d0d0d", borderBottom: "1px solid #1a1a1a",
                padding: "12px 24px", display: "flex",
                alignItems: "center", justifyContent: "space-between"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={() => navigate("/auctioneer/dashboard")}
                        style={{
                            background: "none", border: "1px solid #222",
                            borderRadius: 8, color: "#888", cursor: "pointer",
                            padding: "6px 12px", fontSize: 13
                        }}>← Back</button>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>
                        {prop.title || "Live Auction"}</span>
                    <span style={{
                        background: "#0b2a14", color: "#66bb6a",
                        border: "1px solid #2e7d32", borderRadius: 12,
                        padding: "3px 12px", fontSize: 12, fontWeight: 700
                    }}>
                        👁 Watch Only
                    </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: connected ? "#4caf50" : "#ef5350",
                        boxShadow: `0 0 6px ${connected ? "#4caf50" : "#ef5350"}`
                    }} />
                    <span style={{ fontSize: 12, color: connected ? "#4caf50" : "#ef5350" }}>
                        {statusMsg}
                    </span>
                </div>
            </div>

            <div style={{
                maxWidth: 1100, margin: "0 auto", padding: "28px 24px",
                display: "grid", gridTemplateColumns: "1fr 360px", gap: 24
            }}>

                {/* Left column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                    {/* Current bid */}
                    <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 16, padding: 28 }}>
                        <div style={{ color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                            Current Highest Bid
                        </div>
                        <div style={{ fontSize: 44, fontWeight: 800, color: "#66bb6a", lineHeight: 1 }}>
                            {fmt(currentBid)}
                        </div>
                        <div style={{ marginTop: 8, color: "#555", fontSize: 13 }}>
                            Starting bid: {fmt(auction?.startingBid)} &nbsp;·&nbsp;
                            Min increment: {fmt(auction?.minIncrement)}
                        </div>
                    </div>

                    {/* Timer */}
                    <div style={{
                        background: "#0d0d0d", border: "1px solid #1a1a1a",
                        borderRadius: 16, padding: "20px 28px",
                        display: "flex", alignItems: "center", justifyContent: "space-between"
                    }}>
                        <div>
                            <div style={{ color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                                Time Remaining
                            </div>
                            {ended ? (
                                <div style={{ fontSize: 20, color: "#ef5350", fontWeight: 700 }}>Auction Ended</div>
                            ) : endTime ? (
                                <CountdownTimer endTime={endTime} onExpire={() => setEnded(true)} />
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

                    {/* Stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {[
                            ["Total Bids", bids.length],
                            ["Unique Bidders", new Set(bids.map(b => b.bidderName)).size],
                        ].map(([label, val]) => (
                            <div key={label} style={{
                                background: "#0d0d0d", border: "1px solid #1a1a1a",
                                borderRadius: 12, padding: 20, textAlign: "center"
                            }}>
                                <div style={{ color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                                <div style={{ fontSize: 32, fontWeight: 800, color: "#eee", marginTop: 6 }}>{val}</div>
                            </div>
                        ))}
                    </div>

                    {/* Winner banner */}
                    {ended && (
                        <div style={{
                            background: "#0b2a14", border: "1px solid #2e7d32",
                            borderRadius: 16, padding: 24, textAlign: "center"
                        }}>
                            <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#66bb6a" }}>Auction Completed</div>
                            <div style={{ color: "#555", marginTop: 6 }}>Final bid: {fmt(currentBid)}</div>
                            {bids[0] && (
                                <div style={{ color: "#a5d6a7", marginTop: 4, fontWeight: 700 }}>
                                    Winner: {bids[0].bidderName}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right — bid feed */}
                <div style={{
                    background: "#0d0d0d", border: "1px solid #1a1a1a",
                    borderRadius: 16, padding: 20,
                    display: "flex", flexDirection: "column",
                    maxHeight: "calc(100vh - 140px)", overflow: "hidden"
                }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>Live Bid Feed</div>
                        <div style={{ background: "#111", borderRadius: 12, padding: "3px 10px", fontSize: 12, color: "#555" }}>
                            {bids.length} bids
                        </div>
                    </div>
                    <div style={{ overflowY: "auto", flex: 1 }}>
                        {bids.length === 0 ? (
                            <div style={{ textAlign: "center", color: "#333", paddingTop: 40, fontSize: 13 }}>
                                Waiting for first bid…
                            </div>
                        ) : bids.map((b, i) => (
                            <div key={i} style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "10px 14px", borderRadius: 8,
                                background: i === 0 ? "#0b2a14" : "#0d0d0d",
                                border: `1px solid ${i === 0 ? "#2e7d32" : "#1a1a1a"}`,
                                marginBottom: 6
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: "50%",
                                        background: i === 0 ? "#1b5e20" : "#1a1a2e",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 13, fontWeight: 700,
                                        color: i === 0 ? "#a5d6a7" : "#7986cb"
                                    }}>
                                        {b.bidderName?.[0]?.toUpperCase() || "?"}
                                    </div>
                                    <div>
                                        <div style={{ color: "#ccc", fontSize: 13, fontWeight: 600 }}>
                                            {i === 0 && "👑 "}{b.bidderName}
                                        </div>
                                        <div style={{ color: "#444", fontSize: 11 }}>
                                            {b.timestamp
                                                ? new Date(b.timestamp).toLocaleTimeString("en-IN")
                                                : "just now"}
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    color: i === 0 ? "#66bb6a" : "#888",
                                    fontSize: i === 0 ? 16 : 14,
                                    fontWeight: 700
                                }}>
                                    {fmt(b.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(76,175,80,0.4); }
                    50% { box-shadow: 0 0 0 8px rgba(76,175,80,0); }
                }
            `}</style>
        </div>
    )
}
