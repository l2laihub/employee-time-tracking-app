import React, { useCallback, useEffect } from 'react';
import { OnboardingContainerProps } from './types';

const OnboardingContainer: React.FC<OnboardingContainerProps> = ({
  currentStep,
  totalSteps,
  onBack,
  onSave,
  children
}) => {
  const [saveStatus, setSaveStatus] = React.useState<'saving' | 'saved' | 'error'>('saved');
  const [lastSaved, setLastSaved] = React.useState<Date | undefined>(undefined);

  // Auto-save handler
  const handleAutoSave = useCallback(async () => {
    try {
      setSaveStatus('saving');
      await onSave();
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      setSaveStatus('error');
      console.error('Failed to save onboarding progress:', error);
    }
  }, [onSave]);

  // Setup auto-save on step changes
  useEffect(() => {
    handleAutoSave();
  }, [currentStep, handleAutoSave]);

  const steps = Array.from({ length: totalSteps }, (_, i) => ({
    title: `Step ${i + 1}`,
    completed: i < currentStep,
    current: i === currentStep
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="relative">
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
              <div
                style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
              />
            </div>
            <div className="flex justify-between text-sm">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`flex flex-col items-center ${
                    step.completed || step.current ? 'text-blue-500' : 'text-gray-400'
                  }`}
                >
                  <div
                    className={`rounded-full h-6 w-6 flex items-center justify-center mb-1 ${
                      step.completed
                        ? 'bg-blue-500 text-white'
                        : step.current
                        ? 'border-2 border-blue-500 text-blue-500'
                        : 'border-2 border-gray-300 text-gray-300'
                    }`}
                  >
                    {step.completed ? '✓' : index + 1}
                  </div>
                  <span className="text-xs">{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          {children}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <div>
            <button
              onClick={onBack}
              disabled={currentStep === 0}
              className={`px-4 py-2 rounded ${
                currentStep === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              Back
            </button>
          </div>

          {/* Save status */}
          <div className="text-sm text-gray-500">
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && lastSaved && `Last saved ${lastSaved.toLocaleTimeString()}`}
            {saveStatus === 'error' && 'Failed to save'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingContainer;