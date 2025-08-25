import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./AddOrder.css";

const AddOrder = () => {
  const [excelUrl, setExcelUrl] = useState("");
  const [uploadTime, setUploadTime] = useState("");
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("Upload Now Orders");

  useEffect(() => {
    const scheduledTime = new Date();
    scheduledTime.setHours(10, 0, 0, 0);

    const day = String(scheduledTime.getDate()).padStart(2, "0");
    const month = String(scheduledTime.getMonth() + 1).padStart(2, "0");
    const year = scheduledTime.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    const formattedTime = "10:00 AM";
    setUploadTime(`${formattedDate} at ${formattedTime}`);
    console.log(
      "Scheduled upload time set:",
      `${formattedDate} at ${formattedTime}`
    );
  }, []);

  const getDirectDownloadLink = (url) => {
    console.log("Received URL:", url);

    if (url.includes("s3") && url.includes("X-Amz-Signature")) {
      console.log("Detected AWS S3 signed URL.");
      return url;
    }

    const googleSheetMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (googleSheetMatch && googleSheetMatch[1]) {
      const fileId = googleSheetMatch[1];
      const isCsv = url.toLowerCase().includes("csv");
      const directLink = isCsv
        ? `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`
        : `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
      console.log("Generated Google Sheet direct download link:", directLink);
      return directLink;
    }

    return url;
  };

  const handleDownloadAndUpload = async () => {
    try {
      if (!excelUrl) {
        alert("Please enter a valid file URL!");
        return;
      }

      const downloadUrl = getDirectDownloadLink(excelUrl);
      console.log("Download URL:", downloadUrl);

      if (
        downloadUrl.includes("s3") &&
        downloadUrl.includes("X-Amz-Signature")
      ) {
        console.log("Processing S3 signed URL for backend download.");
        const backendUrl = `${process.env.REACT_APP_API_BASE_URL}/api/orders/download-s3`;
        const res = await axios.post(
          backendUrl,
          { url: downloadUrl },
          {
            withCredentials: true,
            headers: { "Content-Type": "application/json" },
          }
        );
        if (res.status === 200) {
          alert("S3 file downloaded and saved to backend successfully!");
        } else {
          throw new Error("Failed to download from S3.");
        }
        return;
      }

      const response = await fetch(
        `/proxy?url=${encodeURIComponent(downloadUrl)}`
      );
      if (!response.ok) {
        throw new Error(
          "Failed to download the file. Check if the link is valid and public."
        );
      }

      const blob = await response.blob();
      console.log("Fetched blob from URL:", blob);

      const fileType = blob.type;
      console.log("Blob MIME type:", fileType);

      if (
        fileType.includes("csv") ||
        downloadUrl.toLowerCase().includes("csv")
      ) {
        const textData = await blob.text();
        console.log("CSV text data from blob:", textData);

        let csvContent = textData;
        if (
          csvContent.trim().startsWith("<!DOCTYPE html") ||
          csvContent.includes("<html")
        ) {
          const tableMatch = csvContent.match(
            /<table[^>]*>([\s\S]*?)<\/table>/i
          );
          if (!tableMatch)
            throw new Error("Could not extract table from HTML page.");

          const tempEl = document.createElement("div");
          tempEl.innerHTML = tableMatch[0];
          const rows = Array.from(tempEl.querySelectorAll("tr"));
          const csvRows = rows.map((row) =>
            Array.from(row.querySelectorAll("th,td"))
              .map((cell) => `"${cell.innerText.trim().replace(/"/g, '""')}"`)
              .join(",")
          );
          csvContent = csvRows.join("\n");
          console.log("Extracted CSV from HTML table:", csvContent);
        }

        alert("CSV file fetched. Backend will handle parsing now.");
      } else {
        alert("XLSX file fetched. Backend will handle parsing now.");
      }
    } catch (error) {
      console.error("Error in handleDownloadAndUpload:", error);
      alert("Error uploading orders! Please check the link and try again.");
    }
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      console.log("Selected file:", selectedFile);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      alert("Please select a file to upload!");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api/orders/upload-file`;

      const res = await axios.post(apiUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      if (res.status === 200) {
        alert("File uploaded and saved successfully on backend!");
      } else {
        throw new Error("File upload failed.");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file! Please check server/API.");
    }
  };

  const handleGmailDownload = async () => {
    try {
      setUploadStatus("Uploading...");
      const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/api/orders/download-gmail-order-file`;
      const res = await axios.get(apiUrl, { withCredentials: true });

      if (res.status === 200) {
        setUploadStatus("Upload Order");
        setShowProgressBar(true);
        setProgress(0);

        let elapsed = 0;
        const intervalTime = 1000; // 1 second
        const totalDuration = 100000; // 1 minute 40 seconds
        const timer = setInterval(() => {
          elapsed += intervalTime;
          setProgress((elapsed / totalDuration) * 100);

          if (elapsed >= totalDuration) {
            clearInterval(timer);
            setUploadStatus("Upload Now Orders");
            setShowProgressBar(false);
            setProgress(0);
          }
        }, intervalTime);
      } else {
        throw new Error("Failed to download Gmail order file.");
      }
    } catch (error) {
      console.error("Error in Gmail download:", error);
      alert("Error downloading Gmail order file!");
      setUploadStatus("Upload Now Orders");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
      <nav className="flex justify-between items-center p-4 bg-indigo-600 text-white nav">
        <div className="text-lg font-bold">LOGO</div>
        <div className="flex gap-4">
          <Link to="/dashboard" className="nav-link">
            Home
          </Link>
          <Link to="/orders" className="nav-link">
            Orders List
          </Link>
          <Link to="/uploads" className="nav-link">
            Files
          </Link>
          <Link to="/add-order" className="nav-link">
            Add Orders
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
        </div>
      </nav>

      <div className="add-order-container">
        <h2>Add Orders</h2>

        <section className="section-block">
          <h3>Automatically Upload</h3>
          <p>
            Orders are automatically uploaded every morning at{" "}
            <strong>{uploadTime}</strong>.
          </p>
        </section>

        <hr />

        <section className="section-block">
          <h3>Upload Orders Now</h3>
          <button onClick={handleGmailDownload}>{uploadStatus}</button>
          {showProgressBar && (
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </section>

        <hr />

        <section className="section-block">
          <h3>Paste Any Sheet Link Below</h3>
          <div className="input-container">
            <div className="input-with-clear">
              <input
                type="text"
                placeholder="Paste Sheet link here"
                value={excelUrl}
                onChange={(e) => setExcelUrl(e.target.value)}
              />
              {excelUrl && (
                <button className="clear-btn" onClick={() => setExcelUrl("")}>
                  ×
                </button>
              )}
            </div>
            <button onClick={handleDownloadAndUpload}>Upload Orders Now</button>
          </div>
        </section>

        <hr />

        <section className="section-block">
          <h3>Or Upload File</h3>
          <div className="upload-file-container">
            <input
              type="file"
              accept=".xlsx, .csv"
              onChange={handleFileChange}
            />

            {file && (
              <>
                <div className="file-preview">
                  <span>{file.name}</span>
                  <button onClick={() => setFile(null)}>❌</button>
                </div>
                <button onClick={handleFileUpload}>Upload</button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AddOrder;
