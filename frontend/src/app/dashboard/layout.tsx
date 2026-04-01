"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import LoadingView from "@/components/LoadingView";
import { fetchWithAuth } from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  
  // States from 'main' (Collapsing / Admin Check)
  const isImportRoute = pathname.startsWith("/dashboard/items/import");
  const [collapsed, setCollapsed] = useState(isImportRoute);
  
  // States from 'mobile-responsiveness' (Mobile Toggle / Loading Curtain)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [transitionMsg, setTransitionMsg] = useState<string | null>(null);

  useEffect(() => {
    setCollapsed(isImportRoute);
  }, [isImportRoute, pathname]);

  // Handle route changes
  useEffect(() => {
    setTransitionMsg(null);
    setIsSidebarOpen(false);
  }, [pathname]);

  // Admin redirect logic from 'main'
  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetchWithAuth("/api/users/me");
        if (res.ok) {
          const user = await res.json();
          if (user?.is_admin) {
            router.replace("/admin/users");
          }
        }
      } catch (err) {
        console.error("Auth check failed", err);
      }
    }
    checkAdmin();
  }, [router]);

  function handleToggleSidebar() {
    setCollapsed((prev) => !prev);
  }

  return (
    <div className="dashboard-layout">
      {/* Overlay for mobile sidebar */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? "mobile-open" : ""}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        onNavigate={(msg) => setTransitionMsg(msg)}
        collapsed={collapsed}
        onToggle={handleToggleSidebar}
        canToggle={isImportRoute}
      />
      
      <main 
        className="dashboard-main"
        style={{ 
          marginLeft: (typeof window !== 'undefined' && window.innerWidth > 768) 
            ? (collapsed ? "72px" : "250px") 
            : "0" 
        }}
      >
        {/* Mobile Header with Hamburger Menu */}
        <div className="mobile-header">
          <h2 style={{ margin: 0, color: "var(--primary)" }}>Medaxas</h2>
          <button 
            className="menu-toggle-btn" 
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Toggle Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="w-full">
          {transitionMsg ? (
            <div className="flex-col w-full h-full justify-center items-center" style={{ minHeight: "50vh" }}>
              <LoadingView message={transitionMsg} />
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
