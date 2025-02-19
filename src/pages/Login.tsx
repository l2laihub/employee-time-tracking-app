import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Logo from '../components/Logo';

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, user } = useAuth();

  // Parse query parameters
  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect');
  const inviteEmail = searchParams.get('email');

  useEffect(() => {
    console.log('Login: Component mounted', {
      redirectPath,
      inviteEmail,
      state: location.state,
      currentUser: user?.email
    });

    // Pre-fill email if provided in query params
    if (inviteEmail) {
      console.log('Login: Pre-filling email from invite:', inviteEmail);
      setEmail(inviteEmail);
    }
  }, [inviteEmail, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login: Attempting login', { email, redirectPath });

    try {
      await signIn(email, password);
      
      // Handle redirect after successful login
      if (redirectPath) {
        console.log('Login: Redirecting to:', redirectPath);
        navigate(redirectPath);
      }
    } catch (error) {
      console.error('Login: Error during sign in:', error);
      toast.error('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Logo className="mx-auto" />
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to manage your time tracking
          </p>
          {inviteEmail && (
            <p className="mt-2 text-center text-sm text-blue-600">
              Please sign in with {inviteEmail} to accept the invite
            </p>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={!!inviteEmail}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="mt-2 text-sm text-gray-600">
            Don't have an account?{' '}
            <Link 
              to={`/signup${location.search}`} 
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign up now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
