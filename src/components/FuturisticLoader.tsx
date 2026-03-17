import React from 'react';

const FuturisticLoader = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        {/* Outer ring */}
        <div className="w-16 h-16 border-2 border-green-200 rounded-full animate-ping absolute"></div>
        
        {/* Middle ring */}
        <div className="w-16 h-16 border-2 border-green-400 rounded-full animate-pulse absolute"></div>
        
        {/* Inner spinning core */}
        <div className="w-16 h-16 border-4 border-transparent border-t-green-600 border-r-green-500 rounded-full animate-spin relative">
          <div className="absolute inset-2 border-2 border-transparent border-b-green-400 border-l-green-300 rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
        </div>
        
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
      </div>
      
      {/* Scanning lines */}
      <div className="relative w-32 h-1 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>
      
      {/* Loading text */}
      <div className="text-center">
        <p className="text-sm font-medium text-green-600 animate-pulse">Authenticating...</p>
      </div>
    </div>
  );
};

export default FuturisticLoader;
