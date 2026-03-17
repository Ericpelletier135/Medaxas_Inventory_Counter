"use client";

import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.contentContainer}>
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
    marginLeft: "250px", /* Match sidebar width */
    padding: "2rem",
  },
  contentContainer: {
    maxWidth: "1200px",
    margin: "0 auto",
  }
};
