import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import axios from "axios"

const api = axios.create({
  baseURL: "http://localhost:8081/api",
  withCredentials: true
})

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token")

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post("/auth/reset-password", { token, newPassword })
      setMessage("Password reset successful! Redirecting to login...")
      setTimeout(() => navigate("/login"), 2000)
    } catch (err) {
      setMessage(err.response?.data || "Reset failed. Link may have expired.")
    }
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🏠 House Auction</h2>
        <h3>Set New Password</h3>
        <form onSubmit={handleReset}>
          <input style={styles.input} type="password" placeholder="Enter new password"
            onChange={e => setNewPassword(e.target.value)} required />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
        {message && <p style={styles.message}>{message}</p>}
      </div>
    </div>
  )
}

const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f0f2f5" },
  card: { background: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", width: "360px" },
  title: { textAlign: "center", color: "#1a1a2e" },
  input: { width: "100%", padding: "10px", margin: "8px 0", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" },
  button: { width: "100%", padding: "12px", background: "#4f46e5", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", cursor: "pointer", marginTop: "10px" },
  message: { marginTop: "10px", color: "#e53e3e", textAlign: "center" }
}