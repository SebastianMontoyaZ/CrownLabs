import React, { type FC, type ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import { AuthContext, type IAuthContext } from './AuthContext';

const DEV_MODE = import.meta.env.MODE === 'development';

const mockUser = {
  profile: {
    sub: 'mock-user-id',
    preferred_username: 'mockuser',
    email: 'mock@crownlabs.polito.it',
  },
};

interface AuthContextProviderProps {
  children: ReactNode;
}

const AuthContextProvider: FC<AuthContextProviderProps> = ({ children }) => {
  const auth = useAuth();

  let authContextValue: IAuthContext;

  console.log('AuthContextProvider DEV_MODE:', DEV_MODE);

  if (DEV_MODE) {
    console.log('AuthContextProvider using mock user:', mockUser);
    authContextValue = {
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: () => {},
      logout: () => {},
      refreshToken: async () => {},
    };
  } else {
    authContextValue = {
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
          auth.signinRedirect();
        }
      },
    };
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;
