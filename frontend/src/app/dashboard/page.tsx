"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import LoadingView from "@/components/LoadingView";

export default function DashboardOverview() {
  const [transitionMsg, setTransitionMsg] = useState<string | null>(null);

  // If user hits browser 'back' button, this component remounts or restores from cache. 
  // We guarantee the loading state is completely reset.
  useEffect(() => {
    setTransitionMsg(null);
  }, []);

  if (transitionMsg) {
    return (
      <div className="flex-col w-full h-full justify-center items-center">
        <LoadingView message={transitionMsg} />
      </div>
    );
  }
  return (
    <div className="flex-col w-full h-full">
      <div className="dashboard-header">
        <div className="dashboard-header-titles">
          <h1>Dashboard</h1>
          <p>Overview of your inventory counts</p>
        </div>
      </div>

      <div className="dashboard-grid h-full w-full items-stretch">
        <div className="card flex-col h-full w-full">
          <h3 className="mb-4">Items</h3>
          <p className="text-secondary mb-6" style={{ flexGrow: 1 }}>Create and manage your item catalogue.</p>
          <div>
            <Link
              href="/dashboard/items"
              className="btn-primary"
              style={{ display: "inline-block" }}
              onClick={() => setTransitionMsg("Loading Items...")}
            >Manage Items</Link>
          </div>
        </div>

        <div className="card flex-col h-full w-full">
          <h3 className="mb-4">Vendors</h3>
          <p className="text-secondary mb-6" style={{ flexGrow: 1 }}>Manage your list of suppliers and contacts.</p>
          <div>
            <Link
              href="/dashboard/vendors"
              className="btn-primary"
              style={{ display: "inline-block" }}
              onClick={() => setTransitionMsg("Loading Vendors...")}
            >Manage Vendors</Link>
          </div>
        </div>

        <div className="card flex-col h-full w-full">
          <h3 className="mb-4">Stock Counts</h3>
          <p className="text-secondary mb-6" style={{ flexGrow: 1 }}>Manage physical inventory counts.</p>
          <div>
            <Link
              href="/dashboard/stock-counts"
              className="btn-primary"
              style={{ display: "inline-block" }}
              onClick={() => setTransitionMsg("Loading active sessions...")}
            >View Sessions</Link>
          </div>
        </div>

        {/* <div className="card flex-col h-full w-full">
          <h3 className="mb-4">Inventory</h3>
          <p className="text-secondary mb-6" style={{ flexGrow: 1 }}>
            Manage inventory levels and item status.
          </p>
          <div>
            <Link 
              href="/dashboard/items" 
              className="btn-primary" 
              style={{ display: "inline-block" }}
              onClick={() => setTransitionMsg("Loading inventory limits...")}
            >Manage Inventory</Link>
          </div>
        </div> */}

        {/* <div className="card flex-col h-full w-full">
          <h3 className="mb-4">Suppliers</h3>
          <p className="text-secondary mb-6" style={{ flexGrow: 1 }}>
            Manage suppliers and linked inventory items.
          </p>
          <div>
            <Link 
              href="/dashboard/vendors" 
              className="btn-primary" 
              style={{ display: "inline-block" }}
              onClick={() => setTransitionMsg("Loading supplier data...")}
            >Manage Suppliers</Link>
          </div>
        </div> */}

        <div className="card flex-col h-full w-full">
          <h3 className="mb-4">Sales Orders</h3>
          <p className="text-secondary mb-6" style={{ flexGrow: 1 }}>Review generated purchase orders.</p>
          <div>
            <Link
              href="/dashboard/sales-orders"
              className="btn-primary"
              style={{ display: "inline-block" }}
              onClick={() => setTransitionMsg("Loading Sales Orders...")}
            >View Orders</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
