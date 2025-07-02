import React, {
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  ApolloProvider,
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
  type NormalizedCacheObject,
} from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { ErrorContext } from '../../errorHandling/ErrorContext';
import { REACT_APP_CROWNLABS_GRAPHQL_URL } from '../../env';
import { hasRenderingError } from '../../errorHandling/utils';
import {
  TenantDocument,
  OwnedInstancesDocument,
  WorkspaceTemplatesDocument,
  ImagesDocument,
  WorkspacesDocument,
  WorkspaceSharedVolumesDocument,
  Role,
  EnvironmentType,
} from '../../generated-types';
import { MockedProvider } from '@apollo/client/testing';
import type { ReactNode } from 'react';

const DEV_MODE = process.env.NODE_ENV === 'development';

console.log('🚀 Development mode with CORRECTLY MOCKED data loaded');

// Enhanced mock data with proper relationships
const MOCK_TENANT_NAMESPACE = 'tenant-johndoe';
const MOCK_WORKSPACE_NAMESPACE = 'workspace-dev-johndoe';
const MOCK_PERSONAL_WORKSPACE_NAMESPACE = 'workspace-personal-johndoe';

const mockTenant = {
  __typename: 'Tenant',
  metadata: {
    __typename: 'ObjectMeta',
    name: MOCK_TENANT_NAMESPACE,
    namespace: MOCK_TENANT_NAMESPACE,
    creationTimestamp: '2024-01-01T00:00:00Z',
  },
  spec: {
    __typename: 'TenantSpec',
    prettyName: 'John Doe',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    publicKeys: [],
    workspaces: [
      {
        __typename: 'TenantWorkspace',
        name: 'development',
        role: 'manager',
      },
      {
        __typename: 'TenantWorkspace',
        name: 'personal',
        role: 'user',
      },
    ],
  },
  status: {
    __typename: 'TenantStatus',
    personalNamespace: {
      __typename: 'GenericRef',
      name: MOCK_PERSONAL_WORKSPACE_NAMESPACE,
    },
    subscriptions: [],
    quota: {
      __typename: 'Quota',
      cpu: '8',
      memory: '16Gi',
      instances: 10,
    },
  },
};

const mockWorkspaces = [
  {
    __typename: 'Workspace',
    metadata: {
      __typename: 'ObjectMeta',
      name: 'development',
      namespace: MOCK_WORKSPACE_NAMESPACE,
      creationTimestamp: '2024-01-01T00:00:00Z',
    },
    spec: {
      __typename: 'WorkspaceSpec',
      prettyName: 'Development Environment',
      environmentList: ['Container', 'VirtualMachine'],
    },
    status: {
      __typename: 'WorkspaceStatus',
      namespace: {
        __typename: 'GenericRef',
        name: MOCK_WORKSPACE_NAMESPACE,
      },
    },
  },
  {
    __typename: 'Workspace',
    metadata: {
      __typename: 'ObjectMeta',
      name: 'personal',
      namespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE,
      creationTimestamp: '2024-01-01T00:00:00Z',
    },
    spec: {
      __typename: 'WorkspaceSpec',
      prettyName: 'Personal Workspace',
      environmentList: ['Container'],
    },
    status: {
      __typename: 'WorkspaceStatus',
      namespace: {
        __typename: 'GenericRef',
        name: MOCK_PERSONAL_WORKSPACE_NAMESPACE,
      },
    },
  },
];

const mockTemplates = [
  {
    __typename: 'Template',
    metadata: {
      __typename: 'ObjectMeta',
      name: 'ubuntu-dev-template',
      namespace: MOCK_WORKSPACE_NAMESPACE,
      creationTimestamp: '2024-01-01T00:00:00Z',
      labels: {
        'crownlabs.polito.it/workspace': 'development',
      },
    },
    spec: {
      __typename: 'TemplateSpec',
      prettyName: 'Ubuntu Development Environment',
      description: 'Ubuntu 22.04 with development tools',
      environmentList: ['Container'],
      workspaceRef: {
        __typename: 'GenericRef',
        name: 'development',
        namespace: MOCK_WORKSPACE_NAMESPACE,
      },
      image: 'ubuntu:22.04',
      guiEnabled: true,
      persistent: false,
      mountMyDriveVolume: true,
      resources: {
        __typename: 'EnvironmentResources',
        cpu: 2,
        memory: '4Gi',
        disk: '10Gi',
        reservedCPUPercentage: 50,
      },
    },
  },
  {
    __typename: 'Template',
    metadata: {
      __typename: 'ObjectMeta',
      name: 'python-jupyter-template',
      namespace: MOCK_WORKSPACE_NAMESPACE,
      creationTimestamp: '2024-01-01T00:00:00Z',
      labels: {
        'crownlabs.polito.it/workspace': 'development',
      },
    },
    spec: {
      __typename: 'TemplateSpec',
      prettyName: 'Python Jupyter Notebook',
      description: 'Jupyter notebook with Python data science stack',
      environmentList: ['Container'],
      workspaceRef: {
        __typename: 'GenericRef',
        name: 'development',
        namespace: MOCK_WORKSPACE_NAMESPACE,
      },
      image: 'jupyter/datascience-notebook:latest',
      guiEnabled: true,
      persistent: true,
      mountMyDriveVolume: true,
      resources: {
        __typename: 'EnvironmentResources',
        cpu: 4,
        memory: '8Gi',
        disk: '20Gi',
        reservedCPUPercentage: 50,
      },
    },
  },
];

const mockInstances = [
  {
    __typename: 'Instance',
    metadata: {
      __typename: 'ObjectMeta',
      name: 'ubuntu-dev-instance-1',
      namespace: MOCK_TENANT_NAMESPACE,
      creationTimestamp: '2024-01-01T10:00:00Z',
      labels: {
        'crownlabs.polito.it/template': 'ubuntu-dev-template',
        'crownlabs.polito.it/workspace': 'development',
      },
    },
    spec: {
      __typename: 'InstanceSpec',
      prettyName: 'My Ubuntu Dev Environment',
      templateRef: {
        __typename: 'GenericRef',
        name: 'ubuntu-dev-template',
        namespace: MOCK_WORKSPACE_NAMESPACE,
      },
      tenantRef: {
        __typename: 'GenericRef',
        name: MOCK_TENANT_NAMESPACE,
        namespace: MOCK_TENANT_NAMESPACE,
      },
    },
    status: {
      __typename: 'InstanceStatus',
      phase: 'Ready',
      url: 'https://ubuntu-dev-instance-1.crownlabs.polito.it',
      ip: '10.1.1.100',
    },
  },
  {
    __typename: 'Instance',
    metadata: {
      __typename: 'ObjectMeta',
      name: 'jupyter-instance-1',
      namespace: MOCK_TENANT_NAMESPACE,
      creationTimestamp: '2024-01-01T11:00:00Z',
      labels: {
        'crownlabs.polito.it/template': 'python-jupyter-template',
        'crownlabs.polito.it/workspace': 'development',
      },
    },
    spec: {
      __typename: 'InstanceSpec',
      prettyName: 'My Jupyter Notebook',
      templateRef: {
        __typename: 'GenericRef',
        name: 'python-jupyter-template',
        namespace: MOCK_WORKSPACE_NAMESPACE,
      },
      tenantRef: {
        __typename: 'GenericRef',
        name: MOCK_TENANT_NAMESPACE,
        namespace: MOCK_TENANT_NAMESPACE,
      },
    },
    status: {
      __typename: 'InstanceStatus',
      phase: 'Ready',
      url: 'https://jupyter-instance-1.crownlabs.polito.it',
      ip: '10.1.1.101',
    },
  },
];

const mockImages = [
  {
    __typename: 'Image',
    metadata: {
      __typename: 'ObjectMeta',
      name: 'ubuntu-images',
      namespace: 'default',
    },
    spec: {
      __typename: 'ImageSpec',
      registryName: 'docker.io',
      images: [
        {
          __typename: 'ImageInfo',
          name: 'ubuntu',
          versions: ['22.04', '20.04', 'latest'],
        },
        {
          __typename: 'ImageInfo',
          name: 'python',
          versions: ['3.11', '3.10', '3.9'],
        },
        {
          __typename: 'ImageInfo',
          name: 'jupyter/datascience-notebook',
          versions: ['latest', '2024-01-01'],
        },
      ],
    },
  },
];

const mocks = [
  // Tenant query
  {
    request: {
      query: TenantDocument,
      variables: { tenantNamespace: MOCK_TENANT_NAMESPACE },
    },
    result: {
      data: {
        tenant: mockTenant,
      },
    },
  },

  // Workspaces query
  {
    request: {
      query: WorkspacesDocument,
      variables: { tenantNamespace: MOCK_TENANT_NAMESPACE },
    },
    result: {
      data: {
        workspaceList: {
          __typename: 'WorkspaceList',
          workspaces: mockWorkspaces,
        },
      },
    },
  },

  // Workspace templates query
  {
    request: {
      query: WorkspaceTemplatesDocument,
      variables: { workspaceNamespace: MOCK_WORKSPACE_NAMESPACE },
    },
    result: {
      data: {
        templateList: {
          __typename: 'TemplateList',
          templates: mockTemplates,
        },
      },
    },
  },

  // Personal workspace templates query (empty for now)
  {
    request: {
      query: WorkspaceTemplatesDocument,
      variables: { workspaceNamespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE },
    },
    result: {
      data: {
        templateList: {
          __typename: 'TemplateList',
          templates: [],
        },
      },
    },
  },

  // Owned instances query
  {
    request: {
      query: OwnedInstancesDocument,
      variables: { tenantNamespace: MOCK_TENANT_NAMESPACE },
    },
    result: {
      data: {
        instanceList: {
          __typename: 'InstanceList',
          instances: mockInstances,
        },
      },
    },
  },

  // Images query
  {
    request: {
      query: ImagesDocument,
      variables: {},
    },
    result: {
      data: {
        imageList: {
          __typename: 'ImageList',
          images: mockImages,
        },
      },
    },
  },

  // Shared volumes query
  {
    request: {
      query: WorkspaceSharedVolumesDocument,
      variables: { workspaceNamespace: MOCK_WORKSPACE_NAMESPACE },
    },
    result: {
      data: {
        sharedVolumeList: {
          __typename: 'SharedVolumeList',
          sharedVolumes: [],
        },
      },
    },
  },
];

console.log('📊 Available mock data:', {
  tenants: 1,
  workspaces: mockWorkspaces.length,
  templates: mockTemplates.length,
  ownedInstances: mockInstances.length,
  images: mockImages.length,
  sharedVolumes: 0,
  totalMocks: mocks.length,
});

interface ApolloClientSetupProps {
  children: ReactNode;
}

const ApolloClientSetup: FC<ApolloClientSetupProps> = ({ children }) => {
  if (DEV_MODE) {
    console.log('🚀 Using MockedProvider for development');
    return (
      <MockedProvider mocks={mocks} addTypename={true}>
        {children}
      </MockedProvider>
    );
  }

  // Production Apollo Client setup would go here
  const client = new ApolloClient({
    uri: process.env.VITE_APP_CROWNLABS_GRAPHQL_URL,
    cache: new InMemoryCache(),
  });

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};

export default ApolloClientSetup;
