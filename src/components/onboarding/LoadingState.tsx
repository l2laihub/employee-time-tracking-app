import React, { useState, useEffect } from 'react';

interface LoadingStateProps {
  step: 'creating-account' | 'establishing-auth' | 'refreshing-session' | 'creating-organization';
}

const LoadingState: React.FC<LoadingStateProps> = ({ step }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const getMessage = () => {
    switch (step) {
      case 'creating-account':
        return 'Creating your account';
      case 'establishing-auth':
        return 'Establishing secure connection';
      case 'refreshing-session':
        return 'Preparing your workspace';
      case 'creating-organization':
        return 'Setting up your organization';
      default:
        return 'Processing';
    }
  };

  const getSubMessage = () => {
    switch (step) {
      case 'creating-account':
        return 'Setting up your admin account';
      case 'establishing-auth':
        return 'This helps keep your data secure';
      case 'refreshing-session':
        return 'Almost there';
      case 'creating-organization':
        return 'Finalizing your workspace setup';
      default:
        return 'Please wait';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
        <div className="space-y-2">
          <p className="text-gray-600 text-lg">
            {getMessage()}{dots}
          </p>
          <p className="text-sm text-gray-500">
            {getSubMessage()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingState;