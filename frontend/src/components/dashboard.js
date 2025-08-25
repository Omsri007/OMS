import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./dashboard.css";

function Dashboard() {
  const [searchText, setSearchText] = useState("");
  const [balances, setBalances] = useState({ best: "-", top: "-", peak: "-" });
  const [monthlySummary, setMonthlySummary] = useState([]);


  const fetchBalances = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/balances`
      );
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

  useEffect(() => {
    fetchBalances(); // Initial load

    const interval = setInterval(fetchBalances, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval); // Clean up
  }, []);

  useEffect(() => {
    const fetchMonthlySummary = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/orders/monthly-summary`,
          { withCredentials: true }
        );
        setMonthlySummary(res.data || []);
      } catch (err) {
        console.error("Error fetching monthly summary:", err);
      }
    };
    fetchMonthlySummary();
  }, []);

  const maxValue =
    monthlySummary.length > 0
      ? Math.max(...monthlySummary.map((d) => Math.max(d.total, d.received)))
      : 0;

  const handleGmailLogout = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/orders/logout`,
        {},
        { withCredentials: true }
      );
       window.location.href = `${process.env.REACT_APP_FRONTEND_URL}/GmailPage`;
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.REACT_APP_API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      // Clear frontend token
      localStorage.removeItem("token");

      // Full reload to MainLogin
      window.location.href = `${process.env.REACT_APP_FRONTEND_URL}/MainLogin`;
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleClear = () => setSearchText("");

  return (
    <div className="dashboard-app-layout">
      {/* Left Sidebar */}
      <div className="dashboard-collaboration-sidebar">
        {/* Hamburger Menu */}
        <div className="dashboard-hamburger-menu">
          <span className="line"></span>
          <span className="line"></span>
          <span className="line"></span>
        </div>

        <div className="flex flex-col gap-2 dashboard-dp">
          <Link to="/dashboard" className="dashboard-collaboration-link">
            Home
          </Link>

          <Link to="/orders" className="dashboard-collaboration-link">
            Order List
          </Link>

          <Link to="/add-order" className="dashboard-collaboration-link">
            Add Order
          </Link>

          <Link to="/uploads" className="dashboard-collaboration-link">
            Files
          </Link>

          <Link to="/ReviewPage" className="dashboard-collaboration-link">
            Review Orders
          </Link>

          <Link to="/OrderStatus" className="dashboard-collaboration-link">
            Order Status
          </Link>

          <Link to="/CityPincodeCreate" className="dashboard-collaboration-link">
            Create User Account
          </Link>
        </div>
        <button
          onClick={handleLogout}
          className=" dashboard-nav-button dashboard-nav-button-mrgn"
        >
          Admin Logout
        </button>
        <button
          onClick={handleGmailLogout}
          className="dashboard-nav-button dashboard-nav-button-mrgn-extra"
        >
          Gmail Logout
        </button>
      </div>

      {/* Right Content Area */}
      <div className="dashboard-main">
        <nav className="dashboard-navbar">
          {/* Search Bar */}
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
                <button
                  className="dashboard-clear-button"
                  onClick={handleClear}
                >
                  <X className="dashboard-clear-icon" />
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Balance Summary Section */}
        <div className="dashboard-balance-summary-container">
          <table className="dashboard-balance-summary-table">
            <tbody>
              <tr>
                <td className="dashboard-balance-cell">
                  <span className="dashboard-label">L1 (Peak):</span>{" "}
                  {balances.peak}
                </td>
                <td className="dashboard-balance-cell">
                  <span className="dashboard-label">L2 (Top):</span>{" "}
                  {balances.top}
                </td>
                <td className="dashboard-balance-cell">
                  <span className="dashboard-label">M1 (Best):</span>{" "}
                  {balances.best}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* DNR Orders Section */}
        <div className="dashboard-balance-summary-container">
          <h3 className="dashboard-label" style={{ marginBottom: "12px" }}>
            DNR Orders
          </h3>
          <table className="dashboard-balance-summary-table">
            <thead>
              <tr>
                <th className="dashboard-balance-cell">Count</th>
                <th className="dashboard-balance-cell">Purchase</th>
                <th className="dashboard-balance-cell">Sale</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="dashboard-balance-cell">-</td>
                <td className="dashboard-balance-cell">
                  Purchase Amount + Delivery Charges (118/-)
                </td>
                <td className="dashboard-balance-cell">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Unbilled Orders Section */}
        <div className="dashboard-balance-summary-container">
          <h3 className="dashboard-label" style={{ marginBottom: "12px" }}>
            Unbilled Orders
          </h3>

          {/* Filter Checkboxes */}
          <div className="dashboard-dnr-filter">
            <label className="dashboard-dnr-checkbox">
              <input type="checkbox" />
              <span>Greater than 30 days</span>
            </label>
            <label className="dashboard-dnr-checkbox">
              <input type="checkbox" />
              <span>Less than 30 days</span>
            </label>
          </div>

          <table className="dashboard-balance-summary-table">
            <thead>
              <tr>
                <th className="dashboard-balance-cell">Count</th>
                <th className="dashboard-balance-cell">Purchase</th>
                <th className="dashboard-balance-cell">Sale</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="dashboard-balance-cell">-</td>
                <td className="dashboard-balance-cell">-</td>
                <td className="dashboard-balance-cell">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 📊 Bar Graph Section */}
        <div className="dashboard-bar-graph-container">
          <h3 className="dashboard-label" style={{ marginBottom: "12px" }}>
            Monthly Summary (Last 13 Months)
          </h3>
          <div className="dashboard-bar-chart">
            {monthlySummary.length > 0 ? (
              monthlySummary.map((data, index) => {
                const heightPercent =
                  maxValue > 0 ? (data.total / maxValue) * 100 : 0;
                return (
                  <div key={index} className="dashboard-bar">
                    {/* total count above bar */}
                    <span className="dashboard-bar-count">({data.total})</span>
                    <div
                      className="dashboard-bar-fill"
                      style={{ height: `${heightPercent}%` }}
                      title={`${data.month}: ${data.total}`}
                    ></div>
                    <span className="dashboard-bar-label">{data.month}</span>
                  </div>
                );
              })
            ) : (
              <p>Loading monthly summary...</p>
            )}
          </div>
        </div>

        {/* 📊 Bar Graph Section for ActionStatus: received */}
        <div className="dashboard-bar-graph-container">
          <h3 className="dashboard-label" style={{ marginBottom: "12px" }}>
            Monthly Received (Last 13 Months)
          </h3>
          <div className="dashboard-bar-chart">
            {monthlySummary.length > 0 ? (
              monthlySummary.map((data, index) => {
                const heightPercent =
                  maxValue > 0 ? (data.received / maxValue) * 500 : 0;
                return (
                  <div key={index} className="dashboard-bar-height">
                    {/* received count above bar */}
                    <span className="dashboard-bar-count">
                      ({data.received})
                    </span>
                    <div
                      className="dashboard-bar-fill"
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: "#4caf50",
                      }}
                      title={`${data.month}: ${data.received}`}
                    ></div>
                    <span className="dashboard-bar-label">{data.month}</span>
                  </div>
                );
              })
            ) : (
              <p>Loading monthly summary...</p>
            )}
          </div>
        </div>

        {/* City-wise Balance Section */}
        <div className="dashboard-balance-summary-container">
          <h3 className="dashboard-label" style={{ marginBottom: "12px" }}>
            City-wise Balance
          </h3>
          <table className="dashboard-city-balance-table">
            <thead>
              <tr>
                <th className="dashboard-balance-cell-row">Total</th>
                <td className="dashboard-balance-cell">-</td>
                <td className="dashboard-balance-cell">-</td>
                <td className="dashboard-balance-cell">-</td>
                <td className="dashboard-balance-cell">-</td>
                <td className="dashboard-balance-cell">-</td>
                <td className="dashboard-balance-cell">-</td>
                <td className="dashboard-balance-cell">-</td>
              </tr>
              <tr>
                <th className="dashboard-balance-cell">Cities</th>
                <th className="dashboard-balance-cell">Advance</th>
                <th className="dashboard-balance-cell">
                  Total Orders Sale Value
                </th>
                <th className="dashboard-balance-cell">Received</th>
                <th className="dashboard-balance-cell">Pending</th>
                <th className="dashboard-balance-cell">Refund</th>
                <th className="dashboard-balance-cell">Current Balance</th>
                <th className="dashboard-balance-cell">Login</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="dashboard-balance-cell-row">Ahmedabad_387325</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
              </tr>
              <tr>
                <th className="dashboard-balance-cell-row">Allahabad_212208</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
              </tr>
              <tr>
                <th className="dashboard-balance-cell-row">Bhopal_462001</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
              </tr>
              <tr>
                <th className="dashboard-balance-cell-row">Indore_452002</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
              </tr>
              <tr>
                <th className="dashboard-balance-cell-row">Lucknow_226020</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
              </tr>
              <tr>
                <th className="dashboard-balance-cell-row">Ludhiana_144003</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
                <th className="dashboard-balance-cell">-</th>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
