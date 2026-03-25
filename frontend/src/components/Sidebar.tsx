"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: "Overview", href: "/dashboard" },
    { name: "Items", href: "/dashboard/items" },
    { name: "Stock Counts", href: "/dashboard/stock-counts" },
    { name: "Sales Orders", href: "/dashboard/sales-orders" },
  ];

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <h2 style={{ margin: 0, color: "var(--primary)" }}>Medaxas</h2>
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>by Divocco</span>
      </div>

      <nav style={styles.nav}>
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
              }}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>
      
      <div style={styles.footer}>
        <Link href="/login" style={{...styles.link, color: "var(--danger)"}}>
          Log out
        </Link>
      </div>
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
