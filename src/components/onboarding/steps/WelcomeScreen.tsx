import React from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';

interface WelcomeScreenProps {
  valuePropositions: string[];
  onGetStarted: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  valuePropositions,
  onGetStarted
}) => {
  const { completeStep } = useOnboarding();

  const handleGetStarted = () => {
    completeStep('welcome');
    onGetStarted(); // Keep this to ensure UI updates properly
  };

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Welcome to Employee Time Tracking
      </h1>

      <p className="text-lg text-gray-600 mb-8">
        Let's get your organization set up in just a few minutes
      </p>

      <div className="space-y-4 mb-12">
        {valuePropositions.map((proposition, index) => (
          <div
            key={index}
            className="flex items-center justify-center text-left"
          >
            <div className="bg-blue-100 rounded-full p-2 mr-4">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <span className="text-gray-700">{proposition}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleGetStarted}
        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Get Started
        <svg
          className="ml-2 -mr-1 w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      <p className="mt-4 text-sm text-gray-500">
        Takes only 5-10 minutes to complete
      </p>
    </div>
  );
};

export default WelcomeScreen;