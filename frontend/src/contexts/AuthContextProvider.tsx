import React, { type FC, type ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import { AuthContext, type IAuthContext } from './AuthContext';

interface AuthContextProviderProps {
  children: ReactNode;
}

const AuthContextProvider: FC<AuthContextProviderProps> = ({ children }) => {
  const auth = useAuth();

  const authContextValue: IAuthContext = {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    login: () => auth.signinRedirect(),
    logout: () => auth.signoutRedirect(),
    refreshToken: async () => {
      try {
        await auth.signinSilent();
      } catch (error) {
        console.error('Failed to refresh token:', error);
        // If silent refresh fails, redirect to login
        auth.signinRedirect();
      }
    },
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;
