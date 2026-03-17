import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
        <Loader2 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-green-600 animate-spin" />
      </div>
      <div className="mt-6 text-center">
        <h2 className="text-lg font-semibold text-gray-700 mb-1">Loading School System</h2>
        <p className="text-xs text-gray-500">Preparing your dashboard...</p>
      </div>
      <div className="mt-4 flex space-x-1">
        <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></div>
        <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
        <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
