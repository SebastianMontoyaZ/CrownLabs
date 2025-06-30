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
import { WorkspaceTemplatesQuery, Role } from '../../generated-types';
import { gql } from '@apollo/client';
import { TenantDocument, OwnedInstancesDocument } from '../../generated-types';
import { MockLink, MockedProvider } from '@apollo/client/testing';

const DEV_MODE = process.env.NODE_ENV === 'development';

// Enhanced tenant mock with proper user ID that matches AuthContext
const tenantMocks = [
  {
    request: {
      query: TenantDocument,
      variables: {},
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
              instances: 10,
              cpu: '8',
              memory: '32Gi',
            },
          },
        },
      },
    },
  },
];

// Fix the ownedInstances query mock using the actual document
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
                nodeSelector: {
                  'kubernetes.io/arch': 'amd64',
                  'node-type': 'compute',
                },
              },
              spec: {
                __typename: 'Spec5',
                running: true,
                prettyName: 'My Python Development Environment',
                templateCrownlabsPolitoItTemplateRef: {
                  __typename: 'TemplateCrownlabsPolitoItTemplateRef',
                  name: 'python-dev',
                  namespace: 'tenant-john-doe',
                  templateWrapper: {
                    __typename: 'TemplateWrapper',
                    itPolitoCrownlabsV1alpha2Template: {
                      __typename: 'ItPolitoCrownlabsV1alpha2Template',
                      spec: {
                        __typename: 'Spec6',
                        prettyName: 'Python Development Environment',
                        description:
                          'Complete Python development setup with Jupyter, VS Code, and common libraries',
                        environmentList: [
                          {
                            __typename: 'EnvironmentListListItem',
                            guiEnabled: true,
                            persistent: true,
                            environmentType: 'Container',
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
            {
              __typename: 'ItPolitoCrownlabsV1alpha2Instance',
              metadata: {
                __typename: 'IoK8sApimachineryPkgApisMetaV1ObjectMeta',
                name: 'ubuntu-vm-instance-1',
                namespace: 'tenant-john-doe',
                creationTimestamp: '2024-01-15T14:20:00Z',
                labels: {
                  'crownlabs.polito.it/template': 'ubuntu-vm',
                  'crownlabs.polito.it/workspace': 'john-doe',
                  'crownlabs.polito.it/managed-by': 'instance-operator',
                  'crownlabs.polito.it/persistent': 'false',
                },
              },
              status: {
                __typename: 'Status6',
                ip: null,
                phase: 'Off',
                url: null,
                nodeName: null,
                nodeSelector: null,
              },
              spec: {
                __typename: 'Spec5',
                running: false,
                prettyName: 'Ubuntu Virtual Machine Instance',
                templateCrownlabsPolitoItTemplateRef: {
                  __typename: 'TemplateCrownlabsPolitoItTemplateRef',
                  name: 'ubuntu-vm',
                  namespace: 'tenant-john-doe',
                  templateWrapper: {
                    __typename: 'TemplateWrapper',
                    itPolitoCrownlabsV1alpha2Template: {
                      __typename: 'ItPolitoCrownlabsV1alpha2Template',
                      spec: {
                        __typename: 'Spec6',
                        prettyName: 'Ubuntu Virtual Machine',
                        description:
                          'Ubuntu 22.04 LTS virtual machine with desktop environment',
                        environmentList: [
                          {
                            __typename: 'EnvironmentListListItem',
                            guiEnabled: true,
                            persistent: false,
                            environmentType: 'VirtualMachine',
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
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
                nodeSelector: {
                  'kubernetes.io/arch': 'amd64',
                  'node-type': 'compute',
                },
              },
              spec: {
                __typename: 'Spec5',
                running: true,
                prettyName: 'Jupyter Data Science Notebook',
                templateCrownlabsPolitoItTemplateRef: {
                  __typename: 'TemplateCrownlabsPolitoItTemplateRef',
                  name: 'jupyter-notebook',
                  namespace: 'tenant-john-doe',
                  templateWrapper: {
                    __typename: 'TemplateWrapper',
                    itPolitoCrownlabsV1alpha2Template: {
                      __typename: 'ItPolitoCrownlabsV1alpha2Template',
                      spec: {
                        __typename: 'Spec6',
                        prettyName: 'Jupyter Data Science Environment',
                        description:
                          'Jupyter notebook with data science libraries and tools',
                        environmentList: [
                          {
                            __typename: 'EnvironmentListListItem',
                            guiEnabled: true,
                            persistent: true,
                            environmentType: 'Container',
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    },
  },
];

// Enhanced subscription mocks
const instanceSubscriptionMocks = [
  {
    request: {
      query: gql`
        subscription updatedOwnedInstances(
          $tenantNamespace: String!
          $instanceId: String
        ) {
          updateInstance: itPolitoCrownlabsV1alpha2InstanceUpdate(
            namespace: $tenantNamespace
            name: $instanceId
          ) {
            updateType
            instance: payload {
              metadata {
                name
                namespace
                creationTimestamp
                labels
                __typename
              }
              status {
                ip
                phase
                url
                __typename
              }
              spec {
                running
                prettyName
                templateCrownlabsPolitoItTemplateRef {
                  name
                  namespace
                  templateWrapper {
                    itPolitoCrownlabsV1alpha2Template {
                      spec {
                        prettyName
                        description
                        environmentList {
                          guiEnabled
                          persistent
                          environmentType
                          __typename
                        }
                        __typename
                      }
                      __typename
                    }
                    __typename
                  }
                  __typename
                }
                __typename
              }
              __typename
            }
            __typename
          }
        }
      `,
      variables: { tenantNamespace: 'tenant-john-doe' },
    },
    result: {
      data: {
        updateInstance: {
          __typename: 'ItPolitoCrownlabsV1alpha2InstanceUpdate',
          updateType: 'ADDED',
          instance: {
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
              },
            },
            status: {
              __typename: 'Status6',
              ip: '10.244.1.15',
              phase: 'Ready',
              url: 'https://python-dev-instance-1.crownlabs.polito.it',
            },
            spec: {
              __typename: 'Spec5',
              running: true,
              prettyName: 'My Python Development Environment',
              templateCrownlabsPolitoItTemplateRef: {
                __typename: 'TemplateCrownlabsPolitoItTemplateRef',
                name: 'python-dev',
                namespace: 'tenant-john-doe',
                templateWrapper: {
                  __typename: 'TemplateWrapper',
                  itPolitoCrownlabsV1alpha2Template: {
                    __typename: 'ItPolitoCrownlabsV1alpha2Template',
                    spec: {
                      __typename: 'Spec6',
                      prettyName: 'Python Development Environment',
                      description:
                        'Complete Python development setup with Jupyter, VS Code, and common libraries',
                      environmentList: [
                        {
                          __typename: 'EnvironmentListListItem',
                          guiEnabled: true,
                          persistent: true,
                          environmentType: 'Container',
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
];

// Enhanced workspace templates mock
const workspaceTemplatesMocks = [
  {
    request: {
      query: gql`
        query workspaceTemplates($workspaceNamespace: String!) {
          templateList: itPolitoCrownlabsV1alpha2TemplateList(
            namespace: $workspaceNamespace
          ) {
            templates: items {
              metadata {
                name
                namespace
              }
              spec {
                prettyName
                description
                environmentList {
                  guiEnabled
                  persistent
                  resources {
                    cpu
                    disk
                    memory
                  }
                }
                workspaceCrownlabsPolitoItWorkspaceRef {
                  name
                }
              }
            }
          }
        }
      `,
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
                description:
                  'Complete Python development setup with Jupyter, VS Code, and common libraries',
                environmentList: [
                  {
                    __typename: 'EnvironmentListListItem',
                    guiEnabled: true,
                    persistent: true,
                    resources: {
                      __typename: 'Resources',
                      cpu: 2,
                      disk: '20Gi',
                      memory: '4Gi',
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
                name: 'ubuntu-vm',
                namespace: 'tenant-john-doe',
              },
              spec: {
                __typename: 'Spec6',
                prettyName: 'Ubuntu Virtual Machine',
                description:
                  'Ubuntu 22.04 LTS virtual machine with desktop environment',
                environmentList: [
                  {
                    __typename: 'EnvironmentListListItem',
                    guiEnabled: true,
                    persistent: false,
                    resources: {
                      __typename: 'Resources',
                      cpu: 2,
                      disk: '30Gi',
                      memory: '4Gi',
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
                description:
                  'Jupyter notebook with data science libraries and tools',
                environmentList: [
                  {
                    __typename: 'EnvironmentListListItem',
                    guiEnabled: true,
                    persistent: true,
                    resources: {
                      __typename: 'Resources',
                      cpu: 1,
                      disk: '15Gi',
                      memory: '2Gi',
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

// Images mock
const imagesMocks = [
  {
    request: {
      query: gql`
        query images {
          imageList: itPolitoCrownlabsV1alpha1ImageListList {
            images: items {
              spec {
                registryName
                images {
                  name
                  versions
                }
              }
            }
          }
        }
      `,
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
                registryName: 'registry.crownlabs.polito.it/vm',
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

// Your existing workspaces mock
const workspacesMocks = [
  {
    request: {
      query: gql`
        query workspaces {
          workspaceList: itPolitoCrownlabsV1alpha1WorkspaceList {
            workspaces: items {
              metadata {
                name
                namespace
              }
              spec {
                prettyName
              }
              status {
                namespace {
                  name
                  created
                }
                subscription {
                  status
                }
                role
              }
            }
          }
        }
      `,
      variables: {},
    },
    result: {
      data: {
        workspaceList: {
          __typename: 'ItPolitoCrownlabsV1alpha1WorkspaceList',
          workspaces: [
            {
              __typename: 'ItPolitoCrownlabsV1alpha1Workspace',
              metadata: {
                __typename: 'IoK8sApimachineryPkgApisMetaV1ObjectMeta',
                name: 'john-doe',
                namespace: 'workspace-john-doe',
              },
              spec: {
                __typename: 'Spec2',
                prettyName: 'Personal Workspace',
              },
              status: {
                __typename: 'Status2',
                namespace: {
                  __typename: 'Namespace',
                  name: 'tenant-john-doe',
                  created: true,
                },
                subscription: {
                  __typename: 'Subscription',
                  status: 'Ok',
                },
                role: Role.User,
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
  ...instanceSubscriptionMocks,
  ...imagesMocks,
];

let client: ApolloClient<any>;

if (DEV_MODE) {
  console.log('🚀 Development mode with CORRECTLY MOCKED instances loaded');
  console.log('📊 Available mock data:', {
    tenants: tenantMocks.length,
    workspaces: workspacesMocks.length,
    templates: workspaceTemplatesMocks.length,
    ownedInstances: ownedInstancesMocks.length,
    instanceSubscriptions: instanceSubscriptionMocks.length,
    images: imagesMocks.length,
    totalMocks: allMocks.length,
  });
  console.log('🎯 Using OwnedInstancesDocument from generated-types');
  console.log('👤 Mock user ID should be: john-doe');

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
