import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockUsers, MockUser } from '../lib/mockUsers';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: MockUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => void;
  signUp: (email: string, password: string, firstName: string, lastName: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const signIn = (email: string, password: string) => {
    const mockUser = mockUsers.find(u => u.email === email);
    
    if (mockUser && password === 'password123') {
      setUser(mockUser);
      navigate('/');
    } else {
      toast.error('Invalid email or password');
    }
  };

  const signUp = (email: string, password: string, firstName: string, lastName: string) => {
    const newUser: MockUser = {
      id: String(mockUsers.length + 1),
      email,
      first_name: firstName,
      last_name: lastName,
      role: 'employee'
    };
    
    mockUsers.push(newUser);
    toast.success('Account created successfully! Please sign in.');
    navigate('/login');
  };

  const signOut = () => {
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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