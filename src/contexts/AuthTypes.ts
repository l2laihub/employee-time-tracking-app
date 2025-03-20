import { User } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{
    error: Error | null;
    emailConfirmationRequired?: boolean;
    user?: User | null;
    rateLimited?: boolean;
    userExists?: boolean;
  }>;
  signOut: () => Promise<void>;
}
