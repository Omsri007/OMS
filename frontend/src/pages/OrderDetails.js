import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './OrderDetails.css';

const OrderDetail = () => {
  const { orderId } = useParams(); // Get the orderId from the URL
  const [order, setOrder] = useState(null); // State to store order details
  const [error, setError] = useState(null); // State to handle errors

  // Helper function to format date to DD-MM-YYYY (without time)
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`; // No time included
  };

  // Helper function to format order time stamp to DD-MM-YYYY HH:mm
  const formatOrderTimeStamp = (timestamp) => {
    if (!timestamp) return '-';

    const date = new Date(timestamp);

    // If the date is valid, use default parsing
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    }

    // Fallback: manually parse 'DD-MM-YYYY HH:mm:ss'
    if (typeof timestamp === 'string') {
      const [datePart, timePart] = timestamp.split(' ');
      if (!datePart || !timePart) return '-';

      const [day, month, year] = datePart.split('-');
      const [hours, minutes] = timePart.split(':');

      if (!day || !month || !year || !hours || !minutes) return '-';

      return `${day}-${month}-${year} ${hours}:${minutes}`;
    }

    return '-';
  };

  // Helper function to clean tracking ID
  const cleanTrackingId = (trackingId) => {
    if (typeof trackingId === 'string') {
      return trackingId.replace(/'/g, '');
    }
    return trackingId;
  };

  // Fetch order details from API when component mounts
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        console.log("Fetching order details for orderId:", orderId);
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/orders/${orderId}`, {
          withCredentials: true,
        });

        console.log("API response:", response.data);

        const order = response.data?.orderId ? response.data : response.data?.data;

        if (order && order.orderId) {
          setOrder(order);
        } else {
          console.error("Order not found for the provided orderId");
          setError("Order not found for the provided Order ID.");
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
        setError('Unable to fetch order details from the API.');
      }
    };

    fetchOrderDetails(); // Call the function to fetch data
  }, [orderId]);

  if (error) {
    return <div>{error}</div>; // Show error if it occurs
  }

  if (!order) {
    return <div>Loading...</div>; // Show loading while fetching data
  }

  return (
    <div className='bg-gray-100 p-8'>
      {/* Centered Heading */}
      <h1 className='text-4xl font-bold text-center mb-8'>Order Details</h1>

      {/* Vertical Table for Order Details */}
      <div className='shad bg-white shadow-lg rounded-lg p-6'>
        <table className='min-w-full bg-white'>
          <tbody>
            <tr>
              <th className='border px-4 py-3 bg-indigo-500 text-white'>Order ID</th>
              <td className='border px-4 py-2'>{order.orderId || '-'}</td>
            </tr>
            <tr>
              <th className='border px-4 py-2 bg-indigo-500 text-white'>Order Date</th>
              <td className='border px-4 py-2'>{order.orderDate ? formatDate(order.orderDate) : '-'}</td>
            </tr>
            <tr>
              <th className='border px-4 py-2 bg-indigo-500 text-white'>Order Time Stamp</th>
              <td className='border px-4 py-2'>{order.orderTimeStamp ? formatOrderTimeStamp(order.orderTimeStamp) : '-'}</td>
            </tr>
            <tr>
              <th className='border px-4 py-2 bg-indigo-500 text-white'>Old Item Status</th>
              <td className='border px-4 py-2'>{order.oldItemStatus || '-'}</td>
            </tr>
            <tr>
              <th className='border px-4 py-2 bg-indigo-500 text-white'>Buyback Category</th>
              <td className='border px-4 py-2'>{order.buybackCategory || '-'}</td>
            </tr>
            <tr>
              <th className='border px-4 py-2 bg-indigo-500 text-white'>Partner ID</th>
              <td className='border px-4 py-2'>{order.partnerId || '-'}</td>
            </tr>
            <tr>
              <th className='border px-4 py-2 bg-indigo-500 text-white'>Partner Email</th>
              <td className='border px-4 py-2'>{order.partnerEmail || '-'}</td>
            </tr>
            <tr>
              <th className='border px-4 py-2 bg-indigo-500 text-white'>Partner Shop</th>
              <td className='border px-4 py-2'>{order.partnerShop || '-'}</td>
            </tr>
            <tr>
              <th className='border px-4 py-2 bg-indigo-500 text-white'>Old Item Details</th>
              <td className='border px-4 py-2'>{order.oldItemDetails || '-'}</td>
            </tr>
            <tr>
              <th className='border px-4 py-2 bg-indigo-500 text-white'>Base Discount</th>
              <td className='border px-4 py-2'>{order.baseDiscount || '-'}</td>
            </tr>
            <tr>
              <th className='border px-4 py-2 bg-indigo-500 text-white'>Delivery Fee</th>
              <td className='border px-4 py-2'>{order.deliveryFee || '-'}</td>
            </tr>
            <tr>
              <th className='border px-4 py-2 bg-indigo-500 text-white'>Tracking ID</th>
              <td className='border px-4 py-2'>{order.trackingId ? cleanTrackingId(order.trackingId) : '-'}</td>
            </tr>
            <tr>
              <th className='border px-4 py-2 bg-indigo-500 text-white'>Delivery Date</th>
              <td className='border px-4 py-2'>{order.deliveryDate ? formatDate(order.deliveryDate) : '-'}</td>
            </tr>
            <tr>
              <th className='border px-4 py-2 bg-indigo-500 text-white'>Delivered With OTP</th>
              <td className='border px-4 py-2'>{order.deliveredWithOTP ? 'TRUE' : 'FALSE'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderDetail;
