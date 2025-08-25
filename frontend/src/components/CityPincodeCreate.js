import React, { useState } from "react";
import "./CityPincodeCreate.css"; // external CSS file

export default function CityPincodeCreate() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cityPincode, setCityPincode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setMessage("");
    if (!email || !password || !cityPincode) {
      setMessage("All fields are required");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("❌ Admin login required to create City User");
        setLoading(false);
        return;
      }
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/city-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, password, cityPincode }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "Creation failed");
      } else {
        setMessage("✅ City user created successfully!");
        console.log("Created city user:", data.user);
        setEmail("");
        setPassword("");
        setCityPincode("");
      }
    } catch (err) {
      console.error("Creation error:", err);
      setMessage("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-city-container">
      <h2>Create City User</h2>

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
        placeholder="City - Pincode"
        value={cityPincode}
        onChange={(e) => setCityPincode(e.target.value)}
      />

      <button onClick={handleCreate} disabled={loading}>
        {loading ? "Please wait..." : "Create City User"}
      </button>

      {message && <p className="message">{message}</p>}
    </div>
  );
}
