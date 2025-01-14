import React, { ReactNode, cloneElement, isValidElement } from 'react';

interface RadioChildProps<T extends string = string> {
  value: T;
  checked?: boolean;
  onChange?: () => void;
}

interface RadioGroupProps<T extends string = string> {
  children: ReactNode;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export default function RadioGroup<T extends string = string>({ 
  children, 
  value, 
  onChange, 
  className = '' 
}: RadioGroupProps<T>) {
  return (
    <div className={`space-y-2 ${className}`}>
      {React.Children.map(children, child => {
        if (isValidElement(child)) {
          const childElement = child as React.ReactElement<RadioChildProps<T>>;
          return cloneElement(childElement, {
            checked: childElement.props.value === value,
            onChange: () => onChange(childElement.props.value)
          });
        }
        return child;
      })}
    </div>
  );
}
