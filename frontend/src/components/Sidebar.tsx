"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearAuthTokens } from "@/lib/api";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onNavigate?: (message: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
  canToggle?: boolean;
}

export default function Sidebar({
  isOpen,
  setIsOpen,
  onNavigate,
  collapsed = false,
  onToggle,
  canToggle = false,
}: SidebarProps) {
  const pathname = usePathname();
  const [clickedHref, setClickedHref] = useState<string | null>(null);

  useEffect(() => {
    // Reset visual loading state once Next.js router transitions catch up
    setClickedHref(null);
  }, [pathname]);

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
      className={`sidebar ${isOpen ? "mobile-open" : ""} ${collapsed ? "collapsed" : ""}`}
    >
      <div className="sidebar-logo-container" style={{ padding: collapsed ? "1.5rem 0.75rem" : "1.5rem" }}>
        {!collapsed && (
          <div>
            <h2 style={{ margin: 0, color: "var(--primary)" }}>Medaxas</h2>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>by Divocco</span>
          </div>
        )}
        {/* Close Button on Mobile */}
        <button 
          className="menu-toggle-btn" 
          onClick={() => setIsOpen(false)} 
          style={{ display: isOpen ? "block" : "none" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav" style={{ padding: collapsed ? "1.5rem 0.5rem" : "1.5rem 1rem" }}>
        {links.map((link) => {
          const isTrueActive = 
            link.href === "/dashboard" 
              ? pathname === "/dashboard" 
              : pathname === link.href || pathname.startsWith(link.href + "/");
              
          const isPendingActive = clickedHref === link.href && !isTrueActive;
          const isActive = isTrueActive || (clickedHref === link.href);

          return (
            <Link
              key={link.name}
              href={link.href}
              className={`sidebar-link ${isActive ? "active" : ""}`}
              style={{
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "0.75rem 0.5rem" : "0.75rem 1rem",
                gap: collapsed ? "0" : "0.75rem",
              }}
              onClick={(e) => {
                if (pathname === link.href) {
                  setIsOpen(false);
                  return;
                }
                setClickedHref(link.href);
                setIsOpen(false); 
                if (onNavigate) onNavigate(`Loading ${link.name}...`);
              }}
              title={collapsed ? link.name : undefined}
            >
              <span style={{ fontSize: "1.1rem" }}>{link.icon}</span>
              {!collapsed && <span style={{ flexGrow: 1 }}>{link.name}</span>}
              {isPendingActive && !collapsed && (
                <span className="spinner" style={{ width: "1rem", height: "1rem", borderWidth: "2px" }} />
              )}
            </Link>
          );
        })}
      </nav>
      
      <div className="sidebar-footer">
        <button 
          type="button"
          onClick={handleLogout}
          className="sidebar-link text-danger"
          style={{ 
            width: "100%", 
            border: "none", 
            background: "transparent", 
            cursor: "pointer",
            textAlign: collapsed ? "center" : "left",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "0.75rem 0.5rem" : "0.75rem 1rem",
          }}
          title={collapsed ? "Log out" : undefined}
        >
          {collapsed ? "↩" : "Log out"}
        </button>
      </div>
      <button
        type="button"
        className="sidebar-collapse-btn"
        onClick={onToggle}
        title={collapsed ? "Expand menu" : "Collapse menu"}
      >
        {collapsed ? "»" : "«"}
      </button>
    </aside>
  );
}
