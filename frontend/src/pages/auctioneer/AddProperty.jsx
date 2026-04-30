import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { createProperty } from "../../services/authService"

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  primary: "var(--dash-accent)",
  primaryDark: "var(--dash-accent-dark)",
  primaryLight: "var(--dash-accent-light)",
  accent: "#f59e0b",
  success: "rgba(34, 197, 94, 0.9)",
  error: "rgba(239, 68, 68, 0.9)",
  bg: "var(--dash-bg)",
  card: "var(--dash-surface)",
  border: "var(--dash-border)",
  text: "var(--dash-text)",
  muted: "var(--dash-muted)",
  sectionBg: "var(--dash-bg)",
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

const PROPERTY_TYPES = ["Apartment", "Independent House", "Villa", "Land", "Commercial"]
const PROPERTY_CATEGORIES = ["Sale", "Rent", "Auction"]
const FURNISHING_TYPES = ["Furnished", "Semi-Furnished", "Unfurnished"]
const PROPERTY_STATUSES = ["Ready to Move", "Under Construction"]
const AVAILABILITY_STATUSES = ["Available", "Sold", "Pending"]
const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi", "Jammu & Kashmir", "Ladakh",
]
const AMENITIES = [
  { key: "waterSupply", label: "💧 Water Supply" },
  { key: "electricity", label: "⚡ Electricity" },
  { key: "lift", label: "🛗 Lift" },
  { key: "security", label: "🔒 Security" },
  { key: "garden", label: "🌳 Garden / Park" },
  { key: "swimmingPool", label: "🏊 Swimming Pool" },
  { key: "gym", label: "🏋️ Gym" },
  { key: "powerBackup", label: "🔋 Power Backup" },
  { key: "internet", label: "📶 Internet / WiFi" },
]

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

function Textarea({ ...props }) {
  return <textarea style={{ ...sty.input, minHeight: 100, resize: "vertical" }} {...props} />
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
  body: { width: "100%", maxWidth: "100%", margin: "0 auto", padding: "28px 40px", boxSizing: "border-box" },
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
  checkGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    gridColumn: "span 2",
  },
  checkItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 8,
    border: `1.5px solid ${C.border}`,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    color: C.text,
    userSelect: "none",
    transition: "all 0.15s",
  },
  suggestBox: {
    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
    background: "var(--card-bg)", border: `1px solid ${C.border}`,
    borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    maxHeight: 220, overflowY: "auto", marginTop: 2,
  },
  suggestItem: {
    padding: "10px 14px", cursor: "pointer", fontSize: 13,
    borderBottom: `1px solid ${C.sectionBg}`, color: C.text,
  },
  mapBox: {
    height: 280, borderRadius: 10, overflow: "hidden",
    border: `1.5px solid ${C.border}`, marginTop: 6,
    gridColumn: "span 2",
  },
  coordsRow: {
    gridColumn: "span 2",
    display: "flex", gap: 10, flexWrap: "wrap",
    fontSize: 12, color: C.muted, fontWeight: 700,
  },
  coordPill: {
    background: C.primaryLight, color: C.primary,
    padding: "4px 10px", borderRadius: 999, fontWeight: 800, fontSize: 12,
  },
  banner: (type) => ({
    padding: "12px 16px", borderRadius: 10, fontWeight: 700, fontSize: 14,
    marginBottom: 16,
    background: type === "error" ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
    color: type === "error" ? C.error : C.success,
    border: `1px solid ${type === "error" ? "rgba(239, 68, 68, 0.3)" : "rgba(34, 197, 94, 0.3)"}`,
  }),
  submitBar: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    padding: "20px 24px",
    display: "flex",
    alignItems: "center",
    gap: 14,
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
  },
  submitBtn: {
    background: C.primary,
    color: "var(--dash-text)", border: "none", borderRadius: 10,
    padding: "13px 28px", fontWeight: 800, fontSize: 15,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
  },
  clearBtn: {
    background: C.sectionBg, color: C.muted,
    border: "none", borderRadius: 10,
    padding: "13px 20px", fontWeight: 700, fontSize: 14,
    cursor: "pointer",
  },
  fileInput: {
    padding: "8px 12px", borderRadius: 8,
    border: `1.5px dashed ${C.border}`,
    fontSize: 13, color: C.muted,
    background: C.sectionBg, width: "100%", boxSizing: "border-box",
    cursor: "pointer",
  },
  hint: { fontSize: 11, color: C.muted, marginTop: 3 },
  radioGroup: { display: "flex", gap: 10, flexWrap: "wrap" },
  radioBtn: (active) => ({
    padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700,
    cursor: "pointer", border: `1.5px solid ${active ? C.primary : C.border}`,
    background: active ? C.primaryLight : "transparent",
    color: active ? C.primary : C.muted,
    transition: "all 0.15s",
  }),
  progressBar: {
    height: 4, background: C.border, borderRadius: 2,
    marginBottom: 24, overflow: "hidden",
  },
  progressFill: (pct) => ({
    height: "100%", background: C.primary,
    width: `${pct}%`, borderRadius: 2,
    transition: "width 0.4s ease",
  }),
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AddProperty() {
  const navigate = useNavigate()

  // 1. Basic
  const [title, setTitle] = useState("")
  const [propertyType, setPropertyType] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [totalArea, setTotalArea] = useState("")
  const [builtUpArea, setBuiltUpArea] = useState("")

  // 2. Location
  const [addressLine1, setAddressLine1] = useState("")
  const [addressLine2, setAddressLine2] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [pincode, setPincode] = useState("")
  const [landmark, setLandmark] = useState("")
  const [addressQuery, setAddressQuery] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [searchingAddress, setSearchingAddress] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState("")
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)

  // 3. Specs
  const [bedrooms, setBedrooms] = useState("")
  const [bathrooms, setBathrooms] = useState("")
  const [floors, setFloors] = useState("")
  const [floorNumber, setFloorNumber] = useState("")
  const [parking, setParking] = useState("")
  const [furnishing, setFurnishing] = useState("")
  const [propertyAge, setPropertyAge] = useState("")

  // 4. Pricing
  const [expectedPrice, setExpectedPrice] = useState("")
  const [startingBid, setStartingBid] = useState("")
  const [reservePrice, setReservePrice] = useState("")
  const [negotiable, setNegotiable] = useState("")


  // 5. Files
  const [imageFiles, setImageFiles] = useState([])
  const [videoFile, setVideoFile] = useState(null)
  const [ownershipDoc, setOwnershipDoc] = useState(null)
  const [regCert, setRegCert] = useState(null)
  const [legalDoc, setLegalDoc] = useState(null)

  // 6. Owner
  const [ownerName, setOwnerName] = useState("")
  const [ownerEmail, setOwnerEmail] = useState("")
  const [ownerPhone, setOwnerPhone] = useState("")
  const [ownerAltPhone, setOwnerAltPhone] = useState("")
  const [ownerAddress, setOwnerAddress] = useState("")

  // 7. Amenities
  const [amenities, setAmenities] = useState({
    waterSupply: false, electricity: false, lift: false,
    security: false, garden: false, swimmingPool: false,
    gym: false, powerBackup: false, internet: false,
  })

  // 8. Additional
  const [availabilityStatus, setAvailabilityStatus] = useState("")
  const [propertyStatus, setPropertyStatus] = useState("")

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitSuccess, setSubmitSuccess] = useState("")

  // Map refs
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const searchTimeout = useRef(null)

  // ── Load Leaflet ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.id = "leaflet-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }
    if (!window.L) {
      const script = document.createElement("script")
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      script.async = true
      document.head.appendChild(script)
    }
  }, [])

  // ── Init/update map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!latitude || !longitude) return
    const init = () => {
      if (!window.L || !mapRef.current) return
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = window.L.map(mapRef.current).setView([latitude, longitude], 16)
        window.L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
          attribution: "&copy; Google Maps",
        }).addTo(mapInstanceRef.current)
      } else {
        mapInstanceRef.current.setView([latitude, longitude], 16)
      }
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude])
      } else {
        markerRef.current = window.L.marker([latitude, longitude])
          .addTo(mapInstanceRef.current)
          .bindPopup(selectedAddress || "Property Location")
          .openPopup()
      }
    }
    if (window.L) init()
    else {
      const iv = setInterval(() => { if (window.L) { clearInterval(iv); init() } }, 200)
    }
  }, [latitude, longitude])

  // ── Address search ──────────────────────────────────────────────────────────
  const handleAddressInput = (val) => {
    setAddressQuery(val)
    setSuggestions([])
    clearTimeout(searchTimeout.current)
    if (val.trim().length < 3) return
    setSearchingAddress(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=8&countrycodes=in`,
          { headers: { "Accept-Language": "en" } }
        )
        const data = await res.json()
        setSuggestions(data)
      } catch { setSuggestions([]) }
      finally { setSearchingAddress(false) }
    }, 500)
  }

  const handleSelectSuggestion = (place) => {
    const addr = place.display_name
    const lat = parseFloat(place.lat)
    const lng = parseFloat(place.lon)
    setAddressQuery(addr)
    setSelectedAddress(addr)
    setLatitude(lat)
    setLongitude(lng)
    setSuggestions([])
    // auto-fill fields
    if (!city) setCity(place.address?.city || place.address?.town || place.address?.village || "")
    if (!state) {
      const st = place.address?.state || ""
      if (STATES.includes(st)) setState(st)
    }
    if (!pincode) setPincode(place.address?.postcode || "")
  }

  // ── Amenity toggle ──────────────────────────────────────────────────────────
  const toggleAmenity = (key) => setAmenities(prev => ({ ...prev, [key]: !prev[key] }))

  // ── Progress calculation ────────────────────────────────────────────────────
  const filledCount = [
    title, propertyType, category, description, city, state,
    startingBid, ownerName, ownerPhone, imageFiles.length > 0,
  ].filter(Boolean).length
  const progress = Math.round((filledCount / 10) * 100)

  // ── File validation ────────────────────────────────────────────────────────
  const ALLOWED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png']
  const ALLOWED_DOC_TYPES = ['.pdf']
  
  const validateFile = (file, allowedTypes) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    return allowedTypes.includes(ext)
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError("")
    setSubmitSuccess("")

    if (!title.trim()) return setSubmitError("Property Title is required.")
    if (!propertyType) return setSubmitError("Property Type is required.")
    if (!category) return setSubmitError("Property Category is required.")
    if (!description.trim()) return setSubmitError("Description is required.")
    if (!city.trim() || !state) return setSubmitError("City and State are required.")
    if (!startingBid || isNaN(Number(startingBid)) || Number(startingBid) <= 0)
      return setSubmitError("Valid Starting Bid Price is required.")
    if (!ownerName.trim() || !ownerPhone.trim())
      return setSubmitError("Owner Name and Phone are required.")
    if (imageFiles.length === 0) return setSubmitError("At least one property image is required.")
    if (!ownershipDoc) return setSubmitError("Ownership Document is required.")
    
    // Validate image file types
    for (let file of imageFiles) {
      if (!validateFile(file, ALLOWED_IMAGE_TYPES)) {
        return setSubmitError(`Invalid image file: ${file.name}. Only JPG and PNG allowed.`)
      }
    }
    
    // Validate document file types
    if (ownershipDoc && !validateFile(ownershipDoc, ALLOWED_DOC_TYPES)) {
      return setSubmitError(`Invalid document: ${ownershipDoc.name}. Only PDF allowed.`)
    }
    if (regCert && !validateFile(regCert, ALLOWED_DOC_TYPES)) {
      return setSubmitError(`Invalid document: ${regCert.name}. Only PDF allowed.`)
    }
    if (legalDoc && !validateFile(legalDoc, ALLOWED_DOC_TYPES)) {
      return setSubmitError(`Invalid document: ${legalDoc.name}. Only PDF allowed.`)
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("data", JSON.stringify({
        title: title.trim(),
        propertyType,
        category,
        description: description.trim(),
        totalArea: totalArea || null,
        builtUpArea: builtUpArea || null,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        state,
        pincode: pincode.trim(),
        landmark: landmark.trim(),
        address: selectedAddress || `${addressLine1}, ${city}, ${state}`,
        latitude: latitude || 0,
        longitude: longitude || 0,
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
        floors: floors || null,
        floorNumber: floorNumber || null,
        parking,
        furnishing,
        propertyAge: propertyAge || null,
        expectedPrice: expectedPrice ? Number(expectedPrice) : null,
        startingPrice: Number(startingBid),
        reservePrice: reservePrice ? Number(reservePrice) : null,
        negotiable: negotiable === "Yes",
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerPhone: ownerPhone.trim(),
        ownerAltPhone: ownerAltPhone.trim(),
        ownerAddress: ownerAddress.trim(),
        amenities,
        availabilityStatus,
        propertyStatus,
        location: city.trim(),
      }))

      // images (multiple)
      imageFiles.forEach(f => formData.append("images", f))
      // primary image for backward compat
      formData.append("image", imageFiles[0])
      // NOTE: Backend does NOT support video uploads - only jpg, jpeg, png, pdf
      // if (videoFile) formData.append("video", videoFile)
      if (ownershipDoc) formData.append("document", ownershipDoc)
      if (regCert) formData.append("regCert", regCert)
      if (legalDoc) formData.append("legalDoc", legalDoc)

      await createProperty(formData)
      setSubmitSuccess("🎉 Property submitted successfully! Status: PENDING — Admin will review shortly.")
      setTimeout(() => navigate("/auctioneer/my-properties"), 2500)
    } catch (err) {
      setSubmitError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to submit property. Please try again."
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleClear = () => {
    if (!window.confirm("Clear all fields?")) return
    setTitle(""); setPropertyType(""); setCategory(""); setDescription("")
    setTotalArea(""); setBuiltUpArea(""); setAddressLine1(""); setAddressLine2("")
    setCity(""); setState(""); setPincode(""); setLandmark("")
    setAddressQuery(""); setSelectedAddress(""); setLatitude(null); setLongitude(null)
    setBedrooms(""); setBathrooms(""); setFloors(""); setFloorNumber("")
    setParking(""); setFurnishing(""); setPropertyAge("")
    setExpectedPrice(""); setStartingBid(""); setReservePrice("")
    setNegotiable("");
    setImageFiles([]); setVideoFile(null); setOwnershipDoc(null)
    setRegCert(null); setLegalDoc(null)
    setOwnerName(""); setOwnerEmail(""); setOwnerPhone("")
    setOwnerAltPhone(""); setOwnerAddress("")
    setAmenities({
      waterSupply: false, electricity: false, lift: false, security: false,
      garden: false, swimmingPool: false, gym: false, powerBackup: false, internet: false
    })
    setAvailabilityStatus(""); setPropertyStatus("")
    setSubmitError(""); setSubmitSuccess("")
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null }
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={sty.page}>
      {/* Top Bar */}
      <div style={sty.topBar}>
        <div>
          <div style={sty.topBarTitle}>🏡 Add New Property</div>
          <div style={sty.topBarSub}>Fill in all details to submit for admin review</div>
        </div>
        <button style={sty.backBtn} onClick={() => navigate("/auctioneer/dashboard")}>
          ← Back to Dashboard
        </button>
      </div>

      <div style={sty.body}>
        {/* Progress */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 6 }}>
            <span>Form Completion</span>
            <span>{progress}%</span>
          </div>
          <div style={sty.progressBar}>
            <div style={sty.progressFill(progress)} />
          </div>
        </div>

        {/* Banners */}
        {submitError && <div style={sty.banner("error")}>⚠️ {submitError}</div>}
        {submitSuccess && <div style={sty.banner("success")}>{submitSuccess}</div>}

        <form onSubmit={handleSubmit}>

          {/* ── 1. Basic Details ─────────────────────────────────────── */}
          <Section icon="🏠" title="Basic Property Details">
            <Field label="Property Title" required span={2}>
              <Input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. 3BHK House in Hyderabad" />
            </Field>

            <Field label="Property Type" required>
              <Select value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                <option value="">Select type</option>
                {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
              </Select>
            </Field>

            <Field label="Property Category" required>
              <Select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Select category</option>
                {PROPERTY_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </Select>
            </Field>

            <Field label="Total Area (sq ft)" >
              <Input value={totalArea} onChange={e => setTotalArea(e.target.value)}
                placeholder="e.g. 1200" inputMode="decimal" />
            </Field>

            <Field label="Built-up Area (sq ft)">
              <Input value={builtUpArea} onChange={e => setBuiltUpArea(e.target.value)}
                placeholder="e.g. 950" inputMode="decimal" />
            </Field>

            <Field label="Property Description" required span={2}>
              <Textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe the property in detail — features, condition, surroundings..." />
            </Field>
          </Section>

          {/* ── 2. Location ──────────────────────────────────────────── */}
          <Section icon="📍" title="Location Details">
            <Field label="Address Line 1" span={2}>
              <Input value={addressLine1} onChange={e => setAddressLine1(e.target.value)}
                placeholder="House/Flat No., Street Name" />
            </Field>

            <Field label="Address Line 2">
              <Input value={addressLine2} onChange={e => setAddressLine2(e.target.value)}
                placeholder="Colony, Area, Locality" />
            </Field>

            <Field label="Landmark (optional)">
              <Input value={landmark} onChange={e => setLandmark(e.target.value)}
                placeholder="e.g. Near City Mall" />
            </Field>

            <Field label="City" required>
              <Input value={city} onChange={e => setCity(e.target.value)}
                placeholder="e.g. Hyderabad" />
            </Field>

            <Field label="State" required>
              <Select value={state} onChange={e => setState(e.target.value)}>
                <option value="">Select state</option>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </Field>

            <Field label="Pincode">
              <Input value={pincode} onChange={e => setPincode(e.target.value)}
                placeholder="e.g. 500001" inputMode="numeric" maxLength={6} />
            </Field>

            {/* Map search */}
            <Field label="Search & Pin Location on Map" span={2}>
              <div style={{ position: "relative" }}>
                <Input
                  value={addressQuery}
                  onChange={e => handleAddressInput(e.target.value)}
                  placeholder="Type address to search, e.g. Banjara Hills Hyderabad..."
                  autoComplete="off"
                  style={{ ...sty.input, paddingRight: 40 }}
                />
                {searchingAddress && (
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
                    <Spinner size={16} />
                  </span>
                )}
                {suggestions.length > 0 && (
                  <div style={sty.suggestBox}>
                    {suggestions.map((place, i) => (
                      <div key={i} style={sty.suggestItem}
                        onMouseEnter={e => e.currentTarget.style.background = C.sectionBg}
                        onMouseLeave={e => e.currentTarget.style.background = "var(--text-main)"}
                        onClick={() => handleSelectSuggestion(place)}>
                        📍 {place.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span style={sty.hint}>Start typing to see address suggestions — click to pin on map</span>
            </Field>

            {latitude && longitude && (
              <>
                <div style={sty.coordsRow}>
                  <span style={sty.coordPill}>📍 {selectedAddress.slice(0, 70)}...</span>
                  <span style={sty.coordPill}>Lat: {latitude.toFixed(5)}</span>
                  <span style={sty.coordPill}>Lng: {longitude.toFixed(5)}</span>
                </div>
                <div style={sty.mapBox} ref={mapRef} />
              </>
            )}

            <Field label="Latitude (auto-filled)">
              <Input value={latitude ?? ""} onChange={e => setLatitude(parseFloat(e.target.value) || null)}
                placeholder="Auto-filled from map" inputMode="decimal" />
            </Field>

            <Field label="Longitude (auto-filled)">
              <Input value={longitude ?? ""} onChange={e => setLongitude(parseFloat(e.target.value) || null)}
                placeholder="Auto-filled from map" inputMode="decimal" />
            </Field>
          </Section>

          {/* ── 3. Specifications ────────────────────────────────────── */}
          <Section icon="🏗️" title="Property Specifications">
            <Field label="Bedrooms (BHK)">
              <Input value={bedrooms} onChange={e => setBedrooms(e.target.value)}
                placeholder="e.g. 3" inputMode="numeric" />
            </Field>

            <Field label="Bathrooms">
              <Input value={bathrooms} onChange={e => setBathrooms(e.target.value)}
                placeholder="e.g. 2" inputMode="numeric" />
            </Field>

            <Field label="Number of Floors">
              <Input value={floors} onChange={e => setFloors(e.target.value)}
                placeholder="e.g. 2" inputMode="numeric" />
            </Field>

            <Field label="Floor Number (if apartment)">
              <Input value={floorNumber} onChange={e => setFloorNumber(e.target.value)}
                placeholder="e.g. 4" inputMode="numeric" />
            </Field>

            <Field label="Parking Availability">
              <div style={sty.radioGroup}>
                {["Yes", "No"].map(v => (
                  <button key={v} type="button" style={sty.radioBtn(parking === v)}
                    onClick={() => setParking(v)}>{v}</button>
                ))}
              </div>
            </Field>

            <Field label="Furnishing Type">
              <div style={sty.radioGroup}>
                {FURNISHING_TYPES.map(v => (
                  <button key={v} type="button" style={sty.radioBtn(furnishing === v)}
                    onClick={() => setFurnishing(v)}>{v}</button>
                ))}
              </div>
            </Field>

            <Field label="Property Age (years)">
              <Input value={propertyAge} onChange={e => setPropertyAge(e.target.value)}
                placeholder="e.g. 5" inputMode="numeric" />
            </Field>

            <Field label="Property Status">
              <div style={sty.radioGroup}>
                {PROPERTY_STATUSES.map(v => (
                  <button key={v} type="button" style={sty.radioBtn(propertyStatus === v)}
                    onClick={() => setPropertyStatus(v)}>{v}</button>
                ))}
              </div>
            </Field>

            <Field label="Availability Status" span={2}>
              <div style={sty.radioGroup}>
                {AVAILABILITY_STATUSES.map(v => (
                  <button key={v} type="button" style={sty.radioBtn(availabilityStatus === v)}
                    onClick={() => setAvailabilityStatus(v)}>{v}</button>
                ))}
              </div>
            </Field>
          </Section>

          {/* ── 4. Pricing ───────────────────────────────────────────── */}
          <Section icon="💰" title="Pricing Details">
            <Field label="Expected Price (₹)">
              <Input value={expectedPrice} onChange={e => setExpectedPrice(e.target.value)}
                placeholder="e.g. 7500000" inputMode="decimal" />
            </Field>

            <Field label="Starting Bid Price (₹)" required>
              <Input value={startingBid} onChange={e => setStartingBid(e.target.value)}
                placeholder="e.g. 5000000" inputMode="decimal" />
            </Field>

            <Field label="Reserve Price (₹) — optional">
              <Input value={reservePrice} onChange={e => setReservePrice(e.target.value)}
                placeholder="Minimum acceptable price" inputMode="decimal" />
            </Field>

            <Field label="Price Negotiable">
              <div style={sty.radioGroup}>
                {["Yes", "No"].map(v => (
                  <button key={v} type="button" style={sty.radioBtn(negotiable === v)}
                    onClick={() => setNegotiable(v)}>{v}</button>
                ))}
              </div>
            </Field>


          </Section>

          {/* ── 5. Files ─────────────────────────────────────────────── */}
          <Section icon="📁" title="Property Images & Documents">
            <Field label="Property Images (multiple)" required span={2}>
              <input type="file" accept=".jpg,.jpeg,.png" multiple style={sty.fileInput}
                onChange={e => setImageFiles(Array.from(e.target.files))} />
              {imageFiles.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {imageFiles.map((f, i) => (
                    <div key={i} style={{
                      background: C.primaryLight, color: C.primary,
                      borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700,
                    }}>
                      🖼️ {f.name.slice(0, 20)}{f.name.length > 20 ? "..." : ""}
                    </div>
                  ))}
                </div>
              )}
              <span style={sty.hint}>JPG, PNG only. Upload multiple photos of the property.</span>
            </Field>

            <Field label="Ownership Document" required>
              <input type="file" accept=".pdf" style={sty.fileInput}
                onChange={e => setOwnershipDoc(e.target.files?.[0] || null)} />
              {ownershipDoc && <div style={{fontSize: 12, color: C.success, marginTop: 6}}>✅ {ownershipDoc.name}</div>}
              <span style={sty.hint}>Sale deed or title document (PDF only)</span>
            </Field>

            <Field label="Property Registration Certificate">
              <input type="file" accept=".pdf" style={sty.fileInput}
                onChange={e => setRegCert(e.target.files?.[0] || null)} />
              {regCert && <div style={{fontSize: 12, color: C.success, marginTop: 6}}>✅ {regCert.name}</div>}
              <span style={sty.hint}>Official registration certificate (PDF only)</span>
            </Field>

            <Field label="Legal Clearance Document">
              <input type="file" accept=".pdf" style={sty.fileInput}
                onChange={e => setLegalDoc(e.target.files?.[0] || null)} />
              {legalDoc && <div style={{fontSize: 12, color: C.success, marginTop: 6}}>✅ {legalDoc.name}</div>}
              <span style={sty.hint}>NOC or legal clearance certificate (PDF only)</span>
            </Field>
          </Section>

          {/* ── 6. Owner ─────────────────────────────────────────────── */}
          <Section icon="👤" title="Owner / Seller Details">
            <Field label="Owner Name" required>
              <Input value={ownerName} onChange={e => setOwnerName(e.target.value)}
                placeholder="Full name" />
            </Field>

            <Field label="Email Address">
              <Input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)}
                placeholder="owner@email.com" />
            </Field>

            <Field label="Phone Number" required>
              <Input type="tel" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)}
                placeholder="+91 9876543210" />
            </Field>

            <Field label="Alternate Contact Number">
              <Input type="tel" value={ownerAltPhone} onChange={e => setOwnerAltPhone(e.target.value)}
                placeholder="+91 9876543210" />
            </Field>

            <Field label="Owner Address" span={2}>
              <Textarea value={ownerAddress} onChange={e => setOwnerAddress(e.target.value)}
                placeholder="Current residential address of the owner" />
            </Field>
          </Section>

          {/* ── 7. Amenities ─────────────────────────────────────────── */}
          <Section icon="✨" title="Amenities">
            <div style={sty.checkGrid}>
              {AMENITIES.map(({ key, label }) => (
                <div key={key}
                  style={{
                    ...sty.checkItem,
                    border: `1.5px solid ${amenities[key] ? C.primary : C.border}`,
                    background: amenities[key] ? C.primaryLight : "transparent",
                    color: amenities[key] ? C.primary : C.text,
                  }}
                  onClick={() => toggleAmenity(key)}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: `2px solid ${amenities[key] ? C.primary : C.border}`,
                    background: amenities[key] ? C.primary : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {amenities[key] && <span style={{ color: "#ffffff", fontSize: 11, fontWeight: 900 }}>✓</span>}
                  </div>
                  {label}
                </div>
              ))}
            </div>
          </Section>

          {/* ── Submit bar ───────────────────────────────────────────── */}
          <div style={sty.submitBar}>
            <button type="submit" style={sty.submitBtn} disabled={submitting}>
              {submitting
                ? <><Spinner size={18} color="var(--text-main)" /> Submitting...</>
                : "🚀 Submit Property"}
            </button>
            <button type="button" style={sty.clearBtn} onClick={handleClear} disabled={submitting}>
              Clear All
            </button>
            <span style={{ marginLeft: "auto", fontSize: 12, color: C.muted, fontWeight: 700 }}>
              Fields marked <span style={{ color: C.error }}>*</span> are required
            </span>
          </div>

        </form>
      </div>
    </div>
  )
}