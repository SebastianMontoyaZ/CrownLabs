import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  REACT_APP_CROWNLABS_OIDC_PROVIDER_URL,
  REACT_APP_CROWNLABS_OIDC_CLIENT_ID,
  REACT_APP_CROWNLABS_OIDC_REALM,
} from '../env';
import { ErrorContext } from '../errorHandling/ErrorContext';
import { ErrorTypes } from '../errorHandling/utils';
import type { User } from 'oidc-client-ts';

// Development mode flag - use import.meta.env instead of process.env
const DEV_MODE =
  import.meta.env.MODE === 'development' &&
  (import.meta.env.VITE_APP_CROWNLABS_DEV_MODE === 'true' ||
    REACT_APP_CROWNLABS_OIDC_PROVIDER_URL.includes('localhost'));

export interface IAuthContext {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
  // Legacy properties for backward compatibility
  isLoggedIn?: boolean;
  token?: string;
  userId?: string;
}

export const AuthContext = createContext<IAuthContext>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  refreshToken: async () => {},
});

// Mock user for development
const mockUser: User = {
  id_token: 'mock-id-token',
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  token_type: 'Bearer',
  scope: 'openid profile email',
  expires_at: Date.now() / 1000 + 3600, // 1 hour from now
  profile: {
    sub: 'john-doe',
    preferred_username: 'john-doe',
    email: 'john.doe@example.com',
    name: 'John Doe',
    given_name: 'John',
    family_name: 'Doe',
    aud: REACT_APP_CROWNLABS_OIDC_CLIENT_ID,
    iss: REACT_APP_CROWNLABS_OIDC_PROVIDER_URL,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  },
  session_state: 'mock-session',
  state: undefined,
  expires_in: 3600,
  expired: false,
  scopes: ['openid', 'profile', 'email'],
  toStorageString: () => JSON.stringify(mockUser),
} as User;

export const logout = () => {
  if (DEV_MODE) {
    console.log('DEV MODE: Logout called');
    return;
  }
  // In production, this would handle real logout
  window.location.href = '/';
};

const AuthContextProvider: FC<PropsWithChildren<{}>> = props => {
  const { children } = props;
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { makeErrorCatcher, setExecLogin, execLogin } =
    useContext(ErrorContext);

  useEffect(() => {
    console.log('🔍 AuthContext useEffect:', { DEV_MODE, execLogin });

    if (DEV_MODE) {
      // In development mode, skip authentication and use mock user
      console.log('🚀 DEV MODE: Using mock authentication');
      setUser(mockUser);
      setIsAuthenticated(true);
      setIsLoading(false);
      setExecLogin(false);
      return;
    }

    // In production, this would handle real OIDC authentication
    console.log('🔐 PROD MODE: Real authentication needed');
    setTimeout(() => {
      setIsAuthenticated(false);
      setIsLoading(false);
      setExecLogin(false);
    }, 1000);
  }, [setExecLogin, execLogin]);

  console.log('🔍 AuthContext state:', {
    DEV_MODE,
    isAuthenticated,
    isLoading,
    user: user ? user.profile?.preferred_username : null,
  });

  const authValue: IAuthContext = {
    user,
    isAuthenticated,
    isLoading,
    login: () => {
      if (DEV_MODE) {
        console.log('DEV MODE: Login called');
        setUser(mockUser);
        setIsAuthenticated(true);
      } else {
        // In production, redirect to OIDC provider
        window.location.href = `${REACT_APP_CROWNLABS_OIDC_PROVIDER_URL}/auth/realms/${REACT_APP_CROWNLABS_OIDC_REALM}/protocol/openid-connect/auth?client_id=${REACT_APP_CROWNLABS_OIDC_CLIENT_ID}&redirect_uri=${window.location.origin}&response_type=code&scope=openid profile email`;
      }
    },
    logout,
    refreshToken: async () => {
      if (DEV_MODE) {
        console.log('DEV MODE: Token refresh called');
        return;
      }
      // In production, handle token refresh
    },
    // Legacy properties for backward compatibility
    isLoggedIn: isAuthenticated,
    token: user?.access_token,
    userId: user?.profile?.preferred_username,
  };

  return (
    <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
  );
};

export default AuthContextProvider;
