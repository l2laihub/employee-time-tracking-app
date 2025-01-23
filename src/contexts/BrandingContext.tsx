import { createContext, useContext, useEffect, useState } from 'react';
import { useOrganization } from './OrganizationContext';

interface BrandingContextType {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  companyName: string | null;
  companyWebsite: string | null;
  applyBranding: (element: HTMLElement) => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

const defaultBranding = {
  primaryColor: '#3b82f6',
  secondaryColor: '#1e40af',
  logoUrl: null,
  faviconUrl: null,
  companyName: null,
  companyWebsite: null,
};

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { organization } = useOrganization();
  const [branding, setBranding] = useState(defaultBranding);

  useEffect(() => {
    if (organization?.branding) {
      setBranding({
        primaryColor: organization.branding.primary_color || defaultBranding.primaryColor,
        secondaryColor: organization.branding.secondary_color || defaultBranding.secondaryColor,
        logoUrl: organization.branding.logo_url,
        faviconUrl: organization.branding.favicon_url,
        companyName: organization.branding.company_name,
        companyWebsite: organization.branding.company_website,
      });

      // Update favicon if provided
      if (organization.branding.favicon_url) {
        const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = organization.branding.favicon_url;
        document.getElementsByTagName('head')[0].appendChild(link);
      }

      // Update CSS variables
      document.documentElement.style.setProperty(
        '--color-primary',
        organization.branding.primary_color || defaultBranding.primaryColor
      );
      document.documentElement.style.setProperty(
        '--color-secondary',
        organization.branding.secondary_color || defaultBranding.secondaryColor
      );
    } else {
      setBranding(defaultBranding);
    }
  }, [organization]);

  const applyBranding = (element: HTMLElement) => {
    // Apply branding colors to specific element
    element.style.setProperty('--color-primary', branding.primaryColor);
    element.style.setProperty('--color-secondary', branding.secondaryColor);
  };

  return (
    <BrandingContext.Provider
      value={{
        ...branding,
        applyBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
