import React from 'react';
import { LoadingSpinner as Spinner } from './design-system';

export default function LoadingSpinner() {
  return (
    <Spinner
      size="lg"
      variant="primary"
      fullScreen
    />
  );
}