"use client";

import Sidebar from "@/components/Sidebar";
import { fetchCurrentUser } from "@/lib/api";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isImportRoute = pathname.startsWith("/dashboard/items/import");
  const [collapsed, setCollapsed] = useState(isImportRoute);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    setCollapsed(isImportRoute);
  }, [isImportRoute, pathname]);

  useEffect(() => {
    fetchCurrentUser().then((user) => {
      if (user?.is_admin) {
        router.replace("/admin/users");
      }
    });
  }, [router]);

  function handleToggle() {
    if (!isImportRoute) return;
    setCollapsed((prev) => !prev);
  }

  function onTouchStart(e: React.TouchEvent<HTMLElement>) {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: React.TouchEvent<HTMLElement>) {
    if (!isImportRoute || touchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (deltaX > 60) setCollapsed(false); // swipe right to expand
    if (deltaX < -60) setCollapsed(true); // swipe left to collapse
  }

  return (
    <div style={styles.layout}>
      <Sidebar collapsed={collapsed} onToggle={handleToggle} canToggle={isImportRoute} />
      <main
        style={{
          ...styles.main,
          marginLeft: collapsed ? "72px" : "250px",
          padding: isImportRoute ? "1rem" : "2rem",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          style={{
            ...styles.contentContainer,
            maxWidth: isImportRoute ? "100%" : "1200px",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "var(--background)",
  },
  main: {
    flex: 1,
    marginLeft: "250px",
    padding: "2rem",
  },
  contentContainer: {
    maxWidth: "1200px",
    margin: "0 auto",
  }
};
