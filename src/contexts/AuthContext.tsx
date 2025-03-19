import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{
    error: Error | null;
    emailConfirmationRequired?: boolean;
    user?: User | null;
  }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function initializeAuth() {
      try {
        // Get the current session first
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('Initial session found:', {
            userId: session.user.id,
            email: session.user.email,
            metadata: session.user.user_metadata
          });
          setUser(session.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    // Initialize auth state
    initializeAuth();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', {
        event,
        userId: session?.user?.id,
        email: session?.user?.email,
        metadata: session?.user?.user_metadata
      });

      if (event === 'USER_UPDATED') {
        try {
          // Get the current session without forcing a refresh
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession?.user) {
            setUser(currentSession.user);
          }
        } catch (error) {
          console.error('Error handling user update:', error);
          // Fall back to session from event if getting current session fails
          setUser(session?.user ?? null);
        }
      } else {
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      console.log('Sign in successful, navigating to dashboard');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error signing in');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      setLoading(true);
      // Add a flag to bypass email confirmation in development
      const bypassEmailConfirmation = process.env.NODE_ENV === 'development';
      
      // Get the current URL parameters to preserve invite information
      const currentUrl = new URL(window.location.href);
      const searchParams = new URLSearchParams(currentUrl.search);
      const redirectParam = searchParams.get('redirect');
      
      // Build the redirect URL with any existing parameters
      let redirectUrl = `${window.location.origin}/login`;
      if (redirectParam) {
        redirectUrl += `?redirect=${encodeURIComponent(redirectParam)}`;
      }
      
      console.log('Email confirmation will redirect to:', redirectUrl);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          // Email confirmation is enabled in the new Supabase project
          emailRedirectTo: redirectUrl,
        },
      });

      // Special handling for development mode
      if (bypassEmailConfirmation && error) {
        // Check if it's an invalid email error
        if (error.message && error.message.includes('Email address') && error.message.includes('invalid')) {
          console.log('DEVELOPMENT MODE: Bypassing invalid email error for:', email);
          
          // Create a mock user for development testing with a proper UUID format
          const mockUser = {
            id: '00000000-0000-4000-a000-000000000000', // Use a fixed UUID for testing
            email: email,
            aud: 'authenticated',
            role: 'authenticated',
            user_metadata: {
              first_name: firstName,
              last_name: lastName
            },
            app_metadata: {},
            created_at: new Date().toISOString(),
            confirmed_at: new Date().toISOString(), // Add confirmed_at to indicate email is confirmed
            last_sign_in_at: new Date().toISOString()
          };
          
          // Set the mock user - cast to unknown first to avoid TypeScript errors
          setUser(mockUser as unknown as User);
          
          // Store the mock user in localStorage to persist across page refreshes
          localStorage.setItem('supabase.auth.token', JSON.stringify({
            currentSession: {
              access_token: 'mock-token',
              refresh_token: 'mock-refresh-token',
              user: mockUser
            }
          }));
          
          // Return the mock user to be used in the signup flow
          return { 
            error: null,
            user: mockUser as unknown as User 
          };
        } else {
          // For other errors, throw normally
          throw error;
        }
      } else if (error) {
        throw error;
      }

      // Check if email confirmation is required
      if (!bypassEmailConfirmation && (data?.user?.identities?.length === 0 || data?.user?.confirmed_at === null)) {
        console.log('Email confirmation required for user:', email);
        return { 
          error: null, 
          emailConfirmationRequired: true,
          user: data?.user
        };
      }

      // If email is already confirmed (unlikely but possible), try to establish session
      const waitForSession = async (maxAttempts = 5) => {
        for (let i = 0; i < maxAttempts; i++) {
          console.log(`Attempt ${i + 1} to establish session...`);
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('Session established successfully:', session.user.id);
            setUser(session.user);
            return true;
          }
          // Increase wait time between attempts
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        console.error('Failed to establish session after multiple attempts');
        return false;
      };

      // Wait for session to be ready
      const sessionEstablished = await waitForSession();
      if (!sessionEstablished) {
        // If session not established, try to get user anyway
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          console.log('User found but session not established, setting user manually:', currentUser.id);
          setUser(currentUser);
          return { error: null };
        }
        return { 
          error: null, 
          emailConfirmationRequired: true,
          user: data?.user
        };
      }

      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error instanceof Error ? error : new Error('Error signing up') };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('Sign out successful, navigating to login');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error signing out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}