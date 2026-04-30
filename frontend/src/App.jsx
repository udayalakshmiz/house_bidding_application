import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom"

// ── Auth & General Pages ──────────────────────────────────────────────────────
import Login from "./pages/Login"
import Register from "./pages/Register"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"

// ── Dashboards ────────────────────────────────────────────────────────────────
import BidderDashboard from "./pages/dashboards/BidderDashboard"
import AuctioneerDashboard from "./pages/dashboards/AuctioneerDashboard"
import AdminDashboard from "./pages/dashboards/AdminDashboard"

// ── Auctioneer Pages ──────────────────────────────────────────────────────────
import AddProperty from "./pages/auctioneer/AddProperty"
import MyProperties from "./pages/auctioneer/MyProperties"
import CreateAuction from "./pages/auctioneer/CreateAuction"
import AuctionApplicants from "./pages/auctioneer/AuctionApplicants"
import AuctioneerLiveRoom from "./pages/auctioneer/AuctioneerLiveRoom"

// ── Bidder Pages ──────────────────────────────────────────────────────────────
import AuctionBrowse from "./pages/bidder/AuctionBrowse"
import LiveAuctionRoom from "./pages/bidder/LiveAuctionRoom"
// ── Admin Pages ───────────────────────────────────────────────────────────────
import VerifyProperties from "./pages/admin/VerifyProperties"

import "./index.css"

function ProtectedRoute({ children, allowedRoles }) {
    const role = sessionStorage.getItem("role") || localStorage.getItem("role")
    const token = sessionStorage.getItem("token")

    if (!role || !token) {
        return <Navigate to="/login" replace />
    }

    // Normalize: backend returns "ROLE_BIDDER" or "BIDDER" — handle both
    const normalizedRole = role.replace("ROLE_", "").toLowerCase()

    if (allowedRoles && !allowedRoles.includes(normalizedRole)) {
        return <Navigate to="/login" replace />
    }

    return children
}

function AppLayout() {
  const location = useLocation()
  const isDashboard = ["/bidder", "/auctioneer", "/admin"].some((p) =>
    location.pathname.startsWith(p)
  )

  if (isDashboard) {
    return (
      <div className="dashboard-shell">
        <Routes>
          {/* ── Bidder ───────────────────────────────────────────────────── */}
          <Route path="/bidder/dashboard" element={
              <ProtectedRoute allowedRoles={["bidder"]}>
                  <BidderDashboard />
              </ProtectedRoute>
          } />
          <Route path="/bidder/auctions" element={
              <ProtectedRoute allowedRoles={["bidder"]}>
                  <AuctionBrowse />
              </ProtectedRoute>
          } />
          <Route path="/bidder/auction/:auctionId/live" element={
              <ProtectedRoute allowedRoles={["bidder"]}>
                  <LiveAuctionRoom />
              </ProtectedRoute>
          } />
          {/* ── Auctioneer ───────────────────────────────────────────────── */}
          <Route path="/auctioneer/dashboard" element={
              <ProtectedRoute allowedRoles={["auctioneer"]}>
                  <AuctioneerDashboard />
              </ProtectedRoute>
          } />
          <Route path="/auctioneer/add-property" element={
              <ProtectedRoute allowedRoles={["auctioneer"]}>
                  <AddProperty />
              </ProtectedRoute>
          } />
          <Route path="/auctioneer/my-properties" element={
              <ProtectedRoute allowedRoles={["auctioneer"]}>
                  <MyProperties />
              </ProtectedRoute>
          } />
          <Route path="/auctioneer/create-auction" element={
              <ProtectedRoute allowedRoles={["auctioneer"]}>
                  <CreateAuction />
              </ProtectedRoute>
          } />
          <Route path="/auctioneer/auction/:auctionId/applicants" element={
              <ProtectedRoute allowedRoles={["auctioneer"]}>
                  <AuctionApplicants />
              </ProtectedRoute>
          } />
          <Route path="/auctioneer/auction/:auctionId/live" element={
              <ProtectedRoute allowedRoles={["auctioneer"]}>
                  <AuctioneerLiveRoom />
              </ProtectedRoute>
          } />

          {/* ── Admin ────────────────────────────────────────────────────── */}
          <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
              </ProtectedRoute>
          } />
          <Route path="/admin/verify-properties" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                  <VerifyProperties />
              </ProtectedRoute>
          } />

          {/* ── Shared ───────────────────────────────────────────────────── */}
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-left">
          <div className="overlay">
            <h2>House Auction</h2>
            <p>Bid smart. Buy better. Own your dream home.</p>
          </div>
        </div>
        <div className="auth-right">
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  )
}