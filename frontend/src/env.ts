type envVarNames =
  | 'BASE_URL'
  | 'VITE_APP_CROWNLABS_GRAPHQL_URL'
  | 'VITE_APP_CROWNLABS_OIDC_CLIENT_ID'
  | 'VITE_APP_CROWNLABS_OIDC_AUTHORITY'
  | 'VITE_APP_CROWNLABS_OIDC_REALM';

type envVarObj = { [key in envVarNames]?: string };

const getEnvVar = (envVarName: envVarNames): string => {
  const envVar: string =
    import.meta.env[envVarName] ?? (window as envVarObj)[envVarName];

  if (envVar === undefined) {
    console.warn(
      `ENV VAR ${envVarName} NOT DEFINED - using default for local development`
    );

    switch (envVarName) {
      case 'VITE_APP_CROWNLABS_GRAPHQL_URL':
        return 'http://localhost:8080/graphql';
      case 'VITE_APP_CROWNLABS_OIDC_AUTHORITY':
        return 'https://auth.crownlabs.polito.it/auth/realms/crownlabs';
      case 'VITE_APP_CROWNLABS_OIDC_CLIENT_ID':
        return 'crownlabs-frontend';
      case 'VITE_APP_CROWNLABS_OIDC_REALM':
        return 'crownlabs';
      case 'BASE_URL':
        return '/';
      default:
        return '';
    }
  }
  return envVar;
};

// New Vite exports
export const VITE_APP_CROWNLABS_OIDC_CLIENT_ID = getEnvVar(
  'VITE_APP_CROWNLABS_OIDC_CLIENT_ID'
);
export const VITE_APP_CROWNLABS_GRAPHQL_URL = getEnvVar(
  'VITE_APP_CROWNLABS_GRAPHQL_URL'
);
export const VITE_APP_CROWNLABS_OIDC_AUTHORITY = getEnvVar(
  'VITE_APP_CROWNLABS_OIDC_AUTHORITY'
);
export const VITE_APP_CROWNLABS_OIDC_REALM = getEnvVar(
  'VITE_APP_CROWNLABS_OIDC_REALM'
);
export const BASE_URL = getEnvVar('BASE_URL');

// Legacy aliases for backward compatibility
export const REACT_APP_CROWNLABS_OIDC_CLIENT_ID =
  VITE_APP_CROWNLABS_OIDC_CLIENT_ID;
export const REACT_APP_CROWNLABS_GRAPHQL_URL = VITE_APP_CROWNLABS_GRAPHQL_URL;
export const REACT_APP_CROWNLABS_OIDC_AUTHORITY =
  VITE_APP_CROWNLABS_OIDC_AUTHORITY;
export const REACT_APP_CROWNLABS_OIDC_PROVIDER_URL =
  VITE_APP_CROWNLABS_OIDC_AUTHORITY;
export const REACT_APP_CROWNLABS_OIDC_REALM = VITE_APP_CROWNLABS_OIDC_REALM;

// Additional common aliases
export const REACT_APP_CROWNLABS_OIDC_CLIENT_SECRET = ''; // Usually not needed in frontend
export const REACT_APP_CROWNLABS_OIDC_REDIRECT_URI = window.location.origin;
