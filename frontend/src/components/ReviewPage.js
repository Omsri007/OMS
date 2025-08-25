// [No changes in imports or state declarations]
import { useState, useEffect, useCallback, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../App"; // ✅ Import AuthContext
import axios from "axios";
import "./ReviewPage.css";

// 🔒 Permanent partnerShop mapping for City users
const cityPincodeMap = {
  387325: "Ahmedabad_387325",
  212208: "Allahabad_212208",
  462001: "Bhopal_462001",
  452002: "Indore_452002",
  226020: "Lucknow_226020",
  144003: "Ludhiana_144003",
};

const Review = () => {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    orderDate: "",
    oldItemStatus: "",
    buybackCategory: "",
    partnerShop: "",
    trackingId: "",
    deliveryDate: "",
    reason: "",
  });
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  //   const [selectedReason] = useState("");
  const [reviews, setReviews] = useState({});
  const [selectedReview, setSelectedReview] = useState(null); // 🔽 For popup modal

  const { user } = useContext(AuthContext); // ✅ Use global context

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

  const fetchOrders = useCallback(
    async (pageNum = 1, reasonFilter = "") => {
      setLoading(true);
      try {
        const adjustedFilters = {
          ...filters,
          orderDate: filters.orderDate ? filters.orderDate.trim() : "",
          deliveryDate: filters.deliveryDate ? filters.deliveryDate.trim() : "",
        };

        const params = new URLSearchParams({
          page: pageNum,
          limit: 50,
          ...Object.fromEntries(
            Object.entries(adjustedFilters).filter(([_, v]) => v)
          ),
        });

        const url = `${process.env.REACT_APP_API_URL}/api/reviews/filter?${params}`;

        const response = await axios.get(url, {
          withCredentials: true,
        });

        const data = response.data;
        const newOrders = Array.isArray(data.orders) ? data.orders : [];
        const more = data.hasMore ?? false;

        setOrders((prev) =>
          pageNum === 1 ? newOrders : [...prev, ...newOrders]
        );
        setHasMore(more);

        newOrders.forEach((order) => {
          if (order.review) {
            setReviews((prev) => ({
              ...prev,
              [order.orderId]: order.review,
            }));
          }
        });
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
    [filters]
  );

  //   const fetchFilteredByReason = async (reason) => {
  //     try {
  //       const res = await axios.get(
  //         `${process.env.REACT_APP_API_URL}/api/reviews/filter?reason=${reason}`
  //       );
  //       setOrders(res.data); // orders already include review
  //     } catch (err) {
  //       console.error("Error fetching filtered reviews:", err);
  //     }
  //   };

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
    if (!searchTerm.trim()) {
      setOrders([]);
      setPage(1);
      setHasMore(true);
    } else {
      setHasMore(false);
    }
  }, [searchTerm]);

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

    // 🔽 If reason filter changed, fetch filtered data
    if (name === "reason") {
      if (value) {
        fetchOrders(1, value); // fetch filtered by reason
      } else {
        fetchOrders(1); // fetch all orders if cleared
      }
    }
  };

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

      <div className="flex flex-col justify-center items-center mrgn">
        <h1 className="text-4xl mb-8 font-bold">Review Orders</h1>

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

            {/* 🔽 Action Filter (Reason from Reviews) */}
            <div className="relative">
              <select
                name="reason"
                value={filters.reason || ""}
                onChange={handleFilterChange}
                className="px-2 py-1 rounded pr-6 mg-filter"
              >
                <option value="">Action</option>
                <option value="damage_accepted">Damage Accepted</option>
                <option value="returned_accepted">Returned Accepted</option>
                <option value="product_mismatched">Product Mismatched</option>
              </select>

              {filters.reason && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, reason: "" }));
                    setOrders([]);
                    setHasMore(true);
                    setPage(1);
                    fetchOrders(1);
                  }}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-600 text-sm btn-date"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {error && <div className="text-red-500 mb-4">{error}</div>}

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
                      <td className="p-2 text-center">
                        {reviews[order.orderId] ? (
                          <div className="flex flex-col items-center">
                            {/* Show reason text */}
                            <span className="text-sm text-gray-700 mb-1">
                              {reviews[order.orderId].reason}
                            </span>

                            {/* More button */}
                            <button
                              onClick={() =>
                                setSelectedReview(reviews[order.orderId])
                              }
                              className="review-toggle-btn"
                            >
                              More
                            </button>
                          </div>
                        ) : (
                          <span className="review-empty">No Review</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center p-4">
                      {loading ? "Searching..." : "No matching orders found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {hasMore && !loading && !searching && (
          <div className="text-center mt-4">
            <button
              onClick={() => setPage((prev) => prev + 1)}
              className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
            >
              Load More
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center mt-4 text-gray-600">Loading...</div>
        )}

        {!hasMore && !loading && !searching && (
          <div className="text-center mt-4 text-green-600">
            ✅ All orders loaded.
          </div>
        )}

        {/* --- Popup Modal --- */}
        {selectedReview && (
          <div
            className="modal-overlay"
            onClick={() => setSelectedReview(null)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="modal-close"
                onClick={() => setSelectedReview(null)}
              >
                &times;
              </button>
              <h2 className="modal-title">Review Details</h2>
              <p>
                <strong>Reason:</strong> {selectedReview.reason}
              </p>
              <p>
                <strong>Remarks:</strong> {selectedReview.remarks || "-"}
              </p>

              {/* Label Image */}
              {selectedReview.labelImage && (
                <div className="review-section">
                  <strong>Label Image:</strong>
                  <a
                    href={`${process.env.REACT_APP_API_URL}${encodeURI(
                      selectedReview.labelImage
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={`${process.env.REACT_APP_API_URL}${encodeURI(
                        selectedReview.labelImage
                      )}`}
                      alt="Label"
                      className="review-label-img"
                    />
                  </a>
                </div>
              )}

              {/* Order Images */}
              {selectedReview.orderImages &&
                selectedReview.orderImages.length > 0 && (
                  <div className="review-section">
                    <strong>Order Images:</strong>
                    <div className="review-order-images">
                      {selectedReview.orderImages.map((img, i) => (
                        <a
                          key={i}
                          href={`${process.env.REACT_APP_API_URL}${encodeURI(img)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={`${process.env.REACT_APP_API_URL}${encodeURI(img)}`}
                            alt={`Order ${i}`}
                            className="review-order-img"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Review;
