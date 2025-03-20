import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { AuthContextType } from './AuthTypes';

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
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign in');
      return { error: error instanceof Error ? error : new Error('Failed to sign in') };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      setLoading(true);
      
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
      
      // Check if we've recently attempted a signup with this email to prevent rate limiting
      const lastSignupAttempt = localStorage.getItem(`signup_attempt_${email}`);
      if (lastSignupAttempt) {
        const lastAttemptTime = parseInt(lastSignupAttempt, 10);
        const currentTime = Date.now();
        const timeDiff = currentTime - lastAttemptTime;
        
        // If less than 60 seconds since last attempt, show a friendly message
        if (timeDiff < 60000) {
          const secondsToWait = Math.ceil((60000 - timeDiff) / 1000);
          console.log(`Rate limiting protection: Please wait ${secondsToWait} seconds before trying again`);
          return { 
            error: new Error(`Please wait ${secondsToWait} seconds before trying again`),
            rateLimited: true
          };
        }
      }
      
      // Store the current attempt time
      localStorage.setItem(`signup_attempt_${email}`, Date.now().toString());
      
      // Simple signup - assume email confirmation is always required
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: redirectUrl,
        },
      });
      
      if (error) {
        console.error('Signup error:', error);
        return { error };
      }
      
      // Always return that email confirmation is required
      // This simplifies the flow and avoids trying to establish a session
      // when we know it will likely fail
      return { 
        error: null, 
        emailConfirmationRequired: true,
        user: data?.user
      };
    } catch (error) {
      console.error('Error during signup:', error);
      return { 
        error: error instanceof Error ? error : new Error('An unknown error occurred during signup') 
      };
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};