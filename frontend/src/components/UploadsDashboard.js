import { useState, useEffect, useCallback, useContext } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { AuthContext } from "../App"; // ✅ Use the same AuthContext
import "./UploadsDashboard.css";

const UploadsDashboard = () => {
  const [files, setFiles] = useState([]);
  const [timestamps, setTimestamps] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { user } = useContext(AuthContext); // ✅ Get user info

  const fetchFiles = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/uploads`
      );
      const newFiles = res.data.files || [];
      const backendTimestamps = res.data.timestamps || {};

      setFiles(newFiles);
      setTimestamps(
        Object.fromEntries(
          Object.entries(backendTimestamps).map(([k, v]) => [k, new Date(v)])
        )
      );
      setLoading(false);
    } catch (err) {
      setError("Error fetching uploaded files.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    const interval = setInterval(fetchFiles, 5000);
    return () => clearInterval(interval);
  }, [fetchFiles]);

  const deleteFile = async (filename) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/uploads/${filename}`
      );
      fetchFiles();
    } catch (err) {
      alert("Error deleting file.");
    }
  };

  const formatTimestamp = (date) => {
    if (!(date instanceof Date)) return "Unknown";
    return date.toLocaleString("en-IN", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-4 bg-indigo-600 text-white nav">
        <div className="text-lg font-bold">LOGO</div>
        <div className="flex gap-4">
          <Link to="/dashboard" className="nav-link">
            Home
          </Link>

          {/* ✅ Conditional Nav based on user role */}
          {user?.role === "admin" ? (
            <>
              <Link to="/orders" className="nav-link">
                Orders List
              </Link>
              <Link to="/uploads" className="nav-link">
                Files
              </Link>
              <Link to="/add-order" className="nav-link">
                Add Order
              </Link>
              <Link to="/ReviewPage" className="nav-link">
                Review Orders
              </Link>
              <Link to="/OrderStatus" className="nav-link">
                Order Status
              </Link>
              <Link to="/CityPincodeCreate" className="nav-link">
                Create User Account
              </Link>
            </>
          ) : (
            <>
              <Link to="/uploads" className="nav-link">
                Files
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Dashboard */}
      <div className="dashboard-container">
        <h1 className="dashboard-title">📁 Uploaded Files</h1>

        {loading && <p>Loading...</p>}
        {error && <p className="error-message">{error}</p>}

        {!loading && !error && files.length === 0 && (
          <p className="no-files">No uploaded files found.</p>
        )}

        <table className="files-table">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Downloaded At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file}>
                <td>{file}</td>
                <td>{formatTimestamp(timestamps[file])}</td>
                <td className="action-buttons">
                  <a
                    href={`${process.env.REACT_APP_API_URL}/uploads/${file}`}
                    download
                    className="btn download-btn"
                  >
                    Download
                  </a>
                  <button
                    onClick={() => deleteFile(file)}
                    className="btn delete-btn"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UploadsDashboard;
