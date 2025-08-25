import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import axios from "axios";
import "./OrderStatus.css";

const OrderStatus = () => {
  const [searchText, setSearchText] = useState("");
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [statusCounts, setStatusCounts] = useState({});
  const [selectedStatuses, setSelectedStatuses] = useState([]);

  // ✅ New: order range filter
  const [range, setRange] = useState("1-100");

  const allStatuses = [
    "In Transit","Arrival_Scan","Placed","Delivered","Received","TAT Breach","DNR","Flat-Refund","Cancelled","Declined","Not Assigned"
  ];

  const toUpperKey = (status) => status.toUpperCase();

  const fetchStatusCounts = useCallback(async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/orders/status-counts`,
        { withCredentials: true }
      );
      setStatusCounts(response.data || {});
    } catch (err) {
      console.error("Error fetching status counts:", err);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 1000 }); // fetch enough, then slice client-side
      if (selectedStatuses.length > 0) {
        params.append(
          "oldItemStatus",
          selectedStatuses.map(toUpperKey).join(",")
        );
      }
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/orders?${params}`,
        { withCredentials: true }
      );

      let newOrders = Array.isArray(response.data.orders)
        ? response.data.orders
        : [];

      // ✅ Apply range filter
      if (range !== "All") {
        const [start, end] = range.split("-").map(Number);
        newOrders = newOrders.slice(start - 1, end); // adjust index
      }

      setOrders(newOrders);
    } catch (error) {
      console.error("Error fetching orders:", error.response?.data || error.message);
      setError("Unable to fetch orders from the API.");
    } finally {
      setLoading(false);
    }
  }, [selectedStatuses, range]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchStatusCounts();
  }, [fetchStatusCounts]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  };

  const cleanTrackingId = (trackingId) => {
    if (!trackingId) return "-";
    return trackingId.toString().replace(/[^0-9]/g, "");
  };

  // const handlePrint = (orderId) => {
  //   const printWindow = window.open(`/orders/${orderId}`, "_blank", "width=800,height=600");
  //   if (!printWindow) return;
  //   printWindow.onload = () => {
  //     setTimeout(() => {
  //       printWindow.print();
  //       printWindow.close();
  //     }, 1000);
  //   };
  // };

  const handleClear = () => setSearchText("");

  return (
    <div className="app-layout">
      <div className="dashboard-main">
        {/* Navbar */}
        <nav className="Status-navbar">
          <div className="dashboard-search-container">
            <div className="dashboard-search-wrapper">
              <Search className="dashboard-search-icon" />
              <input
                type="text"
                placeholder="Search..."
                className="dashboard-search-input"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              {searchText && (
                <button className="dashboard-clear-button" onClick={handleClear}>
                  <X className="dashboard-clear-icon" />
                </button>
              )}
            </div>
          </div>
        </nav>

        <div className="min-h-screen bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
          <div className="flex flex-col justify-center items-center mrgn w-full">
            <h1 className="text-4xl mb-4 font-bold">All Order Status</h1>

            {error && <div className="text-red-500 mb-4">{error}</div>}

            {/* Filter Tabs */}
            <div className="filter-tabs-container">
              {allStatuses.map((status) => {
                const active = selectedStatuses.includes(status);
                return (
                  <button
                    key={status}
                    onClick={() => setSelectedStatuses((prev) =>
                      prev.includes(status)
                        ? prev.filter((s) => s !== status)
                        : [...prev, status]
                    )}
                    className={`filter-tab ${active ? "active" : ""}`}
                  >
                    <span className="status-spn">{status}</span> ({statusCounts[toUpperKey(status)] || 0})
                  </button>
                );
              })}
            </div>

            {/* ✅ New Range Filter Tabs */}
            <div className="OrderStatus-range-tabs-container">
              {["1-100", "100-500", "500-1000", "All"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`OrderStatus-range-tab ${range === r ? "active" : ""}`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Orders Table */}
            <div className="w-11/12 mt-4">
              <table className="table-auto w-full">
                <thead>
                  <tr className="bg-indigo-500 text-white">
                    <th className="p-2">Order ID</th>
                    <th className="p-2">Order Date</th>
                    <th className="p-2">Buyback Category</th>
                    <th className="p-2">Partner Shop</th>
                    <th className="p-2">Old Item Details</th>
                    <th className="p-2">Base Discount</th>
                    <th className="p-2">Tracking ID</th>
                    <th className="p-2">Delivery Date</th>
                    {/* <th className="p-2">Print</th> */}
                  </tr>
                </thead>
                <tbody>
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order._id || order.orderId} className="hover:bg-gray-200">
                        <td className="p-2 text-center">
                          <Link
                            to={`/orders/${order.orderId}`}
                            target="_blank"
                            className="text-blue-500 hover:text-blue-700 underline"
                          >
                            {order.orderId || "-"}
                          </Link>
                        </td>
                        <td className="p-2 text-center">{formatDate(order.orderDate)}</td>
                        <td className="p-2 text-center">{order.buybackCategory || "-"}</td>
                        <td className="p-2 text-center">{order.partnerShop || "-"}</td>
                        <td className="p-2 text-center">{order.oldItemDetails || "-"}</td>
                        <td className="p-2 text-center">{order.baseDiscount ? `₹${order.baseDiscount}` : "-"}</td>
                        <td className="p-2 text-center">{cleanTrackingId(order.trackingId)}</td>
                        <td className="p-2 text-center">{formatDate(order.deliveryDate)}</td>
                        {/* <td className="p-2 text-center">
                          <button
                            onClick={() => handlePrint(order.orderId)}
                            className="print-button bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 shadow"
                          >
                            Print
                          </button>
                        </td> */}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="text-center p-4">
                        {loading ? "Loading..." : "No matching orders found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {loading && (
              <div className="text-center mt-4 text-gray-600">Loading...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatus;
