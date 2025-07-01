type envVarNames =
  | 'BASE_URL'
  | 'VITE_APP_CROWNLABS_GRAPHQL_URL'
  | 'VITE_APP_CROWNLABS_OIDC_CLIENT_ID'
  | 'VITE_APP_CROWNLABS_OIDC_AUTHORITY';

type envVarObj = { [key in envVarNames]?: string };

<<<<<<< HEAD
const getEnvVar = (envVarName: envVarNames) => {
  const envVar = process.env[envVarName] ?? (window as envVarObj)[envVarName];

  // For local development, return default values instead of throwing
=======
const getEnvVar = (envVarName: envVarNames): string => {
  const envVar: string =
    import.meta.env[envVarName] ?? (window as envVarObj)[envVarName];
>>>>>>> master
  if (envVar === undefined) {
    console.warn(
      `ENV VAR ${envVarName} NOT DEFINED - using default for local development`
    );

    // Return sensible defaults for local development
    switch (envVarName) {
      case 'REACT_APP_CROWNLABS_GRAPHQL_URL':
        return 'http://localhost:8080/graphql';
      case 'REACT_APP_CROWNLABS_OIDC_PROVIDER_URL':
        return 'http://localhost:8080/auth';
      case 'REACT_APP_CROWNLABS_OIDC_CLIENT_ID':
        return 'crownlabs-frontend';
      case 'REACT_APP_CROWNLABS_OIDC_REALM':
        return 'crownlabs';
      case 'PUBLIC_URL':
        return '/';
      default:
        return '';
    }
  }
  return envVar;
};

export const VITE_APP_CROWNLABS_OIDC_CLIENT_ID = getEnvVar(
  'VITE_APP_CROWNLABS_OIDC_CLIENT_ID',
);
export const VITE_APP_CROWNLABS_GRAPHQL_URL = getEnvVar(
  'VITE_APP_CROWNLABS_GRAPHQL_URL',
);
export const VITE_APP_CROWNLABS_OIDC_AUTHORITY = getEnvVar(
  'VITE_APP_CROWNLABS_OIDC_AUTHORITY',
);
<<<<<<< HEAD
export const REACT_APP_CROWNLABS_OIDC_REALM = getEnvVar(
  'REACT_APP_CROWNLABS_OIDC_REALM'
);
export const PUBLIC_URL = getEnvVar('PUBLIC_URL');

console.log('Environment variables loaded:', {
  REACT_APP_CROWNLABS_GRAPHQL_URL,
  REACT_APP_CROWNLABS_OIDC_PROVIDER_URL,
  REACT_APP_CROWNLABS_OIDC_CLIENT_ID,
  REACT_APP_CROWNLABS_OIDC_REALM,
  PUBLIC_URL,
});
=======
export const BASE_URL = getEnvVar('BASE_URL');
>>>>>>> master
