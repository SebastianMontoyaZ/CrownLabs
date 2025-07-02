import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from 'react';
import { WorkspaceRole } from '../utils';
import { useTenantQuery, TenantQuery, Role } from '../generated-types';
import { ErrorContext } from '../errorHandling/ErrorContext';
import type { ApolloError } from '@apollo/client';
import type { TenantQuery } from '../generated-types';
import type { JointContent } from 'antd/lib/message/interface';

export type Notifier = (
  type: 'warning' | 'success',
  key: string,
  content: JointContent
) => void;

interface ITenantContext {
  data?: TenantQuery;
  displayName: string;
  loading?: boolean;
  error?: ApolloError;
  hasSSHKeys: boolean;
  now: Date;
  refreshClock: () => void;
  notify: Notifier;
}

export const TenantContext = createContext<ITenantContextProps>({
  data: undefined,
  loading: false,
  error: null,
  refreshClock: () => {},
  now: new Date(),
  hasSSHKeys: false,
});

export interface ITenantProviderProps {
  children: ReactNode;
}

// Mock data for development
const mockTenantData: TenantQuery = {
  tenant: {
    __typename: 'ItPolitoCrownlabsV1alpha2Tenant',
    spec: {
      __typename: 'Spec7',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      workspaces: [
        {
          __typename: 'WorkspacesListItem',
          name: 'dev-workspace',
          role: Role.Manager,
          workspaceWrapperTenantV1alpha2: {
            __typename: 'WorkspaceWrapperTenantV1alpha2',
            itPolitoCrownlabsV1alpha1Workspace: {
              __typename: 'ItPolitoCrownlabsV1alpha1Workspace',
              spec: {
                __typename: 'Spec2',
                prettyName: 'Development Workspace',
              },
              status: {
                __typename: 'Status2',
                namespace: {
                  __typename: 'Namespace',
                  name: 'workspace-dev',
                },
              },
            },
          },
        },
        {
          __typename: 'WorkspacesListItem',
          name: 'personal-john-doe',
          role: Role.Manager,
          workspaceWrapperTenantV1alpha2: {
            __typename: 'WorkspaceWrapperTenantV1alpha2',
            itPolitoCrownlabsV1alpha1Workspace: {
              __typename: 'ItPolitoCrownlabsV1alpha1Workspace',
              spec: {
                __typename: 'Spec2',
                prettyName: 'Personal Workspace',
              },
              status: {
                __typename: 'Status2',
                namespace: {
                  __typename: 'Namespace',
                  name: 'tenant-john-doe',
                },
              },
            },
          },
        },
      ],
    },
    status: {
      __typename: 'Status7',
      personalNamespace: {
        __typename: 'PersonalNamespace',
        name: 'tenant-john-doe',
        created: true,
      },
      quota: {
        __typename: 'Quota3',
        instances: 8,
        cpu: '23',
        memory: '48Gi',
      },
    },
  },
};

export const TenantProvider: React.FC<ITenantProviderProps> = ({
  children,
}) => {
  const { apolloErrorCatcher } = useContext(ErrorContext);

  // ✅ Use hardcoded tenantId for now since we don't have access to UserContext
  const tenantId = 'john-doe'; // In a real app, this would come from authentication/routing

  const { data, loading, error, refetch } = useTenantQuery({
    variables: { tenantId }, // ✅ Provide required tenantId variable
    onError: apolloErrorCatcher,
    fetchPolicy: 'cache-and-network',
  });

  const [now, setNow] = useState(new Date());
  const [hasSSHKeys, setHasSSHKeys] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (data?.tenant) {
      setHasSSHKeys(!!data.tenant);
    }
  }, [data]);

  const refreshClock = () => {
    setNow(new Date());
    if (process.env.NODE_ENV !== 'development') {
      refetch();
    }
  };

  const isDevelopment = process.env.NODE_ENV === 'development';
  const contextValue: ITenantContextProps = {
    data: isDevelopment ? mockTenantData : data,
    loading: isDevelopment ? false : loading,
    error: isDevelopment ? null : error,
    refreshClock,
    now,
    hasSSHKeys: isDevelopment ? true : hasSSHKeys,
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};

export default TenantContext;
