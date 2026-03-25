export default function DashboardOverview() {
  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ color: "var(--primary)" }}>Dashboard</h1>
        <p style={{ color: "var(--text-secondary)" }}>Overview of your inventory counts</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Items</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Create and manage your item catalogue.</p>
          <a href="/dashboard/items" className="btn-primary">Manage Items</a>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Vendors</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Manage your list of suppliers and contacts.</p>
          <a href="/dashboard/vendors" className="btn-primary">Manage Vendors</a>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Stock Counts</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Manage physical inventory counts.</p>
          <a href="/dashboard/stock-counts" className="btn-primary">View Sessions</a>
        </div>
        
        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Sales Orders</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Review generated purchase orders.</p>
          <a href="/dashboard/sales-orders" className="btn-primary">View Orders</a>
        </div>
      </div>
    </div>
  );
}
