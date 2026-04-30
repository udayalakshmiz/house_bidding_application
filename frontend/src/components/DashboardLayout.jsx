import { useState } from "react"

/**
 * DashboardLayout — shared sidebar + topbar shell for all dashboards.
 *
 * Props:
 *  navItems    — array of { id, icon, label, badge?, badgeMuted? }
 *  activeTab   — string matching one of the navItem ids
 *  onTabChange — (id) => void
 *  onNavigate  — (path) => void   (for link-type nav items that navigate externally)
 *  actions     — array of { id, icon, label, path? } — "external" nav items (no active state toggle)
 *  userName    — string
 *  userRole    — string  ("Auctioneer" | "Bidder" | "Admin")
 *  onLogout    — () => void
 *  pageTitle   — string
 *  topbarRight — optional JSX to render on the right side of the topbar
 *  children    — main content
 */
export default function DashboardLayout({
    navItems = [],
    activeTab,
    onTabChange,
    onNavigate,
    actions = [],
    userName = "User",
    userRole = "User",
    onLogout,
    pageTitle = "Dashboard",
    topbarRight,
    children,
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const initials = userName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)

    const roleColor = {
        Auctioneer: { bg: "rgba(139, 92, 246, 0.15)", fg: "#a78bfa" }, // Violet
        Bidder:     { bg: "rgba(59, 130, 246, 0.15)", fg: "#60a5fa" }, // Blue
        Admin:      { bg: "rgba(236, 72, 153, 0.15)", fg: "#f472b6" }, // Pink
    }[userRole] || { bg: "var(--dash-accent-light)", fg: "var(--dash-accent)" }

    return (
        <div className="dl-shell">
            {/* ── SIDEBAR ── */}
            <aside className={`dl-sidebar${sidebarOpen ? " open" : ""}`}>

                {/* Brand */}
                <div className="dl-sidebar-header">
                    <div className="dl-brand-icon">🏡</div>
                    <div>
                        <div className="dl-brand-text">HouseAuction</div>
                        <div className="dl-brand-sub">Bidding Platform</div>
                    </div>
                </div>

                {/* Main nav */}
                <nav className="dl-nav-section" style={{ flex: 1 }}>
                    {navItems.length > 0 && (
                        <div className="dl-nav-label" style={{ marginBottom: 8 }}>Menu</div>
                    )}
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`dl-nav-item${activeTab === item.id ? " active" : ""}`}
                            onClick={() => {
                                onTabChange?.(item.id)
                                setSidebarOpen(false)
                            }}
                        >
                            <span className="dl-nav-icon">{item.icon}</span>
                            <span style={{ flex: 1 }}>{item.label}</span>
                            {item.badge != null && (
                                <span className={`dl-nav-badge${item.badgeMuted ? " muted" : ""}`}>
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}

                    {/* External navigation actions */}
                    {actions.length > 0 && (
                        <>
                            <div className="dl-nav-label" style={{ marginTop: 16, marginBottom: 8 }}>Actions</div>
                            {actions.map((action) => (
                                <button
                                    key={action.id}
                                    type="button"
                                    className="dl-nav-item"
                                    onClick={() => {
                                        if (action.path) onNavigate?.(action.path)
                                        setSidebarOpen(false)
                                    }}
                                >
                                    <span className="dl-nav-icon">{action.icon}</span>
                                    <span>{action.label}</span>
                                </button>
                            ))}
                        </>
                    )}
                </nav>

                {/* Footer: user chip + logout */}
                <div className="dl-sidebar-footer">
                    <div className="dl-user-chip">
                        <div className="dl-avatar">{initials}</div>
                        <div className="dl-user-info">
                            <div className="dl-user-name">{userName}</div>
                            <div className="dl-user-role">{userRole}</div>
                        </div>
                    </div>
                    <button type="button" className="dl-logout-btn" onClick={onLogout}>
                        <span>↩</span>
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* ── RIGHT PANEL (topbar + main) ── */}
            <div className="dl-body">

                {/* Top Bar */}
                <header className="dl-topbar">
                    {/* Hamburger (mobile only) */}
                    <button
                        type="button"
                        onClick={() => setSidebarOpen((o) => !o)}
                        style={{
                            display: "none",
                            background: "none",
                            border: "none",
                            fontSize: 22,
                            cursor: "pointer",
                            color: "var(--dash-muted)",
                            padding: "0 4px",
                        }}
                        className="dl-hamburger"
                    >
                        ☰
                    </button>

                    <div className="dl-page-title">{pageTitle}</div>

                    {topbarRight}

                    {/* User chip */}
                    <div className="dl-topbar-user">
                        <div
                            className="dl-avatar"
                            style={{ width: 28, height: 28, fontSize: 11 }}
                        >
                            {initials}
                        </div>
                        <span className="dl-topbar-name">{userName}</span>
                        <span
                            className="dl-role-badge"
                            style={{ background: roleColor.bg, color: roleColor.fg }}
                        >
                            {userRole}
                        </span>
                    </div>
                </header>

                {/* Main scrollable content */}
                <main className="dl-main">
                    {children}
                </main>
            </div>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
                        zIndex: 99, display: "none",
                    }}
                    className="dl-overlay"
                />
            )}
        </div>
    )
}
