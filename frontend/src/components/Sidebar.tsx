"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearAuthTokens } from "@/lib/api";

export default function Sidebar({
  collapsed = false,
  onToggle,
  canToggle = false,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
  canToggle?: boolean;
}) {
  const pathname = usePathname();

  const links = [
    { name: "Overview", href: "/dashboard", icon: "📊" },
    { name: "Vendors", href: "/dashboard/vendors", icon: "🏢" },
    { name: "Items", href: "/dashboard/items", icon: "📦" },
    { name: "Stock Counts", href: "/dashboard/stock-counts", icon: "📋" },
    { name: "Sales Orders", href: "/dashboard/sales-orders", icon: "🛒" },
  ];

  function handleLogout() {
    clearAuthTokens();
    window.location.href = "/login";
  }

  return (
    <aside
      style={{
        ...styles.sidebar,
        width: collapsed ? "72px" : "250px",
      }}
    >
      <div style={{ ...styles.logo, padding: collapsed ? "1.5rem 0.75rem" : "2rem 1.5rem" }}>
        {!collapsed && (
          <>
            <h2 style={{ margin: 0, color: "var(--primary)" }}>Medaxas</h2>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>by Divocco</span>
          </>
        )}
      </div>

      <nav
        style={{
          ...styles.nav,
          padding: collapsed ? "1.5rem 0.5rem" : "1.5rem 1rem",
        }}
      >
        {links.map((link) => {
          const isActive = 
            link.href === "/dashboard" 
              ? pathname === "/dashboard" 
              : pathname === link.href || pathname.startsWith(link.href + "/");
              
          return (
            <Link
              key={link.name}
              href={link.href}
              style={{
                ...styles.link,
                ...(isActive ? styles.linkActive : {}),
                display: "flex",
                alignItems: "center",
                gap: collapsed ? "0" : "0.75rem",
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "0.75rem 0.5rem" : "0.75rem 1rem",
              }}
              title={collapsed ? link.name : undefined}
            >
              <span style={{ fontSize: "1.1rem" }}>{link.icon}</span>
              {!collapsed && link.name}
            </Link>
          );
        })}
      </nav>
      
      <div style={styles.footer}>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            ...styles.link,
            color: "var(--danger)",
            textAlign: collapsed ? "center" : "left",
            padding: collapsed ? "0.75rem 0.5rem" : "0.75rem 1rem",
            width: "100%",
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
          title={collapsed ? "Log out" : undefined}
        >
          {collapsed ? "↩" : "Log out"}
        </button>
      </div>
      {canToggle && (
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? "Expand menu" : "Collapse menu"}
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "-14px",
            width: "28px",
            height: "28px",
            borderRadius: "999px",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "0.9rem",
            lineHeight: 1,
            display: "grid",
            placeItems: "center",
          }}
        >
          {collapsed ? "»" : "«"}
        </button>
      )}
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "250px",
    height: "100vh",
    backgroundColor: "var(--surface)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column" as const,
    position: "fixed" as const,
    top: 0,
    left: 0,
  },
  logo: {
    padding: "2rem 1.5rem",
    borderBottom: "1px solid var(--border)",
  },
  nav: {
    padding: "1.5rem 1rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
    flex: 1,
  },
  link: {
    display: "block",
    padding: "0.75rem 1rem",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontWeight: 500,
    transition: "background-color 0.2s, color 0.2s",
  },
  linkActive: {
    backgroundColor: "var(--primary)",
    color: "white",
  },
  footer: {
    padding: "1rem",
    borderTop: "1px solid var(--border)",
  }
};
