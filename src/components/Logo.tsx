import React from 'react';
import { Logo as BrandLogo } from './design-system';
import type { LogoProps } from './design-system';

export default function Logo(props: LogoProps) {
  return <BrandLogo {...props} />;
}
