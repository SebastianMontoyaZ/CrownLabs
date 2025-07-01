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
import { MockLink } from '@apollo/client/testing';

const DEV_MODE = process.env.NODE_ENV === 'development';

// Enhanced tenant mock matching the exact GraphQL schema
const tenantMocks = [
  {
    request: {
      query: TenantDocument,
      variables: { tenantId: 'john-doe' },
    },
    result: {
      data: {
        tenant: {
          __typename: 'ItPolitoCrownlabsV1alpha2Tenant',
          metadata: {
            __typename: 'IoK8sApimachineryPkgApisMetaV1ObjectMeta',
            name: 'john-doe',
          },
          spec: {
            __typename: 'Spec7',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            lastLogin: '2024-01-20T10:30:00Z',
            workspaces: [
              {
                __typename: 'WorkspacesListItem',
                role: Role.Manager,
                name: 'john-doe',
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
            publicKeys: ['ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7...'],
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
      },
    },
  },
];

// Fix workspaces mock to match the exact schema
const workspacesMocks = [
  {
    request: {
      query: WorkspacesDocument,
      variables: { labels: undefined },
    },
    result: {
      data: {
        workspaces: {
          __typename: 'ItPolitoCrownlabsV1alpha1WorkspaceList',
          items: [
            {
              __typename: 'ItPolitoCrownlabsV1alpha1Workspace',
              metadata: {
                __typename: 'IoK8sApimachineryPkgApisMetaV1ObjectMeta',
                name: 'john-doe',
              },
              spec: {
                __typename: 'Spec2',
                prettyName: 'Personal Workspace',
                autoEnroll: null,
              },
            },
          ],
        },
      },
    },
  },
  // Add explicit mock for null labels
  {
    request: {
      query: WorkspacesDocument,
      variables: { labels: null },
    },
    result: {
      data: {
        workspaces: {
          __typename: 'ItPolitoCrownlabsV1alpha1WorkspaceList',
          items: [
            {
              __typename: 'ItPolitoCrownlabsV1alpha1Workspace',
              metadata: {
                __typename: 'IoK8sApimachineryPkgApisMetaV1ObjectMeta',
                name: 'john-doe',
              },
              spec: {
                __typename: 'Spec2',
                prettyName: 'Personal Workspace',
                autoEnroll: null,
              },
            },
          ],
        },
      },
    },
  },
];

// Fix workspace templates mock to match exact schema
const workspaceTemplatesMocks = [
  {
    request: {
      query: WorkspaceTemplatesDocument,
      variables: { workspaceNamespace: 'tenant-john-doe' },
    },
    result: {
      data: {
        templateList: {
          __typename: 'ItPolitoCrownlabsV1alpha2TemplateList',
          templates: [
            {
              __typename: 'ItPolitoCrownlabsV1alpha2Template',
              metadata: {
                __typename: 'IoK8sApimachineryPkgApisMetaV1ObjectMeta',
                name: 'python-dev',
                namespace: 'tenant-john-doe',
              },
              spec: {
                __typename: 'Spec6',
                prettyName: 'Python Development Environment',
                description: 'Complete Python development setup with VS Code',
                environmentList: [
                  {
                    __typename: 'EnvironmentListListItem',
                    name: 'python-env',
                    environmentType: EnvironmentType.Container,
                    guiEnabled: true,
                    persistent: true,
                    image: 'registry.crownlabs.polito.it/python-dev:latest',
                    mountMyDriveVolume: true,
                    mode: null,
                    nodeSelector: null,
                    disableControls: false,
                    rewriteURL: false,
                    storageClassName: null,
                    containerStartupOptions: null,
                    sharedVolumeMounts: null,
                    resources: {
                      __typename: 'Resources',
                      cpu: 2,
                      memory: '4Gi',
                      disk: '20Gi',
                    },
                  },
                ],
                workspaceCrownlabsPolitoItWorkspaceRef: {
                  __typename: 'WorkspaceCrownlabsPolitoItWorkspaceRef',
                  name: 'john-doe',
                },
              },
            },
            {
              __typename: 'ItPolitoCrownlabsV1alpha2Template',
              metadata: {
                __typename: 'IoK8sApimachineryPkgApisMetaV1ObjectMeta',
                name: 'jupyter-notebook',
                namespace: 'tenant-john-doe',
              },
              spec: {
                __typename: 'Spec6',
                prettyName: 'Jupyter Data Science Environment',
                description: 'Jupyter notebook with data science libraries',
                environmentList: [
                  {
                    __typename: 'EnvironmentListListItem',
                    name: 'jupyter-env',
                    environmentType: EnvironmentType.Container,
                    guiEnabled: true,
                    persistent: true,
                    image: 'jupyter/datascience-notebook:latest',
                    mountMyDriveVolume: true,
                    mode: null,
                    nodeSelector: null,
                    disableControls: false,
                    rewriteURL: false,
                    storageClassName: null,
                    containerStartupOptions: null,
                    sharedVolumeMounts: null,
                    resources: {
                      __typename: 'Resources',
                      cpu: 1,
                      memory: '2Gi',
                      disk: '15Gi',
                    },
                  },
                ],
                workspaceCrownlabsPolitoItWorkspaceRef: {
                  __typename: 'WorkspaceCrownlabsPolitoItWorkspaceRef',
                  name: 'john-doe',
                },
              },
            },
          ],
        },
      },
    },
  },
];

// Fix instances mock to match the exact schema from instances.query.graphql
const ownedInstancesMocks = [
  {
    request: {
      query: OwnedInstancesDocument,
      variables: { tenantNamespace: 'tenant-john-doe' },
    },
    result: {
      data: {
        instanceList: {
          __typename: 'ListCrownlabsPolitoItV1alpha2NamespacedInstance',
          instances: [
            // RUNNING Python instance
            {
              __typename: 'ItPolitoCrownlabsV1alpha2Instance',
              metadata: {
                __typename: 'IoK8sApimachineryPkgApisMetaV1ObjectMeta',
                name: 'python-dev-instance-1',
                namespace: 'tenant-john-doe',
                creationTimestamp: '2024-01-15T10:30:00Z',
                labels: {
                  'crownlabs.polito.it/template': 'python-dev',
                  'crownlabs.polito.it/workspace': 'john-doe',
                  'crownlabs.polito.it/managed-by': 'instance-operator',
                  'crownlabs.polito.it/persistent': 'true',
                },
              },
              status: {
                __typename: 'Status6',
                ip: '10.244.1.15',
                phase: 'Ready',
                url: 'https://python-dev-instance-1.crownlabs.polito.it',
                nodeName: 'worker-node-1',
                nodeSelector: null,
              },
              spec: {
                __typename: 'Spec5',
                running: true,
              },
            },
            // RUNNING Jupyter instance
            {
              __typename: 'ItPolitoCrownlabsV1alpha2Instance',
              metadata: {
                __typename: 'IoK8sApimachineryPkgApisMetaV1ObjectMeta',
                name: 'jupyter-notebook-instance-1',
                namespace: 'tenant-john-doe',
                creationTimestamp: '2024-01-16T09:15:00Z',
                labels: {
                  'crownlabs.polito.it/template': 'jupyter-notebook',
                  'crownlabs.polito.it/workspace': 'john-doe',
                  'crownlabs.polito.it/managed-by': 'instance-operator',
                  'crownlabs.polito.it/persistent': 'true',
                },
              },
              status: {
                __typename: 'Status6',
                ip: '10.244.1.22',
                phase: 'Ready',
                url: 'https://jupyter-notebook-instance-1.crownlabs.polito.it',
                nodeName: 'worker-node-2',
                nodeSelector: null,
              },
              spec: {
                __typename: 'Spec5',
                running: true,
              },
            },
          ],
        },
      },
    },
  },
];

// Fix images mock to match exact schema
const imagesMocks = [
  {
    request: {
      query: ImagesDocument,
      variables: {},
    },
    result: {
      data: {
        imageList: {
          __typename: 'ItPolitoCrownlabsV1alpha1ImageListList',
          images: [
            {
              __typename: 'ItPolitoCrownlabsV1alpha1ImageList',
              spec: {
                __typename: 'Spec',
                registryName: 'docker.io',
                images: [
                  {
                    __typename: 'ImagesListItem',
                    name: 'python',
                    versions: ['3.11', '3.10', '3.9', 'latest'],
                  },
                  {
                    __typename: 'ImagesListItem',
                    name: 'node',
                    versions: ['18', '16', '14', 'latest'],
                  },
                  {
                    __typename: 'ImagesListItem',
                    name: 'ubuntu',
                    versions: ['22.04', '20.04', '18.04', 'latest'],
                  },
                  {
                    __typename: 'ImagesListItem',
                    name: 'jupyter/datascience-notebook',
                    versions: ['latest', '2023-05-08'],
                  },
                ],
              },
            },
            {
              __typename: 'ItPolitoCrownlabsV1alpha1ImageList',
              spec: {
                __typename: 'Spec',
                registryName: 'registry.internal.crownlabs.polito.it',
                images: [
                  {
                    __typename: 'ImagesListItem',
                    name: 'ubuntu-vm',
                    versions: ['22.04', '20.04'],
                  },
                  {
                    __typename: 'ImagesListItem',
                    name: 'windows-vm',
                    versions: ['10', '11'],
                  },
                ],
              },
            },
          ],
        },
      },
    },
  },
];

// Add shared volumes mock
const sharedVolumesMocks = [
  {
    request: {
      query: WorkspaceSharedVolumesDocument,
      variables: { workspaceNamespace: 'tenant-john-doe' },
    },
    result: {
      data: {
        sharedvolumeList: {
          __typename: 'ItPolitoCrownlabsV1alpha2SharedVolumeList',
          sharedvolumes: [
            {
              __typename: 'ItPolitoCrownlabsV1alpha2SharedVolume',
              metadata: {
                __typename: 'IoK8sApimachineryPkgApisMetaV1ObjectMeta',
                name: 'shared-data',
                namespace: 'tenant-john-doe',
              },
              spec: {
                __typename: 'Spec5',
                prettyName: 'Shared Data Volume',
                size: '10Gi',
              },
              status: {
                __typename: 'Status5',
                phase: 'Ready',
              },
            },
          ],
        },
      },
    },
  },
];

// Combine all mocks
const allMocks = [
  ...tenantMocks,
  ...workspacesMocks,
  ...workspaceTemplatesMocks,
  ...ownedInstancesMocks,
  ...imagesMocks,
  ...sharedVolumesMocks,
];

let client: ApolloClient<any>;

if (DEV_MODE) {
  console.log('🚀 Development mode with CORRECTLY MOCKED data loaded');
  console.log('📊 Available mock data:', {
    tenants: tenantMocks.length,
    workspaces: workspacesMocks.length,
    templates: workspaceTemplatesMocks.length,
    ownedInstances: ownedInstancesMocks.length,
    images: imagesMocks.length,
    sharedVolumes: sharedVolumesMocks.length,
    totalMocks: allMocks.length,
  });

  const mockLink = new MockLink(allMocks, true);

  client = new ApolloClient({
    link: mockLink,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
      },
      query: {
        errorPolicy: 'all',
      },
    },
  });
} else {
  const httpLink = new HttpLink({
    uri: REACT_APP_CROWNLABS_GRAPHQL_URL,
  });

  const wsLink = new GraphQLWsLink(
    createClient({
      url: REACT_APP_CROWNLABS_GRAPHQL_URL?.replace('http', 'ws') || '',
    })
  );

  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    wsLink,
    httpLink
  );

  client = new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
      },
      query: {
        errorPolicy: 'all',
      },
    },
  });
}

const ApolloClientSetup: FC<PropsWithChildren> = ({ children }) => {
  const { errorsQueue } = useContext(ErrorContext);
  const [showChildren, setShowChildren] = useState<boolean>(false);

  useEffect(() => {
    setShowChildren(!hasRenderingError(errorsQueue));
  }, [errorsQueue]);

  return (
    <ApolloProvider client={client}>{showChildren && children}</ApolloProvider>
  );
};

export default ApolloClientSetup;

// Enhanced logging
if (DEV_MODE) {
  console.log('🚀 Development mode with ENHANCED MOCK DATA');
  console.log('📊 Mock data summary:', {
    templates: 2, // Python, Jupyter
    instances: 2, // 2 running
    expectedUsage: {
      cpu: '3 cores (2+1 from running instances)',
      memory: '6Gi (4Gi+2Gi from running instances)',
      runningInstances: 2,
    },
    quota: {
      cpu: '23 cores total',
      memory: '48Gi total',
      instances: '8 instances max',
    },
  });

  console.log('📈 Mock counts:', {
    tenant: tenantMocks.length,
    workspaces: workspacesMocks.length,
    templates: workspaceTemplatesMocks.length,
    ownedInstances: ownedInstancesMocks.length,
    images: imagesMocks.length,
    sharedVolumes: sharedVolumesMocks.length,
    totalMocks: allMocks.length,
  });
}
