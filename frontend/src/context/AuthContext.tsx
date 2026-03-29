import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  userEmail: string | null;
  userName: string | null;
  deliveryTime: string;
  feeds: any[];
  login: (token: string, email: string, name: string, deliveryTime: string, feeds: any[]) => void;
  updateDeliveryTime: (deliveryTime: string) => void;
  updateFeeds: (feeds: any[]) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [deliveryTime, setDeliveryTime] = useState<string>('08:00');
  const [feeds, setFeeds] = useState<any[]>([]);

  useEffect(() => {
    // Check local storage on initial load
    const storedToken = localStorage.getItem('briefr_token');
    const storedEmail = localStorage.getItem('briefr_email');
    const storedName = localStorage.getItem('briefr_name');
    const storedDeliveryTime = localStorage.getItem('briefr_delivery_time');
    const storedFeeds = localStorage.getItem('briefr_feeds');
    if (storedToken && storedEmail) {
      setToken(storedToken);
      setUserEmail(storedEmail);
      if (storedName) setUserName(storedName);
      if (storedDeliveryTime) setDeliveryTime(storedDeliveryTime);
      if (storedFeeds) {
        try { setFeeds(JSON.parse(storedFeeds)); } catch (e) {}
      }
    }
  }, []);

  const login = (newToken: string, email: string, name: string, newDeliveryTime: string, newFeeds: any[]) => {
    setToken(newToken);
    setUserEmail(email);
    setUserName(name);
    setDeliveryTime(newDeliveryTime);
    setFeeds(newFeeds || []);
    
    localStorage.setItem('briefr_token', newToken);
    localStorage.setItem('briefr_email', email);
    localStorage.setItem('briefr_name', name);
    localStorage.setItem('briefr_delivery_time', newDeliveryTime);
    localStorage.setItem('briefr_feeds', JSON.stringify(newFeeds || []));
  };

  const updateDeliveryTime = (newDeliveryTime: string) => {
    setDeliveryTime(newDeliveryTime);
    localStorage.setItem('briefr_delivery_time', newDeliveryTime);
  };

  const updateFeeds = (newFeeds: any[]) => {
    setFeeds(newFeeds);
    localStorage.setItem('briefr_feeds', JSON.stringify(newFeeds));
  };

  const logout = () => {
    setToken(null);
    setUserEmail(null);
    setUserName(null);
    setDeliveryTime('08:00');
    setFeeds([]);
    localStorage.removeItem('briefr_token');
    localStorage.removeItem('briefr_email');
    localStorage.removeItem('briefr_name');
    localStorage.removeItem('briefr_delivery_time');
    localStorage.removeItem('briefr_feeds');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        userEmail,
        userName,
        deliveryTime,
        feeds,
        login,
        updateDeliveryTime,
        updateFeeds,
        logout,
        isAuthenticated: !!token,
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
