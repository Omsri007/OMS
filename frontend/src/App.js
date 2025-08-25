import React, { useEffect, useState, createContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import OrderList from "./pages/OrderList";
import OrderDetail from "./pages/OrderDetails";
import AddOrder from "./components/AddOrder";
import GmailPage from "./components/GmailPage";
import UploadsDashboard from "./components/UploadsDashboard";
import Dashboard from "./components/dashboard";
import OrdersStatus from "./components/OrderStatus";
import MainLogin from "./components/MainLogin";
import CityPincodeCreate from "./components/CityPincodeCreate";
import Review from "./components/ReviewPage";

// ✅ Context so user & setUser can be accessed globally
export const AuthContext = createContext();

function App() {
  const [clientId, setClientId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); // store role: admin / normal / city
  const [gmailAuthenticated, setGmailAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auto re-login check
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get Google Client ID
        const resClient = await fetch(
          "http://localhost:5000/api/google/client-id"
        );
        const dataClient = await resClient.json();
        setClientId(dataClient.clientId);

        // Get token from localStorage
        const token = localStorage.getItem("token");

        // Who am I?
        const res = await fetch("http://localhost:5000/api/auth/me", {
          method: "GET",
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(true);
          setUser(data.user);

          // Check Gmail auth only for admin
          if (data.user?.role === "admin") {
            const gmailRes = await fetch(
              "http://localhost:5000/api/auth/google/check-token",
              {
                credentials: "include",
              }
            );
            const gmailData = await gmailRes.json();
            setGmailAuthenticated(gmailData.authenticated);
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        console.error("Auth check failed", err);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  if (loading || !clientId) return <div>Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <GoogleOAuthProvider clientId={clientId}>
        <Router>
          <Routes>
            {/* Always open MainLogin first */}
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  user?.role === "admin" ? (
                    gmailAuthenticated ? (
                      <Navigate to="/dashboard" />
                    ) : (
                      <Navigate to="/GmailPage" />
                    )
                  ) : (
                    <Navigate to="/orders" />
                  )
                ) : (
                  <MainLogin
                    onLoginSuccess={(userData) => {
                      setIsAuthenticated(true);
                      setUser(userData);
                    }}
                  />
                )
              }
            />

            {/* Gmail login only for Admin */}
            <Route
              path="/GmailPage"
              element={
                isAuthenticated && user?.role === "admin" ? (
                  gmailAuthenticated ? (
                    <Navigate to="/dashboard" />
                  ) : (
                    <GmailPage />
                  )
                ) : (
                  <Navigate to="/" />
                )
              }
            />

            {/* Admin-only routes */}
            <Route
              path="/dashboard"
              element={
                isAuthenticated && user?.role === "admin" ? (
                  gmailAuthenticated ? (
                    <Dashboard />
                  ) : (
                    <Navigate to="/GmailPage" />
                  )
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/orders"
              element={
                isAuthenticated ? (
                  user?.role === "admin" ? (
                    gmailAuthenticated ? (
                      <OrderList />
                    ) : (
                      <Navigate to="/GmailPage" />
                    )
                  ) : (
                    <OrderList /> // ✅ City/Normal users can also access
                  )
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/orders/:orderId"
              element={
                isAuthenticated && user?.role === "admin" ? (
                  gmailAuthenticated ? (
                    <OrderDetail />
                  ) : (
                    <Navigate to="/GmailPage" />
                  )
                ) : // City/Normal users can access too
                isAuthenticated && user?.role !== "admin" ? (
                  <OrderDetail />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/add-order"
              element={
                isAuthenticated && user?.role === "admin" ? (
                  gmailAuthenticated ? (
                    <AddOrder />
                  ) : (
                    <Navigate to="/GmailPage" />
                  )
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/uploads"
              element={
                isAuthenticated ? (
                  user?.role === "admin" ? (
                    gmailAuthenticated ? (
                      <UploadsDashboard />
                    ) : (
                      <Navigate to="/GmailPage" />
                    )
                  ) : (
                    <UploadsDashboard /> // City/Normal users can see uploads without Gmail
                  )
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/OrderStatus"
              element={
                isAuthenticated && user?.role === "admin" ? (
                  gmailAuthenticated ? (
                    <OrdersStatus />
                  ) : (
                    <Navigate to="/GmailPage" />
                  )
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/ReviewPage"
              element={
                isAuthenticated && user?.role === "admin" ? (
                  gmailAuthenticated ? (
                    <Review />
                  ) : (
                    <Navigate to="/GmailPage" />
                  )
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/CityPincodeCreate"
              element={
                isAuthenticated && user?.role === "admin" ? (
                  gmailAuthenticated ? (
                    <CityPincodeCreate />
                  ) : (
                    <Navigate to="/GmailPage" />
                  )
                ) : (
                  <Navigate to="/" />
                )
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </GoogleOAuthProvider>
    </AuthContext.Provider>
  );
}

export default App;
