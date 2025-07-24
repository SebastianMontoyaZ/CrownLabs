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

interface ITenantContextProps {
  data?: TenantQuery;
  loading?: boolean;
  error?: ApolloError | null;
  refreshClock: () => void;
  now: Date;
  hasSSHKeys: boolean;
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

// Mock data for development - FIXED to match Apollo mocks
const mockTenantData: TenantQuery = {
  tenant: {
    __typename: 'ItPolitoCrownlabsV1alpha2Tenant',
    metadata: {
      __typename: 'Metadata7',
      name: 'tenant-johndoe', // 🎯 Match the MOCK_TENANT_NAMESPACE from Apollo
    },
    spec: {
      __typename: 'Spec7',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      workspaces: [
        {
          __typename: 'WorkspacesListItem',
          name: 'development', // 🎯 Match Apollo mock
          role: Role.Manager,
          workspaceWrapperTenantV1alpha2: {
            __typename: 'WorkspaceWrapperTenantV1alpha2',
            itPolitoCrownlabsV1alpha1Workspace: {
              __typename: 'ItPolitoCrownlabsV1alpha1Workspace',
              spec: {
                __typename: 'Spec2',
                prettyName: 'Development Environment', // 🎯 Match Apollo mock
              },
              status: {
                __typename: 'Status2',
                namespace: {
                  __typename: 'Namespace',
                  name: 'workspace-dev-johndoe', // 🎯 Match MOCK_WORKSPACE_NAMESPACE
                },
              },
            },
          },
        },
        {
          __typename: 'WorkspacesListItem',
          name: 'personal', // 🎯 Match Apollo mock
          role: Role.Manager,
          workspaceWrapperTenantV1alpha2: {
            __typename: 'WorkspaceWrapperTenantV1alpha2',
            itPolitoCrownlabsV1alpha1Workspace: {
              __typename: 'ItPolitoCrownlabsV1alpha1Workspace',
              spec: {
                __typename: 'Spec2',
                prettyName: 'Personal Workspace', // 🎯 Match Apollo mock
              },
              status: {
                __typename: 'Status2',
                namespace: {
                  __typename: 'Namespace',
                  name: 'workspace-personal-johndoe', // 🎯 Match MOCK_PERSONAL_WORKSPACE_NAMESPACE
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
        name: 'workspace-personal-johndoe', // 🎯 Match MOCK_PERSONAL_WORKSPACE_NAMESPACE
        created: true,
      },
      quota: {
        __typename: 'Quota3',
        instances: 10, // 🎯 Match Apollo mock
        cpu: '8', // 🎯 Match Apollo mock
        memory: '16Gi', // 🎯 Match Apollo mock
      },
    },
  },
};

export const TenantProvider: React.FC<ITenantProviderProps> = ({
  children,
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const refreshClock = () => {
    setNow(new Date());
  };

  // 🎯 For development, return mock data immediately
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    console.log('🎯 TenantProvider: Using mock data for development');
    const contextValue: ITenantContextProps = {
      data: mockTenantData,
      loading: false,
      error: null,
      refreshClock,
      now,
      hasSSHKeys: true,
    };

    return (
      <TenantContext.Provider value={contextValue}>
        {children}
      </TenantContext.Provider>
    );
  }

  // Production code would go here with real GraphQL queries
  const contextValue: ITenantContextProps = {
    data: undefined,
    loading: true,
    error: null,
    refreshClock,
    now,
    hasSSHKeys: false,
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};

export default TenantContext;
