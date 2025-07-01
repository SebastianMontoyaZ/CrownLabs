<<<<<<< HEAD
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
=======
import type { UserProfile } from 'oidc-client-ts';
import { createContext } from 'react';
>>>>>>> master

interface IAuthContext {
  isLoggedIn: boolean;
  token?: string;
  userId?: string;
  profile?: UserProfile;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<IAuthContext>({
  isLoggedIn: false,
  token: undefined,
  userId: undefined,
  profile: undefined,
  logout: async () => void 0,
});
<<<<<<< HEAD

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
      // In development mode, skip authentication and use mock user ID that matches tenant
      setIsLoggedIn(true);
      setToken('mock-token');
      setUserId('john-doe'); // This must match your tenant name in mocks
      setExecLogin(false);
      console.log('🚀 DEV MODE: Using mock userId: john-doe');
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

  console.log('AuthContext state:', {
    DEV_MODE,
    isLoggedIn,
    userId,
    token: token ? 'present' : 'missing',
  });

  const authValue: IAuthContext = {
    isLoggedIn,
    token,
    userId,
  };

  return (
    <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
  );
};

export default AuthContextProvider;
=======
>>>>>>> master
