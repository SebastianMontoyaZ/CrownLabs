type envVarNames =
  | 'REACT_APP_CROWNLABS_GRAPHQL_URL'
  | 'REACT_APP_CROWNLABS_OIDC_PROVIDER_URL'
  | 'REACT_APP_CROWNLABS_OIDC_CLIENT_ID'
  | 'REACT_APP_CROWNLABS_OIDC_REALM'
  | 'PUBLIC_URL';

type envVarObj = { [key in envVarNames]?: string };

const getEnvVar = (envVarName: envVarNames) => {
  const envVar = process.env[envVarName] ?? (window as envVarObj)[envVarName];

  // For local development, return default values instead of throwing
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

export const REACT_APP_CROWNLABS_OIDC_PROVIDER_URL = getEnvVar(
  'REACT_APP_CROWNLABS_OIDC_PROVIDER_URL'
);
export const REACT_APP_CROWNLABS_OIDC_CLIENT_ID = getEnvVar(
  'REACT_APP_CROWNLABS_OIDC_CLIENT_ID'
);
export const REACT_APP_CROWNLABS_GRAPHQL_URL = getEnvVar(
  'REACT_APP_CROWNLABS_GRAPHQL_URL'
);
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
