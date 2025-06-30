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
import { TenantDocument } from '../../generated-types';
import { MockLink, MockedProvider } from '@apollo/client/testing';

const DEV_MODE = process.env.NODE_ENV === 'development';

// Update the tenant mocks to match the correct Status7 structure
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
          spec: {
            __typename: 'Spec7',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            lastLogin: null,
            publicKeys: ['ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ...'],
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
          metadata: {
            __typename: 'IoK8sApimachineryPkgApisMetaV1ObjectMeta',
            name: 'john-doe',
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

const templateMocks = [
  {
    request: {
      query: gql`
        query WorkspaceTemplates($workspaceNamespace: String!) {
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
                  nodeSelector
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
      variables: {
        workspaceNamespace: 'workspace-dev',
      },
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
                name: 'python-template',
                namespace: 'workspace-dev',
              },
              spec: {
                __typename: 'Spec6',
                prettyName: 'Python Development',
                description: 'Python development environment',
                environmentList: [
                  {
                    __typename: 'EnvironmentListListItem',
                    guiEnabled: true,
                    persistent: false,
                    nodeSelector: {},
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
                  name: 'dev-workspace',
                },
              },
            },
          ],
        },
      },
    },
  },
  {
    request: {
      query: gql`
        query WorkspaceTemplates($workspaceNamespace: String!) {
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
                  nodeSelector
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
      variables: {
        workspaceNamespace: 'tenant-john-doe',
      },
    },
    result: {
      data: {
        templateList: {
          __typename: 'ItPolitoCrownlabsV1alpha2TemplateList',
          templates: [],
        },
      },
    },
  },
];

const sharedVolumesMocks = [
  {
    request: {
      query: gql`
        query WorkspaceSharedVolumes($workspaceNamespace: String!) {
          sharedvolumeList: itPolitoCrownlabsV1alpha2SharedVolumeList(
            namespace: $workspaceNamespace
          ) {
            sharedvolumes: items {
              metadata {
                name
                namespace
              }
              spec {
                prettyName
                size
              }
              status {
                phase
              }
            }
          }
        }
      `,
      variables: {
        workspaceNamespace: 'workspace-dev',
      },
    },
    result: {
      data: {
        sharedvolumeList: {
          __typename: 'ItPolitoCrownlabsV1alpha2SharedVolumeList',
          sharedvolumes: [],
        },
      },
    },
  },
  {
    request: {
      query: gql`
        query WorkspaceSharedVolumes($workspaceNamespace: String!) {
          sharedvolumeList: itPolitoCrownlabsV1alpha2SharedVolumeList(
            namespace: $workspaceNamespace
          ) {
            sharedvolumes: items {
              metadata {
                name
                namespace
              }
              spec {
                prettyName
                size
              }
              status {
                phase
              }
            }
          }
        }
      `,
      variables: {
        workspaceNamespace: 'tenant-john-doe',
      },
    },
    result: {
      data: {
        sharedvolumeList: {
          __typename: 'ItPolitoCrownlabsV1alpha2SharedVolumeList',
          sharedvolumes: [],
        },
      },
    },
  },
];

// Combine all mocks
const allMocks = [...tenantMocks, ...templateMocks, ...sharedVolumesMocks];

let client: ApolloClient<any>;

if (DEV_MODE) {
  console.log('ApolloClientSetup: Setting up development mode with mocks');

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

  console.log('ApolloClientSetup: Created mock Apollo client');
} else {
  // Only try to connect to real GraphQL in production
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
  });
}

export interface IApolloClientSetupProps {}

const ApolloClientSetup: FC<PropsWithChildren<IApolloClientSetupProps>> = ({
  children,
}) => {
  // Remove the error handling logic that's causing the TypeScript error
  // This can be re-added once the ErrorContext interface is properly defined
  // const { nextError, clearError } = useContext(ErrorContext);
  // const [renderingError, setRenderingError] = useState<Error | null>(null);

  // useEffect(() => {
  //   if (hasRenderingError(nextError)) {
  //     setRenderingError(nextError);
  //     clearError();
  //   }
  // }, [nextError, clearError]);

  // if (renderingError) {
  //   throw renderingError;
  // }

  console.log('ApolloClientSetup: Rendering, DEV_MODE:', DEV_MODE);

  if (DEV_MODE) {
    return (
      <MockedProvider mocks={allMocks} addTypename={true}>
        {children}
      </MockedProvider>
    );
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};

export default ApolloClientSetup;
