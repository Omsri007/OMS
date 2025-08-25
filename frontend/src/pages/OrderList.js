// [No changes in imports or state declarations]
import { useState, useEffect, useCallback, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../App"; // ✅ Import AuthContext
import axios from "axios";
import "./OrderList.css";

// 🔒 Permanent partnerShop mapping for City users
const cityPincodeMap = {
  387325: "Ahmedabad_387325",
  212208: "Allahabad_212208",
  462001: "Bhopal_462001",
  452002: "Indore_452002",
  226020: "Lucknow_226020",
  144003: "Ludhiana_144003",
};

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    orderDate: "",
    oldItemStatus: "",
    buybackCategory: "",
    partnerShop: "",
    trackingId: "",
    deliveryDate: "",
  });
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [balances, setBalances] = useState({ best: "-", top: "-", peak: "-" });
  const [selectedReason, setSelectedReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [orderLabelImage, setOrderLabelImage] = useState(null);
  const [orderImages, setOrderImages] = useState([]);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [range, setRange] = useState("1-100");

  console.log("Selected reason:", selectedReason);

  const { user } = useContext(AuthContext); // ✅ Use global context

  const [showPopup, setShowPopup] = useState(false); // ✅ Popup state

  // ✅ When City user logs in, force partnerShop filter
  useEffect(() => {
    if (user?.role === "city" && user?.cityPincode) {
      const mappedPartnerShop = cityPincodeMap[user.cityPincode];
      if (mappedPartnerShop) {
        setFilters((prev) => ({
          ...prev,
          partnerShop: mappedPartnerShop,
        }));
      }
    }
  }, [user]);

  const fetchBalances = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/balances`);
      const balanceMap = { best: "-", top: "-", peak: "-" };

      response.data.balances.forEach((b) => {
        const to = b.to.toLowerCase(); // normalize casing
        if (to.includes("best@bestiam.in")) balanceMap.best = b.balance;
        if (to.includes("top@bestiam.in")) balanceMap.top = b.balance;
        if (to.includes("peak@bestiam.in")) balanceMap.peak = b.balance;
      });

      setBalances(balanceMap); // ✅ THIS IS THE CORRECT STATE SETTER
    } catch (err) {
      console.error("❌ Error fetching balances:", err);
    }
  };

  const fetchOrders = useCallback(
    async (pageNum) => {
      setLoading(true);
      try {
        const adjustedFilters = {
          ...filters,
          orderDate: filters.orderDate ? filters.orderDate.trim() : "",
          deliveryDate: filters.deliveryDate ? filters.deliveryDate.trim() : "",
        };

        let limit = 50;
        let skip = (pageNum - 1) * limit;

        // ✅ Apply ranges except for "All"
        if (range !== "All") {
          const [start, end] = range.split("-").map(Number);
          const totalLimit = end - start + 1;

          // override page/limit
          skip = start - 1;
          limit = totalLimit;
        }

        const params = new URLSearchParams({
          page: pageNum,
          limit,
          skip,
          ...Object.fromEntries(
            Object.entries(adjustedFilters).filter(([_, v]) => v)
          ),
        });

        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/orders?${params}`,
          {
            withCredentials: true,
          }
        );

        const newOrders = Array.isArray(response.data.orders)
          ? response.data.orders
          : [];
        const more = response.data.hasMore ?? false;

        setOrders((prev) =>
          range === "All" ? [...prev, ...newOrders] : newOrders
        );
        setHasMore(range === "All" ? more : false); // ✅ only "All" allows load more
      } catch (error) {
        console.error(
          "Error fetching orders:",
          error.response?.data || error.message
        );
        setError("Unable to fetch orders from the API.");
      } finally {
        setLoading(false);
      }
    },
    [filters, range]
  );

  const searchOrderById = async (input) => {
    setSearching(true);
    setLoading(true);
    setOrders([]); // Clear current results before search

    try {
      const trimmedInput = input.trim().replace(/\s+/g, " ");
      const encodedIds = encodeURIComponent(trimmedInput);

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/orders/searchByIds?ids=${encodedIds}`,
        {
          withCredentials: true,
        }
      );

      console.log("📦 Backend response data:", response.data);

      if (Array.isArray(response.data.orders)) {
        setOrders(response.data.orders);
      } else {
        setOrders([]);
      }

      setHasMore(false);
    } catch (error) {
      console.error(
        "Error during API call:",
        error.response?.data || error.message
      );
      setOrders([]);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  useEffect(() => {
    fetchBalances(); // Initial load

    const interval = setInterval(fetchBalances, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval); // Clean up
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setOrders([]);
      setPage(1);
      setHasMore(true);
    } else {
      setHasMore(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    setOrders([]);
    setPage(1);
    fetchOrders(1);
  }, [range, fetchOrders]);

  useEffect(() => {
    if (!searchTerm.trim() && !searching) {
      fetchOrders(page);
    }
  }, [page, searchTerm, searching, filters, fetchOrders]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      const trimmed = searchTerm.trim();
      if (trimmed) {
        searchOrderById(trimmed);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const cleanTrackingId = (trackingId) => {
    if (!trackingId) return "-";
    return trackingId.toString().replace(/[^0-9]/g, "");
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setOrders([]);
    setPage(1);
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // const handlePrint = (orderId) => {
  //   const printWindow = window.open(
  //     `/orders/${orderId}`,
  //     "_blank",
  //     "width=800,height=600"
  //   );
  //   if (!printWindow) return;
  //   printWindow.onload = () => {
  //     setTimeout(() => {
  //       printWindow.print();
  //       printWindow.close();
  //     }, 1000);
  //   };
  // };

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.REACT_APP_API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      localStorage.removeItem("token");

      // Full reload to MainLogin
      window.location.href = `${process.env.REACT_APP_FRONTEND_URL}/MainLogin`;
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleActionChange = async (orderId, newStatus, lock = false) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/orders/${orderId}/action-status`,
        { status: newStatus, lock },
        { withCredentials: true }
      );

      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? {
                ...o,
                actionStatus: newStatus,
                locked: lock || newStatus !== "not_received",
              }
            : o
        )
      );
    } catch (err) {
      console.error("❌ Failed to update action status:", err);
    }
  };

  const filteredOrders = orders;

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
      <nav className="flex justify-between items-center p-4 bg-indigo-600 text-white">
        <div className="text-lg font-bold">LOGO</div>
        <div>
          {user?.role === "admin" ? (
            <>
              <Link to="/dashboard" className="nav-link mrgn">
                Home
              </Link>
              <Link to="/orders" className="nav-link mrgn">
                Orders List
              </Link>
              <Link to="/uploads" className="nav-link mrgn">
                Files
              </Link>
              <Link to="/add-order" className="nav-link mrgn">
                Add Orders
              </Link>
              <Link to="/ReviewPage" className="nav-link mrgn">
                Review Orders
              </Link>
              <Link to="/OrderStatus" className="nav-link mrgn">
                Order Status
              </Link>
              <Link to="/CityPincodeCreate" className="nav-link mrgn">
                Create User Account
              </Link>
            </>
          ) : (
            <>
              <Link to="/uploads" className="nav-link mrgn">
                Files
              </Link>
              <button onClick={handleLogout} className="nav-button">
                User Logout
              </button>
            </>
          )}
        </div>
      </nav>

      {user?.role !== "city" && (
        <div className="balance-summary-container">
          <table className="balance-summary-table">
            <tbody>
              <tr>
                <td className="balance-cell">
                  <span className="label">L1 (Peak):</span> {balances.peak}
                </td>
                <td className="balance-cell">
                  <span className="label">L2 (Top):</span> {balances.top}
                </td>
                <td className="balance-cell">
                  <span className="label">M1 (Best):</span> {balances.best}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col justify-center items-center mrgn">
        <h1 className="text-4xl mb-8 font-bold">List of Orders</h1>

        <div className="search-container mb-4">
          <input
            type="text"
            placeholder="Search Order ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-button"
              onClick={() => setSearchTerm("")}
            >
              &times;
            </button>
          )}
        </div>

        <div className="mb-6 w-full flex items-start gap-4 px-4 gp">
          <div className="pt-1 font-semibold text-black whitespace-nowrap mg">
            Filters:
          </div>
          <div className="grid grid-cols-2 gap-2 flex-grow">
            <div className="relative">
              <input
                name="orderDate"
                type="date"
                value={filters.orderDate}
                onChange={handleFilterChange}
                className="px-2 py-1 rounded pr-6"
              />
              {filters.orderDate && (
                <button
                  type="button btn-date"
                  onClick={() =>
                    handleFilterChange({
                      target: { name: "orderDate", value: "" },
                    })
                  }
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-600 text-sm btn-date"
                >
                  ×
                </button>
              )}
            </div>

            <div className="relative">
              <input
                name="oldItemStatus"
                placeholder="Old Item Status"
                value={filters.oldItemStatus}
                onChange={handleFilterChange}
                className="px-2 py-1 rounded pr-6 mg-filter"
              />
              {filters.oldItemStatus && (
                <button
                  type="button"
                  onClick={() =>
                    handleFilterChange({
                      target: { name: "oldItemStatus", value: "" },
                    })
                  }
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-600 text-sm btn-date"
                >
                  ×
                </button>
              )}
            </div>

            <div className="relative">
              <input
                name="buybackCategory"
                placeholder="Buyback Category"
                value={filters.buybackCategory}
                onChange={handleFilterChange}
                className="px-2 py-1 rounded pr-6 mg-filter"
              />
              {filters.buybackCategory && (
                <button
                  type="button"
                  onClick={() =>
                    handleFilterChange({
                      target: { name: "buybackCategory", value: "" },
                    })
                  }
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-600 text-sm btn-date"
                >
                  ×
                </button>
              )}
            </div>

            {/* Show partnerShop filter only for non-City users */}
            {user?.role !== "city" && (
              <div className="relative">
                <input
                  name="partnerShop"
                  placeholder="Partner Shop"
                  value={filters.partnerShop}
                  onChange={handleFilterChange}
                  className="px-2 py-1 rounded pr-6 mg-filter"
                />
                {filters.partnerShop && (
                  <button
                    type="button"
                    onClick={() =>
                      handleFilterChange({
                        target: { name: "partnerShop", value: "" },
                      })
                    }
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-600 text-sm btn-date"
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            <div className="relative">
              <input
                name="trackingId"
                placeholder="Tracking ID"
                value={filters.trackingId}
                onChange={handleFilterChange}
                className="px-2 py-1 rounded pr-6 mg-filter"
              />
              {filters.trackingId && (
                <button
                  type="button"
                  onClick={() =>
                    handleFilterChange({
                      target: { name: "trackingId", value: "" },
                    })
                  }
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-600 text-sm btn-date"
                >
                  ×
                </button>
              )}
            </div>

            <div className="relative">
              <input
                name="deliveryDate"
                type="date"
                value={filters.deliveryDate}
                onChange={handleFilterChange}
                className="px-2 py-1 rounded pr-6 mg-filter"
              />
              {filters.deliveryDate && (
                <button
                  type="button"
                  onClick={() =>
                    handleFilterChange({
                      target: { name: "deliveryDate", value: "" },
                    })
                  }
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-600 text-sm btn-date"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        <div className="range-buttons-container">
          {["1-100", "100-500", "500-1000", "All"].map((r) => (
            <button
              key={r}
              className={`range-button ${range === r ? "active" : ""}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="w-full flex flex-col items-center">
          <div className="w-11/12">
            <table className="table-auto w-full">
              <thead>
                <tr className="bg-indigo-500 text-white">
                  <th className="p-2">Order ID</th>
                  <th className="p-2">Order Date</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Buyback Category</th>
                  <th className="p-2">Partner Shop</th>
                  <th className="p-2">Old Item Details</th>
                  <th className="p-2">Base Discount</th>
                  <th className="p-2">Tracking ID</th>
                  <th className="p-2">Delivery Date</th>
                  <th className="p-2">Action</th>
                  {/* <th className="p-2">Print</th> */}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr
                      key={order._id || order.orderId}
                      className="hover:bg-gray-200"
                    >
                      <td className="p-2 text-center">
                        <Link
                          to={`/orders/${order.orderId}`}
                          target="_blank"
                          className="text-blue-500 hover:text-blue-700 underline"
                        >
                          {order.orderId || "-"}
                        </Link>
                      </td>
                      <td className="p-2 text-center">
                        {formatDate(order.orderDate)}
                      </td>
                      <td className="p-2 text-center">
                        {order.oldItemStatus || "-"}
                      </td>
                      <td className="p-2 text-center">
                        {order.buybackCategory || "-"}
                      </td>
                      <td className="p-2 text-center">
                        {order.partnerShop || "-"}
                      </td>
                      <td className="p-2 text-center">
                        {order.oldItemDetails || "-"}
                      </td>
                      <td className="p-2 text-center">
                        {order.baseDiscount ? `₹${order.baseDiscount}` : "-"}
                      </td>
                      <td className="p-2 text-center">
                        {cleanTrackingId(order.trackingId)}
                      </td>
                      <td className="p-2 text-center">
                        {formatDate(order.deliveryDate)}
                      </td>
                      <td className="action-cell">
                        {user?.role === "city" ? (
                          <>
                            {!order.actionStatus ? (
                              <div className="action-buttons">
                                <button
                                  onClick={() =>
                                    handleActionChange(
                                      order.orderId,
                                      "received"
                                    )
                                  }
                                  className="btn-received"
                                >
                                  ✔️
                                </button>
                                <button
                                  onClick={() =>
                                    handleActionChange(
                                      order.orderId,
                                      "not_received"
                                    )
                                  }
                                  className="btn-not-received"
                                >
                                  ✖️
                                </button>
                                {/* ✅ Review instead of Returned */}
                                <button
                                  onClick={() => {
                                    handleActionChange(order.orderId, "review"); // 🔒 Lock in DB
                                    setCurrentOrderId(order.orderId);
                                    setShowPopup(true); // 🔍 Open popup
                                  }}
                                  className="btn-review"
                                >
                                  🔍 Review
                                </button>
                              </div>
                            ) : order.actionStatus === "not_received" &&
                              !order.locked ? (
                              <div className="action-buttons">
                                <span className="status-not-received">
                                  ✖️ Not Received
                                </span>
                                <button
                                  onClick={() =>
                                    handleActionChange(
                                      order.orderId,
                                      "received",
                                      true
                                    )
                                  }
                                  className="btn-received"
                                >
                                  ✔️
                                </button>
                              </div>
                            ) : (
                              <span
                                className={
                                  order.actionStatus === "received"
                                    ? "status-received"
                                    : order.actionStatus === "not_received"
                                    ? "status-not-received"
                                    : "status-review"
                                }
                              >
                                {order.actionStatus === "received"
                                  ? "✔️ Received"
                                  : order.actionStatus === "not_received"
                                  ? "✖️ Not Received"
                                  : "🔍 Review"}
                              </span>
                            )}
                          </>
                        ) : (
                          <span>
                            {order.actionStatus
                              ? order.actionStatus === "received"
                                ? "✔️ Received"
                                : order.actionStatus === "not_received"
                                ? "✖️ Not Received"
                                : order.actionStatus === "returned"
                                ? "↪ Returned"
                                : order.actionStatus === "review"
                                ? "🔍 Review" // ✅ show proper label
                                : order.actionStatus // fallback
                              : "No Action"}
                          </span>
                        )}
                      </td>
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
                    <td colSpan="11" className="text-center p-4">
                      {loading ? "Searching..." : "No matching orders found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ✅ Show Load More only for "All" */}
        {range === "All" && hasMore && !loading && !searching && (
          <div className="text-center mt-4">
            <button
              onClick={() => setPage((prev) => prev + 1)}
              className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
            >
              Load More
            </button>
          </div>
        )}

        {/* ✅ Status messages */}
        {loading && (
          <div className="text-center mt-4 text-gray-600">Loading...</div>
        )}
        {range === "All" && !hasMore && !loading && !searching && (
          <div className="text-center mt-4 text-green-600">
            ✅ All orders loaded.
          </div>
        )}

        {/* ✅ Popup Overlay */}
        {showPopup && (
          <div className="popup-overlay">
            <div className="popup-box">
              <button
                onClick={() => setShowPopup(false)}
                className="popup-close"
              >
                ✖
              </button>
              <h2 className="popup-title">Review Details</h2>

              {/* Radio buttons */}
              <div className="popup-options">
                <label>
                  <input
                    type="radio"
                    name="reviewReason"
                    value="damage_accepted"
                    onChange={(e) => setSelectedReason(e.target.value)}
                  />
                  Damage Accepted
                </label>
                <label>
                  <input
                    type="radio"
                    name="reviewReason"
                    value="returned_accepted"
                    onChange={(e) => setSelectedReason(e.target.value)}
                  />
                  Returned Accepted
                </label>
                <label>
                  <input
                    type="radio"
                    name="reviewReason"
                    value="product_mismatched"
                    onChange={(e) => setSelectedReason(e.target.value)}
                  />
                  Product Mismatched
                </label>
              </div>

              {/* Remarks */}
              <div className="popup-remarks">
                <h3 className="popup-remarks-title">Remarks</h3>
                <textarea
                  className="popup-textarea"
                  placeholder="Enter remarks here..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              {/* Order Label Image */}
              <div className="popup-upload">
                <h3 className="popup-upload-title">Order Label Image</h3>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setOrderLabelImage(e.target.files[0])}
                />
              </div>

              {/* Two Orders Images */}
              <div className="popup-upload">
                <h3 className="popup-upload-title">Two Orders Images</h3>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    if (files.length === 2) {
                      setOrderImages(files);
                    } else {
                      alert("Please upload exactly 2 images.");
                      e.target.value = null; // reset input
                    }
                  }}
                />
              </div>

              {/* ✅ Save button goes here */}
              <button
                className="popup-save"
                onClick={async () => {
                  if (!selectedReason) {
                    alert("Please select a reason.");
                    return;
                  }
                  if (!orderLabelImage) {
                    alert("Please upload the label image.");
                    return;
                  }
                  if (orderImages.length !== 2) {
                    alert("Please upload exactly 2 order images.");
                    return;
                  }

                  const formData = new FormData();
                  formData.append("reason", selectedReason);
                  formData.append("remarks", remarks);
                  formData.append("labelImage", orderLabelImage);
                  orderImages.forEach((img) => {
                    formData.append("orderImages", img); // must match backend field name
                  });
                  try {
                    await axios.post(
                      `${process.env.REACT_APP_API_URL}/api/orders/${currentOrderId}/review`,
                      formData,
                      {
                        headers: { "Content-Type": "multipart/form-data" },
                      }
                    );
                    alert("Review saved successfully!");
                    setShowPopup(false);
                  } catch (err) {
                    console.error("Error saving review:", err);
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderList;
