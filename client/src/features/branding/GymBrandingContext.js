import { createContext, useContext } from 'react';

/** The public branding of the gym whose address is in the URL, or null outside one. */
export const GymBrandingContext = createContext(null);

export const useGymBranding = () => useContext(GymBrandingContext);
