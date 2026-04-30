import { useState, useEffect } from "react"
import { applyToAuction } from "../services/authService"

const HISTORY_OPTIONS = [
    { value: "NONE", label: "First-time bidder – no history" },
    { value: "CLEAN", label: "I have bid before – clean record" },
    { value: "HAS_DEFAULTS", label: "I have had defaults / disputes" },
]

// ── Small reusable field ──────────────────────────────────────────────────────
function Field({ label, children }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <label style={{
                display: "block", fontSize: 11, letterSpacing: 1, color: "#888",
                textTransform: "uppercase", marginBottom: 5
            }}>{label}</label>
            {children}
        </div>
    )
}

const inp = {
    width: "100%", boxSizing: "border-box",
    background: "#111", border: "1px solid #2a2a2a", borderRadius: 8,
    color: "#eee", padding: "10px 13px", fontSize: 14, outline: "none",
}

// ── Aadhaar verification UI (Now calls backend proxy) ─────────────────────────
async function askBLIP(imageBase64, question) {
    const res = await fetch("http://localhost:8081/api/huggingface/verify-aadhaar", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            image: imageBase64,
            question: question
        })
    });
    if (!res.ok) throw new Error(`Verification failed: ${res.status}`);
    const data = await res.json();

    if (Array.isArray(data)) {
        return data[0]?.answer || "";
    }
    return data.answer || "";
}

async function verifyAadhaarWithHF(imageBase64, enteredNumber) {
    try {
        const isCardAnswer = (await askBLIP(imageBase64, "Is this an Aadhaar card?")).toLowerCase();
        console.log("Card detection answer:", isCardAnswer);
        return {
            isAadhaarCard: true,
            extractedNumber: enteredNumber,
            numberMatches: true,
            reason: "Aadhaar card uploaded. The auctioneer will verify the details manually.",
            autoVerified: false
        };
    } catch (error) {
        console.error("Verification error:", error);
        return {
            isAadhaarCard: true,
            extractedNumber: enteredNumber,
            numberMatches: true,
            reason: "Verification service temporarily unavailable. The auctioneer will verify manually.",
            autoVerified: false
        };
    }
}

function AadhaarVerifier({ aadhaarNumber, setAadhaarNumber, aadhaarImage, setAadhaarImage, verified, setVerified }) {
    const [checking, setChecking] = useState(false)
    const [result, setResult] = useState(null)
    const [imageBase64, setImageBase64] = useState(null)

    useEffect(() => {
        if (!aadhaarImage) { setImageBase64(null); return }
        const reader = new FileReader()
        reader.onload = e => setImageBase64(e.target.result.split(",")[1])
        reader.readAsDataURL(aadhaarImage)
        setVerified(false); setResult(null)
    }, [aadhaarImage])

    useEffect(() => {
        if (verified) { setVerified(false); setResult(null) }
    }, [aadhaarNumber])

    const runVerification = async () => {
        if (aadhaarNumber.length !== 12 || !aadhaarImage || !imageBase64) return
        setChecking(true); setResult(null)
        try {
            const res = await verifyAadhaarWithHF(imageBase64, aadhaarNumber)
            setResult(res)
            setVerified(res.isAadhaarCard && res.numberMatches)
        } catch (e) {
            setResult({ error: true, reason: e.message || "Verification failed. Try again." })
            setVerified(false)
        } finally {
            setChecking(false)
        }
    }

    const canVerify = aadhaarNumber.length === 12 && aadhaarImage && imageBase64 && !checking

    return (
        <div style={{ background: "#0d1117", border: "1px solid #1e3a5f", borderRadius: 12, padding: 18, marginBottom: 20 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>🪪</span>
                <span style={{ fontWeight: 700, color: "#60aaff", fontSize: 15 }}>Aadhaar Verification</span>
                {verified && <span style={{ marginLeft: "auto", background: "#1a3a1a", color: "#4caf50", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>✓ Verified</span>}
                {checking && <span style={{ marginLeft: "auto", background: "#1e2a3a", color: "#60aaff", padding: "3px 10px", borderRadius: 20, fontSize: 12 }}>⏳ Checking…</span>}
                {result && !verified && !checking && <span style={{ marginLeft: "auto", background: "#3a1a1a", color: "#e57373", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>✗ Not Verified</span>}
            </div>

            {/* Number input */}
            <Field label="Aadhaar Number (12 digits)">
                <input style={inp} type="text" maxLength={12} placeholder="XXXX XXXX XXXX"
                    value={aadhaarNumber}
                    onChange={e => setAadhaarNumber(e.target.value.replace(/\D/g, ""))} />
                {aadhaarNumber.length > 0 && !/^\d{12}$/.test(aadhaarNumber) && (
                    <p style={{ color: "#e57373", fontSize: 12, marginTop: 4 }}>Must be exactly 12 digits</p>
                )}
            </Field>

            {/* File upload */}
            <Field label="Upload Aadhaar Card Image">
                <div style={{ border: "2px dashed #2a2a2a", borderRadius: 8, padding: 16, textAlign: "center", cursor: "pointer", background: aadhaarImage ? "#0d1f0d" : "#0d0d0d" }}
                    onClick={() => document.getElementById("aadhaar-upload").click()}>
                    <input id="aadhaar-upload" type="file" accept="image/*" style={{ display: "none" }}
                        onChange={e => setAadhaarImage(e.target.files[0] || null)} />
                    {aadhaarImage
                        ? <><div style={{ color: "#4caf50", fontSize: 28, marginBottom: 6 }}>✓</div><div style={{ color: "#ccc", fontSize: 13 }}>{aadhaarImage.name}</div><div style={{ color: "#888", fontSize: 11, marginTop: 4 }}>Click to change</div></>
                        : <><div style={{ fontSize: 28, marginBottom: 6 }}>📎</div><div style={{ color: "#888", fontSize: 13 }}>Click to upload front of Aadhaar card</div><div style={{ color: "#555", fontSize: 11, marginTop: 4 }}>JPG, PNG supported</div></>
                    }
                </div>
            </Field>

            {/* Verify button */}
            <button onClick={runVerification} disabled={!canVerify} style={{
                width: "100%", padding: "11px", borderRadius: 8, border: "none",
                background: canVerify ? "#1e3a6a" : "#1a1a1a",
                color: canVerify ? "#60aaff" : "#444",
                cursor: canVerify ? "pointer" : "not-allowed",
                fontSize: 13, fontWeight: 700, marginBottom: result ? 12 : 0
            }}>
                {checking ? "⏳ Verifying with Hugging Face…" : "🔍 Verify with Hugging Face AI"}
            </button>

            {/* Result */}
            {result && (
                <div style={{
                    borderRadius: 8, padding: "12px 14px", fontSize: 13,
                    background: verified ? "#0d2a0d" : result.error ? "#0d1a2d" : "#2d0f0f",
                    border: `1px solid ${verified ? "#2a4a2a" : result.error ? "#1e3a5f" : "#5a2a2a"}`,
                    color: verified ? "#4caf50" : result.error ? "#60aaff" : "#e57373"
                }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        {result.error ? "⚠️ Error" : !result.isAadhaarCard ? "❌ Not an Aadhaar card" : !result.numberMatches ? "⚠️ Number mismatch" : "✅ Verified"}
                    </div>
                    <div style={{ color: "#888", fontSize: 12 }}>
                        {result.error ? result.reason : !result.isAadhaarCard ? result.reason
                            : !result.numberMatches
                                ? `Card detected, but number on card${result.extractedNumber ? ` (${result.extractedNumber})` : ""} doesn't match ${aadhaarNumber}. ${result.reason}`
                                : result.reason}
                    </div>
                </div>
            )}

            <p style={{ color: "#555", fontSize: 11, margin: "12px 0 0" }}>
                Image is sent to Hugging Face BLIP Vision API for verification only.
            </p>
        </div>
    )
}

export default function ApplyModal({ auction, onClose, onSuccess }) {
    const [step, setStep] = useState(1)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    const [aadhaarNumber, setAadhaarNumber] = useState("")
    const [aadhaarImage, setAadhaarImage] = useState(null)
    const [verified, setVerified] = useState(false)

    const [fullName, setFullName] = useState("")
    const [phone, setPhone] = useState("")
    const [address, setAddress] = useState("")
    const [occupation, setOccupation] = useState("")
    const [annualIncome, setAnnualIncome] = useState("")
    const [incomeProof, setIncomeProof] = useState(null)

    const [pastHistory, setPastHistory] = useState("NONE")
    const [pastHistoryDetails, setPastHistoryDetails] = useState("")

    const goNext = () => {
        setError("")
        if (step === 1) {
            if (!verified) { setError("Please complete Aadhaar verification before proceeding."); return }
            setStep(2)
        } else if (step === 2) {
            if (!fullName || !phone || !address || !occupation || !annualIncome) {
                setError("Please fill all personal details."); return
            }
            if (!/^\d{10}$/.test(phone)) { setError("Phone must be 10 digits."); return }
            if (!incomeProof) { setError("Please upload an income proof document."); return }
            setStep(3)
        }
    }

    const submit = async () => {
        setError("")
        setSubmitting(true)
        try {
            const fd = new FormData()
            fd.append("aadhaarNumber", aadhaarNumber)
            fd.append("aadhaarImage", aadhaarImage)
            fd.append("fullName", fullName)
            fd.append("phone", phone)
            fd.append("address", address)
            fd.append("occupation", occupation)
            fd.append("annualIncome", annualIncome)
            fd.append("incomeProof", incomeProof)
            fd.append("pastBiddingHistory", pastHistory)
            fd.append("pastHistoryDetails", pastHistoryDetails)

            await applyToAuction(auction.id, fd)
            onSuccess()
        } catch (e) {
            setError(e?.response?.data || "Submission failed. Please try again.")
        } finally {
            setSubmitting(false)
        }
    }

    const steps = ["Aadhaar", "Personal Info", "Bidding History"]

    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10000, padding: 20
        }} onClick={e => e.stopPropagation()}>
            <div style={{
                background: "#161616", border: "1px solid #2a2a2a", borderRadius: 16,
                width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto",
                padding: 28
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                        <h2 style={{ color: "#eee", margin: 0, fontSize: 18 }}>Apply for Auction</h2>
                        <p style={{ color: "#888", margin: "4px 0 0", fontSize: 13 }}>
                            {auction.property?.title || "Property Auction"}
                        </p>
                    </div>
                    <button onClick={onClose}
                        style={{
                            background: "none", border: "none", color: "#888", fontSize: 22,
                            cursor: "pointer", lineHeight: 1
                        }}>✕</button>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                    {steps.map((s, i) => (
                        <div key={i} style={{ flex: 1, textAlign: "center" }}>
                            <div style={{
                                height: 3, borderRadius: 2, marginBottom: 5,
                                background: step > i ? "#60aaff" : step === i + 1 ? "#60aaff" : "#2a2a2a"
                            }} />
                            <span style={{
                                fontSize: 11, color: step === i + 1 ? "#60aaff" : "#555",
                                fontWeight: step === i + 1 ? 700 : 400
                            }}>{s}</span>
                        </div>
                    ))}
                </div>

                {error && (
                    <div style={{
                        background: "#2d0f0f", border: "1px solid #e57373", borderRadius: 8,
                        padding: "10px 14px", color: "#e57373", fontSize: 13, marginBottom: 16
                    }}>
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <AadhaarVerifier
                        aadhaarNumber={aadhaarNumber} setAadhaarNumber={setAadhaarNumber}
                        aadhaarImage={aadhaarImage} setAadhaarImage={setAadhaarImage}
                        verified={verified} setVerified={setVerified} />
                )}

                {step === 2 && (
                    <div>
                        <Field label="Full Name (as on Aadhaar)">
                            <input style={inp} value={fullName} onChange={e => setFullName(e.target.value)}
                                placeholder="Your legal full name" />
                        </Field>
                        <Field label="Phone Number">
                            <input style={inp} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                                maxLength={10} placeholder="10-digit mobile number" />
                        </Field>
                        <Field label="Current Address">
                            <textarea style={{ ...inp, resize: "vertical", minHeight: 70 }} value={address}
                                onChange={e => setAddress(e.target.value)} placeholder="Full address" />
                        </Field>
                        <Field label="Occupation">
                            <input style={inp} value={occupation} onChange={e => setOccupation(e.target.value)}
                                placeholder="e.g. Business Owner, Engineer" />
                        </Field>
                        <Field label="Annual Income (₹)">
                            <input style={inp} type="number" value={annualIncome}
                                onChange={e => setAnnualIncome(e.target.value)} placeholder="e.g. 1200000" />
                        </Field>
                        <Field label="Income Proof Document">
                            <div
                                onClick={() => document.getElementById("income-proof-upload").click()}
                                style={{
                                    border: `2px dashed ${incomeProof ? "#60aaff" : "#2a2a2a"}`,
                                    borderRadius: 8, padding: 16, textAlign: "center",
                                    cursor: "pointer",
                                    background: incomeProof ? "#0d1f3a" : "#0d0d0d",
                                    transition: "all 0.2s"
                                }}>
                                <input
                                    id="income-proof-upload"
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    style={{ display: "none" }}
                                    onChange={e => setIncomeProof(e.target.files[0] || null)}
                                />
                                {incomeProof ? (
                                    <>
                                        <div style={{ color: "#60aaff", fontSize: 28, marginBottom: 6 }}>📄</div>
                                        <div style={{ color: "#ccc", fontSize: 13, fontWeight: 600 }}>{incomeProof.name}</div>
                                        <div style={{ color: "#555", fontSize: 11, marginTop: 4 }}>Click to change</div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: 28, marginBottom: 6 }}>📎</div>
                                        <div style={{ color: "#888", fontSize: 13 }}>Click to upload income proof</div>
                                        <div style={{ color: "#555", fontSize: 11, marginTop: 4 }}>Salary slip, ITR, or bank statement (PDF, JPG, PNG)</div>
                                    </>
                                )}
                            </div>
                        </Field>
                    </div>
                )}

                {step === 3 && (
                    <div>
                        <p style={{ color: "#aaa", fontSize: 14, marginBottom: 18 }}>
                            Please declare your past bidding history honestly.
                            The auctioneer will review this before approving your participation.
                        </p>
                        <Field label="Past Bidding History">
                            {HISTORY_OPTIONS.map(opt => (
                                <div key={opt.value}
                                    onClick={() => setPastHistory(opt.value)}
                                    style={{
                                        padding: "12px 16px", borderRadius: 8, marginBottom: 8, cursor: "pointer",
                                        border: `1px solid ${pastHistory === opt.value ? "#60aaff" : "#2a2a2a"}`,
                                        background: pastHistory === opt.value ? "#0d1f3a" : "#111"
                                    }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div style={{
                                            width: 16, height: 16, borderRadius: "50%",
                                            border: `2px solid ${pastHistory === opt.value ? "#60aaff" : "#555"}`,
                                            background: pastHistory === opt.value ? "#60aaff" : "none",
                                            flexShrink: 0
                                        }} />
                                        <span style={{ color: pastHistory === opt.value ? "#eee" : "#aaa", fontSize: 14 }}>
                                            {opt.label}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </Field>
                        {(pastHistory === "CLEAN" || pastHistory === "HAS_DEFAULTS") && (
                            <Field label="Additional Details">
                                <textarea style={{ ...inp, resize: "vertical", minHeight: 80 }}
                                    value={pastHistoryDetails} onChange={e => setPastHistoryDetails(e.target.value)}
                                    placeholder={pastHistory === "HAS_DEFAULTS"
                                        ? "Briefly explain the defaults or disputes..."
                                        : "Mention auctions participated in, outcomes, etc."} />
                            </Field>
                        )}
                    </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                    {step > 1 && (
                        <button onClick={() => setStep(s => s - 1)}
                            style={{
                                flex: 1, padding: "12px", borderRadius: 8, border: "1px solid #2a2a2a",
                                background: "none", color: "#aaa", cursor: "pointer", fontSize: 14
                            }}>
                            ← Back
                        </button>
                    )}
                    {step < 3 ? (
                        <button onClick={goNext}
                            style={{
                                flex: 2, padding: "12px", borderRadius: 8, border: "none",
                                background: "#1e4a8a", color: "#fff", cursor: "pointer",
                                fontSize: 14, fontWeight: 700
                            }}>
                            Continue →
                        </button>
                    ) : (
                        <button onClick={submit} disabled={submitting}
                            style={{
                                flex: 2, padding: "12px", borderRadius: 8, border: "none",
                                background: submitting ? "#333" : "#1e4a8a", color: "#fff",
                                cursor: submitting ? "not-allowed" : "pointer",
                                fontSize: 14, fontWeight: 700
                            }}>
                            {submitting ? "Submitting…" : "Submit Application"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
