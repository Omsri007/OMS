import React, { useEffect } from 'react';
import axios from 'axios';

function GmailPage() {

  useEffect(() => {
    // Poll every 500ms to check if token exists
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/auth/google/check-token`);
        if (res.data.authenticated) {
          clearInterval(interval); // Stop polling

          // Redirect to full URL with 1 second delay
          setTimeout(() => {
            window.location.href = `${process.env.REACT_APP_FRONTEND_URL}/dashboard`;
          }); // 1000ms = 1 second
        }
      } catch (err) {
        console.error("Error checking token:", err);
      }
    }, 500); // reduced interval for near-instant detection

    return () => clearInterval(interval); // Clean up when component unmounts
  }, []);

  const handleLogin = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/auth/login`);
      const authUrl = res.data.url;

      const loginWindow = window.open(authUrl, "_blank", "width=500,height=600");
      if (!loginWindow || loginWindow.closed || typeof loginWindow.closed === 'undefined') {
        alert("Popup blocked. Please allow popups for this site.");
        return;
      }

      // Polling will handle redirection, no postMessage needed
    } catch (err) {
      console.error("Login initiation failed:", err);
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: 100 }}>
      <h2>Login With Account To Access Gmail For Data</h2>
      <button onClick={handleLogin}>Login with Google</button>
    </div>
  );
}

export default GmailPage;
