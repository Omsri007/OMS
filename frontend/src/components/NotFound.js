// components/NotFound.js
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-6xl font-bold mb-4 text-indigo-600">404</h1>
      <p className="text-2xl mb-8">Oops! Page not found.</p>
      <Link to="/" className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600">
        Go Home
      </Link>
    </div>
  );
};

export default NotFound;
