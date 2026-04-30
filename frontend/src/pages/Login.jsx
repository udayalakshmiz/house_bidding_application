import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { login, verifyLoginOtp, resendOtp } from "../services/authService"

export default function Login() {
    const [step, setStep] = useState(1)
    const [form, setForm] = useState({ email: "", password: "" })
    const [otp, setOtp] = useState("")
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await login(form)
            setMessage("OTP sent to " + form.email)
            setStep(2)
        } catch (err) {
            setMessage(err.response?.data || "Login failed")
        }
        setLoading(false)
    }

    const handleVerify = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await verifyLoginOtp(form.email, otp)
            const token = res.data.token
            const role  = res.data.role
            const name  = res.data.name

            // localStorage → shared across tabs (role/name for display)
            localStorage.setItem("role",  role)
            localStorage.setItem("name",  name)

            // sessionStorage → tab-isolated (token for security)
            sessionStorage.setItem("token", token)
            sessionStorage.setItem("role",  role)
            sessionStorage.setItem("name",  name)

            navigate("/" + role.toLowerCase() + "/dashboard")
        } catch (err) {
            setMessage("Invalid or expired OTP")
        }
        setLoading(false)
    }

    const handleResend = async () => {
        try {
            await resendOtp(form.email)
            setMessage("OTP resent!")
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
                    <h3>Welcome Back</h3>
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <input className="auth-input" placeholder="Email Address" type="email"
                                onChange={e => setForm({ ...form, email: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <input className="auth-input" placeholder="Password" type="password"
                                onChange={e => setForm({ ...form, password: e.target.value })} required />
                        </div>
                        <div className="form-footer-row">
                            <button
                                type="button"
                                className="link-button"
                                onClick={() => navigate("/forgot-password")}
                            >
                                Forgot password?
                            </button>
                        </div>
                        <button className="auth-button" type="submit" disabled={loading}>
                            {loading ? "Authenticating..." : "Login"}
                        </button>
                    </form>
                    <p className="auth-footer">
                        New here? <Link to="/register">Create an account</Link>
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
                <div className={`auth-message ${message.toLowerCase().includes('failed') || message.toLowerCase().includes('invalid') ? 'message-error' : 'message-success'}`}>
                    {message}
                </div>
            )}
        </div>
    )
}
