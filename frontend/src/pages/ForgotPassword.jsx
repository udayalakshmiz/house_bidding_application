import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { requestPasswordReset } from "../services/authService"

export default function ForgotPassword() {
    const [email, setEmail] = useState("")
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await requestPasswordReset(email)
            setMessage("If this email is registered, a reset link has been sent.")
        } catch (err) {
            setMessage(err.response?.data || err.message || "Unable to send reset link right now.")
        }
        setLoading(false)
    }

    return (
        <div className="auth-card">
            <h1 className="auth-title">Forgot Password</h1>
            <p className="auth-subtitle">Reset access to your account</p>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <input
                        className="auth-input"
                        placeholder="Email Address"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </div>
                <button className="auth-button" type="submit" disabled={loading}>
                    {loading ? "Sending..." : "Send reset link"}
                </button>
            </form>

            <p className="auth-footer">
                Remembered your password?
                <button
                    type="button"
                    className="link-button"
                    onClick={() => navigate("/login")}
                >
                    Back to login
                </button>
            </p>

            {message && (
                <div className="auth-message">
                    {message}
                </div>
            )}
        </div>
    )
}

