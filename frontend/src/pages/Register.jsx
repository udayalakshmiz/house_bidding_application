import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { register, verifyRegisterOtp, resendOtp } from "../services/authService"

const ADMIN_SECRET = "Pravallika@19145"

export default function Register() {
    const [step, setStep] = useState(1)
    const [form, setForm] = useState({ name: "", email: "", password: "", role: "BIDDER" })
    const [confirmPassword, setConfirmPassword] = useState("")
    const [adminSecret, setAdminSecret] = useState("")
    const [otp, setOtp] = useState("")
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleRegister = async (e) => {
        e.preventDefault()

        const passwordRules = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/
        if (!passwordRules.test(form.password)) {
            setMessage("Password must be at least 8 characters, with 1 uppercase letter and 1 special character.")
            return
        }

        if (form.password !== confirmPassword) {
            setMessage("Passwords do not match.")
            return
        }

        if (form.role === "ADMIN") {
            if (adminSecret.trim() !== ADMIN_SECRET) {
                setMessage("Invalid admin secret key. You cannot register as admin.")
                return
            }
        }

        setLoading(true)
        try {
            await register(form)
            setMessage("OTP sent to " + form.email)
            setStep(2)
        } catch (err) {
            setMessage(err.response?.data || "Registration failed")
        }
        setLoading(false)
    }

    const handleVerify = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await verifyRegisterOtp(form.email, otp)
            localStorage.setItem("role", res.data.role)
            localStorage.setItem("name", res.data.name)
            navigate("/" + res.data.role.toLowerCase() + "/dashboard")
        } catch (err) {
            setMessage("Invalid or expired OTP")
        }
        setLoading(false)
    }

    const handleResend = async () => {
        try {
            await resendOtp(form.email)
            setMessage("OTP resent to " + form.email)
        } catch (err) {
            setMessage("Failed to resend OTP")
        }
    }

    return (
        <div className="auth-card">
            <h1 className="auth-title">🏠 House Auction</h1>
            <p className="auth-subtitle">Premium Real Estate Bidding</p>

            {step === 1 ? (
                <>
                    <h3>Create Account</h3>
                    <form onSubmit={handleRegister}>
                        <div className="form-group">
                            <input className="auth-input" placeholder="Full Name"
                                onChange={e => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <input className="auth-input" placeholder="Email Address" type="email"
                                onChange={e => setForm({ ...form, email: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <input
                                className="auth-input"
                                placeholder="Password"
                                type="password"
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                required
                            />
                            <p className="password-hint">
                                Password must be at least 8 characters, with 1 uppercase letter and 1 special character.
                            </p>
                        </div>
                        <div className="form-group">
                            <input
                                className="auth-input"
                                placeholder="Confirm Password"
                                type="password"
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <select className="auth-input"
                                onChange={e => setForm({ ...form, role: e.target.value })}>
                                <option value="BIDDER">Bidder</option>
                                <option value="AUCTIONEER">Auctioneer</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                        {form.role === "ADMIN" && (
                            <div className="form-group">
                                <input
                                    className="auth-input"
                                    placeholder="Admin Secret Key"
                                    type="password"
                                    value={adminSecret}
                                    onChange={e => setAdminSecret(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                        <button className="auth-button" type="submit" disabled={loading}>
                            {loading ? "Creating Account..." : "Register"}
                        </button>
                    </form>
                    <p className="auth-footer">
                        Already have an account? <Link to="/login">Login here</Link>
                    </p>
                </>
            ) : (
                <>
                    <h3>Verification Required</h3>
                    <p className="auth-subtitle">Enter the 6-digit code sent to <b>{form.email}</b></p>
                    <form onSubmit={handleVerify}>
                        <div className="form-group">
                            <input className="auth-input" placeholder="000000" maxLength={6}
                                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px' }}
                                onChange={e => setOtp(e.target.value)} required />
                        </div>
                        <button className="auth-button" type="submit" disabled={loading}>
                            {loading ? "Verifying..." : "Verify Identity"}
                        </button>
                    </form>
                    <div style={{ textAlign: 'center' }}>
                        <button className="resend-btn" onClick={handleResend}>Resend Code</button>
                    </div>
                </>
            )}

            {message && (
                <div className={`auth-message ${message.toLowerCase().includes('failed') || message.toLowerCase().includes('invalid') || message.toLowerCase().includes('password') || message.toLowerCase().includes('match') ? 'message-error' : 'message-success'}`}>
                    {message}
                </div>
            )}
        </div>
    )
}
