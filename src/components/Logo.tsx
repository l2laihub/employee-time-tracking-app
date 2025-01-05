import React from 'react';

export default function Logo({ className = '', showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <img src="/clockflow_logo.svg" alt="ClockFlow Logo" className="h-16 w-16" />
      {showText && (
        <span className="mt-2 text-3xl font-bold text-gray-900">
          {/* Clock<span className="text-blue-600">Flow</span> */}
          Employee Time Tracking
        </span>
      )}
    </div>
  );
}
