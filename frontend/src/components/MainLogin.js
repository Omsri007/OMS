import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import "./MainLogin.css";

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cityPincode, setCityPincode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ✅ Auto re-login check
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/me`, {
          method: "GET",
          credentials: "include", // include cookies
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            console.log("Auto re-login:", data.user);

            // ✅ Update App.js immediately
            if (onLoginSuccess) {
              onLoginSuccess(data.user);
            }

            if (data.user.role === "admin") {
              navigate("/dashboard");
            } else {
              navigate("/");
            }
          }
        }
      } catch (err) {
        console.error("Auto login failed:", err);
      }
    };

    checkSession();
  }, [navigate, onLoginSuccess]);

  const handleLogin = async () => {
    setMessage("");
    if (!email || !password) {
      setMessage("Please enter Gmail and password");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          cityPincode: cityPincode || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "Login failed");
      } else {
        setMessage(data.message);
        console.log("Logged in user:", data.user);

        // ✅ Save token for future auto login
        if (data.token) {
          localStorage.setItem("token", data.token);
        }

        // ✅ Update App.js immediately
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }

        // ✅ Redirect by role
        if (data.user?.role === "admin") {
          navigate("/dashboard");
        } else {
          navigate("/");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setMessage("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="shape circle"></div>
      <div className="shape square"></div>
      <div className="shape small-circle"></div>

      <div className="login-card">
        <h1>Welcome</h1>

        <input
          type="email"
          placeholder="Gmail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="text"
          placeholder="City - Pincode (optional for normal users)"
          value={cityPincode}
          onChange={(e) => setCityPincode(e.target.value)}
        />

        <button onClick={handleLogin} disabled={loading}>
          {loading ? "Please wait..." : "Log In"}
        </button>

        {message && <p className="login-message">{message}</p>}
      </div>
    </div>
  );
}
