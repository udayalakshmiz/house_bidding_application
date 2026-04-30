import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getMyProperties, createAuction } from "../../services/authService"

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  primaryLight: "#eff6ff",
  accent: "#f59e0b",
  success: "#16a34a",
  error: "#dc2626",
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f8fafc",
  muted: "#94a3b8",
  sectionBg: "#0f172a",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Spinner({ size = 18, color = C.primary }) {
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <circle cx="25" cy="25" r="20" fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round" strokeDasharray="90 60">
        <animateTransform attributeName="transform" type="rotate"
          from="0 25 25" to="360 25 25" dur="0.9s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

function formatINR(v) {
  const n = Number(v)
  if (isNaN(n)) return "₹0"
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(n)
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ icon, title, children }) {
  return (
    <div style={sty.section}>
      <div style={sty.sectionHeader}>
        <span style={sty.sectionIcon}>{icon}</span>
        <span style={sty.sectionTitle}>{title}</span>
      </div>
      <div style={sty.sectionBody}>{children}</div>
    </div>
  )
}

// ─── Field helpers ────────────────────────────────────────────────────────────
function Field({ label, required, children, span }) {
  return (
    <div style={{ ...sty.field, ...(span ? { gridColumn: `span ${span}` } : {}) }}>
      <label style={sty.label}>
        {label} {required && <span style={{ color: C.error }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ ...props }) {
  return <input style={sty.input} {...props} />
}

function Select({ children, ...props }) {
  return (
    <select style={sty.input} {...props}>
      {children}
    </select>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sty = {
  page: {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    paddingBottom: 60,
  },
  topBar: {
    background: C.primary,
    color: "var(--text-main)",
    padding: "16px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 2px 12px rgba(37,99,235,0.3)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  topBarTitle: { fontSize: 20, fontWeight: 800, letterSpacing: -0.3 },
  topBarSub: { fontSize: 13, opacity: 0.85, marginTop: 2 },
  backBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "var(--text-main)",
    borderRadius: 8,
    padding: "8px 16px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  body: { width: "100%", maxWidth: "800px", margin: "0 auto", padding: "28px 40px", boxSizing: "border-box" },
  section: {
    background: C.card,
    borderRadius: 14,
    border: `1px solid ${C.border}`,
    marginBottom: 20,
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },
  sectionHeader: {
    background: C.sectionBg,
    borderBottom: `1px solid ${C.border}`,
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 800, color: C.text },
  sectionBody: {
    padding: 20,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: `1.5px solid ${C.border}`,
    fontSize: 14,
    color: C.text,
    background: "var(--card-bg)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
    fontFamily: "inherit",
  },
  banner: (type) => ({
    padding: "12px 16px", borderRadius: 10, fontWeight: 700, fontSize: 14,
    marginBottom: 16,
    background: type === "error" ? "#fef2f2" : "#f0fdf4",
    color: type === "error" ? C.error : C.success,
    border: `1px solid ${type === "error" ? "#fecaca" : "#bbf7d0"}`,
  }),
  preview: { 
    background: "rgba(37,99,235,0.05)", 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 18, 
    border: `1px solid ${C.border}`,
    gridColumn: "span 2",
    display: "flex",
    gap: 16,
    alignItems: "center"
  },
  submitBtn: {
    background: C.primary,
    color: "var(--text-main)", border: "none", borderRadius: 10,
    padding: "13px 28px", fontWeight: 800, fontSize: 15,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
    boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
    width: "100%",
    justifyContent: "center",
    marginTop: 10
  }
}

export default function CreateAuction() {
  const navigate = useNavigate()

  // approved properties for dropdown
  const [myProperties, setMyProperties] = useState([])
  const [loadingProps, setLoadingProps] = useState(true)
  const [propsError, setPropsError] = useState("")

  // form fields
  const [propertyId, setPropertyId] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [startingBid, setStartingBid] = useState("")
  const [minIncrement, setMinIncrement] = useState("10000")

  // submit state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitSuccess, setSubmitSuccess] = useState("")

  // selected property preview
  const selectedProp = myProperties.find(p => String(p.id) === String(propertyId))

  useEffect(() => {
    getMyProperties()
      .then(res => {
        // only show APPROVED properties that don't have an auction yet
        const approved = (Array.isArray(res.data) ? res.data : [])
          .filter(p => p.status === "APPROVED")
        setMyProperties(approved)
        if (approved.length === 0) {
          setPropsError(
            "No approved properties found. Submit a property and wait for Admin approval before creating an auction.")
        }
      })
      .catch(() => setPropsError("Failed to load your properties."))
      .finally(() => setLoadingProps(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError("")
    setSubmitSuccess("")

    if (!propertyId) return setSubmitError("Please select a property.")
    if (!startTime) return setSubmitError("Please set auction start time.")
    if (!endTime) return setSubmitError("Please set auction end time.")

    const bid = Number(startingBid)
    if (isNaN(bid) || bid <= 0) return setSubmitError("Enter a valid starting bid.")

    const inc = Number(minIncrement)
    if (isNaN(inc) || inc <= 0) return setSubmitError("Enter a valid minimum increment.")

    if (new Date(endTime) <= new Date(startTime)) {
      return setSubmitError("End time must be after start time.")
    }

    setSubmitting(true)
    try {
      await createAuction({
        propertyId: Number(propertyId),
        startTime: startTime.replace("T", "T").slice(0, 19), 
        endTime: endTime.replace("T", "T").slice(0, 19),
        startingBid: bid,
        minIncrement: inc,
      })
      setSubmitSuccess("🎉 Auction created successfully! Bidders can now register.")
      setTimeout(() => navigate("/auctioneer/dashboard", { state: { tab: "auctions" } }), 2500)
    } catch (err) {
      setSubmitError(
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        "Failed to create auction.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={sty.page}>
      {/* Top Bar */}
      <div style={sty.topBar}>
        <div>
          <div style={sty.topBarTitle}>🔨 Create Auction</div>
          <div style={sty.topBarSub}>Set up an auction for your approved property</div>
        </div>
        <button style={sty.backBtn} onClick={() => navigate("/auctioneer/dashboard")}>
          ← Back
        </button>
      </div>

      <div style={sty.body}>
        {submitError && <div style={sty.banner("error")}>{submitError}</div>}
        {submitSuccess && <div style={sty.banner("success")}>{submitSuccess}</div>}

        {loadingProps ? (
          <div style={sty.section}>
            <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
              <Spinner size={30} />
              <p style={{ marginTop: 10, fontWeight: 600 }}>Loading approved properties...</p>
            </div>
          </div>
        ) : propsError && myProperties.length === 0 ? (
          <div style={sty.banner("error")}>⚠️ {propsError}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            
            <Section icon="🏠" title="Step 1 — Select Property">
              <Field label="Choose Approved Property" required span={2}>
                <Select
                  value={propertyId}
                  onChange={e => {
                    setPropertyId(e.target.value)
                    const prop = myProperties.find(p => String(p.id) === e.target.value)
                    if (prop) setStartingBid(String(prop.startingPrice || ""))
                  }}
                  required
                >
                  <option value="">-- Select a property --</option>
                  {myProperties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} — {p.city || p.location} — {formatINR(p.startingPrice)}
                    </option>
                  ))}
                </Select>
              </Field>

              {selectedProp && (
                <div style={sty.preview}>
                  {selectedProp.imageUrl && (
                    <img
                      src={`http://localhost:8081${selectedProp.imageUrl}`}
                      alt={selectedProp.title}
                      style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}` }}
                      onError={e => { e.target.style.display = "none" }}
                    />
                  )}
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: C.text }}>{selectedProp.title}</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>📍 {selectedProp.address || selectedProp.city || selectedProp.location}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.primary, marginTop: 6 }}>
                      Base Price: {formatINR(selectedProp.startingPrice)}
                    </div>
                  </div>
                </div>
              )}
            </Section>

            <Section icon="🗓️" title="Step 2 — Auction Timing">
              <Field label="Start Date & Time" required>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  required
                  min={new Date().toISOString().slice(0, 16)}
                />
              </Field>
              <Field label="End Date & Time" required>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  required
                  min={startTime || new Date().toISOString().slice(0, 16)}
                />
              </Field>
              {startTime && endTime && new Date(endTime) > new Date(startTime) && (
                <div style={{ gridColumn: "span 2", fontSize: 13, color: C.success, fontWeight: 700, marginTop: 4 }}>
                  ✅ Duration: {Math.round((new Date(endTime) - new Date(startTime)) / 3600000)} hour(s)
                </div>
              )}
            </Section>

            <Section icon="💰" title="Step 3 — Bidding Rules">
              <Field label="Starting Bid Price (₹)" required>
                <Input
                  type="number"
                  value={startingBid}
                  onChange={e => setStartingBid(e.target.value)}
                  placeholder="e.g. 5000000"
                  min="1"
                  required
                />
              </Field>
              <Field label="Min Bid Increment (₹)" required>
                <Input
                  type="number"
                  value={minIncrement}
                  onChange={e => setMinIncrement(e.target.value)}
                  placeholder="e.g. 10000"
                  min="1"
                  required
                />
              </Field>
            </Section>

            <button
              type="submit"
              style={sty.submitBtn}
              disabled={submitting}
            >
              {submitting ? <><Spinner size={16} color="#fff" /> Creating...</> : "🔨 Create Auction"}
            </button>

          </form>
        )}
      </div>
    </div>
  )
}