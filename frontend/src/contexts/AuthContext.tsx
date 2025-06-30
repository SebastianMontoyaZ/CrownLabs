import Keycloak from 'keycloak-js';
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

// Development mode flag - set to true to bypass authentication
const DEV_MODE =
  process.env.NODE_ENV === 'development' &&
  (process.env.REACT_APP_CROWNLABS_DEV_MODE === 'true' ||
    REACT_APP_CROWNLABS_OIDC_PROVIDER_URL.includes('localhost'));

interface IAuthContext {
  isLoggedIn: boolean;
  token?: string;
  userId?: string;
}

export const AuthContext = createContext<IAuthContext>({
  isLoggedIn: false,
  token: undefined,
  userId: undefined,
});

const kc = DEV_MODE
  ? null
  : Keycloak({
      url: REACT_APP_CROWNLABS_OIDC_PROVIDER_URL,
      realm: REACT_APP_CROWNLABS_OIDC_REALM,
      clientId: REACT_APP_CROWNLABS_OIDC_CLIENT_ID,
    });

export const logout = () => {
  if (DEV_MODE) {
    console.log('DEV MODE: Logout called');
    return;
  }
  kc?.logout({ redirectUri: window.location.origin });
};

const AuthContextProvider: FC<PropsWithChildren<{}>> = props => {
  const { children } = props;
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userId, setUserId] = useState<undefined | string>(undefined);
  const [token, setToken] = useState<undefined | string>(undefined);
  const { makeErrorCatcher, setExecLogin, execLogin } =
    useContext(ErrorContext);

  useEffect(() => {
    if (DEV_MODE) {
      // In development mode, skip authentication
      setIsLoggedIn(true);
      setToken('mock-token');
      setUserId('dev-user');
      setExecLogin(false);
      return;
    }

    if (execLogin) {
      kc?.init({ onLoad: 'login-required' })
        .then((authenticated: boolean) => {
          if (authenticated) {
            setIsLoggedIn(true);
            setToken(kc.idToken);
          } else {
            setIsLoggedIn(false);
            setToken(undefined);
            setUserId(undefined);
          }
          kc.loadUserInfo()
            .then((res: any) => setUserId(res.preferred_username))
            .catch(makeErrorCatcher(ErrorTypes.KeycloakError));
        })
        .catch(makeErrorCatcher(ErrorTypes.KeycloakError))
        .finally(() => setExecLogin(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setExecLogin, execLogin]);

  const DEV_MODE =
    process.env.NODE_ENV === 'development' &&
    process.env.REACT_APP_CROWNLABS_DEV_MODE === 'true';

  // Set initial values based on DEV_MODE after it's declared
  useEffect(() => {
    if (DEV_MODE) {
      setIsLoggedIn(true);
      setUserId('dev-user');
      setToken('mock-token');
    }
  }, [DEV_MODE]);

  console.log('AuthContext DEV_MODE:', DEV_MODE);

  if (DEV_MODE) {
    // Mock authentication for development
    const mockAuthValue = {
      authenticated: true,
      isLoggedIn: true, // Add this missing property
      user: {
        id: 'dev-user',
        firstName: 'Dev',
        lastName: 'User',
        email: 'dev@example.com',
      },
      token: 'mock-token',
      logout: () => {},
      login: () => void 0,
    };

    return (
      <AuthContext.Provider value={mockAuthValue}>
        {props.children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        token,
        userId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;
