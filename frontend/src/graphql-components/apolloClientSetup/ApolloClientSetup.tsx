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
  UpdatedWorkspaceTemplatesDocument,
  UpdatedOwnedInstancesDocument,
  Role,
  EnvironmentType,
  WorkspaceQuotasDocument,
} from '../../generated-types';
import { MockedProvider } from '@apollo/client/testing';
import type { ReactNode } from 'react';

const DEV_MODE = process.env.NODE_ENV === 'development';

console.log('🚀 Development mode with CORRECTLY MOCKED data loaded');

// Enhanced mock data with proper relationships
const MOCK_TENANT_NAMESPACE = 'workspace-personal-johndoe';
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
      quota: {
        __typename: 'Quota',
        cpu: '8',
        memory: '16Gi',
        instances: 10,
      },
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
      quota: {
        __typename: 'Quota',
        cpu: '4',
        memory: '8Gi',
        instances: 5,
      },
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
      running: true,
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
    // Add required fields for Instance display
    id: 'ubuntu-dev-instance-1',
    name: 'My Ubuntu Dev Environment',
    templateId: 'ubuntu-dev-template',
    persistent: false,
    guiEnabled: true,
    running: true,
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
      running: true,
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
    // Add required fields for Instance display
    id: 'jupyter-instance-1',
    name: 'My Jupyter Notebook',
    templateId: 'python-jupyter-template',
    persistent: true,
    guiEnabled: true,
    running: true,
  },
  {
    __typename: 'Instance',
    metadata: {
      __typename: 'ObjectMeta',
      name: 'personal-vscode-instance-1',
      namespace: MOCK_TENANT_NAMESPACE,
      creationTimestamp: '2024-01-02T10:00:00Z',
      labels: {
        'crownlabs.polito.it/template': 'personal-vscode-template',
        'crownlabs.polito.it/workspace': 'personal',
      },
    },
    spec: {
      __typename: 'InstanceSpec',
      prettyName: 'My Personal VS Code',
      running: true,
      templateRef: {
        __typename: 'GenericRef',
        name: 'personal-vscode-template',
        namespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE,
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
      url: 'https://personal-vscode-instance-1.crownlabs.polito.it',
      ip: '10.1.1.102',
    },
    // Add required fields for Instance display
    id: 'personal-vscode-instance-1',
    name: 'My Personal VS Code',
    templateId: 'personal-vscode-template',
    persistent: true,
    guiEnabled: true,
    running: true,
  },
];

// Update the personal templates to include instances directly in the mock data
const mockPersonalTemplates = [
  {
    __typename: 'Template',
    metadata: {
      __typename: 'ObjectMeta',
      name: 'personal-vscode-template',
      namespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE,
      creationTimestamp: '2024-01-02T00:00:00Z',
      labels: {
        'crownlabs.polito.it/workspace': 'personal',
      },
    },
    spec: {
      __typename: 'TemplateSpec',
      prettyName: 'Personal VS Code Environment',
      description: 'My personal development environment with VS Code',
      environmentList: [
        {
          __typename: 'Environment',
          environmentType: 'Container',
          guiEnabled: true,
          persistent: true,
          nodeSelector: {},
          resources: {
            __typename: 'EnvironmentResources',
            cpu: 2,
            memory: '4Gi',
            disk: '15Gi',
            reservedCPUPercentage: 50,
          },
          image: 'codercom/code-server:latest',
          mountMyDriveVolume: true,
        },
      ],
      workspaceRef: {
        __typename: 'GenericRef',
        name: 'personal',
        namespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE,
      },
      workspaceCrownlabsPolitoItWorkspaceRef: {
        __typename: 'GenericRef',
        name: 'personal',
        namespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE,
      },
    },
  },
  {
    __typename: 'Template',
    metadata: {
      __typename: 'ObjectMeta',
      name: 'personal-python-template',
      namespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE,
      creationTimestamp: '2024-01-02T01:00:00Z',
      labels: {
        'crownlabs.polito.it/workspace': 'personal',
      },
    },
    spec: {
      __typename: 'TemplateSpec',
      prettyName: 'Personal Python Workspace',
      description: 'My personal Python development environment',
      environmentList: [
        {
          __typename: 'Environment',
          environmentType: 'Container',
          guiEnabled: false,
          persistent: true,
          nodeSelector: {},
          resources: {
            __typename: 'EnvironmentResources',
            cpu: 1,
            memory: '2Gi',
            disk: '10Gi',
            reservedCPUPercentage: 50,
          },
          image: 'python:3.11',
          mountMyDriveVolume: true,
        },
      ],
      workspaceRef: {
        __typename: 'GenericRef',
        name: 'personal',
        namespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE,
      },
      workspaceCrownlabsPolitoItWorkspaceRef: {
        __typename: 'GenericRef',
        name: 'personal',
        namespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE,
      },
    },
  },
];

// Update the mockTemplates to include instances directly
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
      environmentList: [
        {
          __typename: 'Environment',
          environmentType: 'Container',
          guiEnabled: true,
          persistent: false,
          nodeSelector: {},
          resources: {
            __typename: 'EnvironmentResources',
            cpu: 2,
            memory: '4Gi',
            disk: '10Gi',
            reservedCPUPercentage: 50,
          },
          image: 'ubuntu:22.04',
          mountMyDriveVolume: true,
        },
      ],
      workspaceRef: {
        __typename: 'GenericRef',
        name: 'development',
        namespace: MOCK_WORKSPACE_NAMESPACE,
      },
      workspaceCrownlabsPolitoItWorkspaceRef: {
        __typename: 'GenericRef',
        name: 'development',
        namespace: MOCK_WORKSPACE_NAMESPACE,
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
      environmentList: [
        {
          __typename: 'Environment',
          environmentType: 'Container',
          guiEnabled: true,
          persistent: true,
          nodeSelector: {},
          resources: {
            __typename: 'EnvironmentResources',
            cpu: 4,
            memory: '8Gi',
            disk: '20Gi',
            reservedCPUPercentage: 50,
          },
          image: 'jupyter/datascience-notebook:latest',
          mountMyDriveVolume: true,
        },
      ],
      workspaceRef: {
        __typename: 'GenericRef',
        name: 'development',
        namespace: MOCK_WORKSPACE_NAMESPACE,
      },
      workspaceCrownlabsPolitoItWorkspaceRef: {
        __typename: 'GenericRef',
        name: 'development',
        namespace: MOCK_WORKSPACE_NAMESPACE,
      },
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

  // Personal workspace templates query (now with templates)
  {
    request: {
      query: WorkspaceTemplatesDocument,
      variables: { workspaceNamespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE },
    },
    result: {
      data: {
        templateList: {
          __typename: 'TemplateList',
          templates: mockPersonalTemplates,
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
          __typename: 'ItPolitoCrownlabsV1alpha2InstanceList', // Changed from 'ItPolitoCrownlabsV1alpha2InstanceList' to 'InstanceList'
          instances: [
            // Personal VS Code instance
            {
              __typename: 'ItPolitoCrownlabsV1alpha2Instance',
              metadata: {
                __typename: 'IoK8sApimachineryPkgApisMetaV1ObjectMeta', // Changed from 'IoK8sApimachineryPkgApisMetaV1ObjectMeta' to 'ObjectMeta'
                name: 'personal-vscode-instance-1',
                namespace: MOCK_TENANT_NAMESPACE,
                creationTimestamp: '2024-01-02T10:00:00Z',
                labels: {
                  'crownlabsPolitoItTemplate': 'personal-vscode-template',
                  'crownlabsPolitoItWorkspace': 'personal',
                },
              },
              spec: {
                __typename: 'InstanceSpec', // Changed from 'Spec3' to 'InstanceSpec'
                running: true,
                prettyName: 'My Personal VS Code',
                templateCrownlabsPolitoItTemplateRef: {
                  __typename: 'TemplateCrownlabsPolitoItTemplateRef',
                  name: 'personal-vscode-template',
                  namespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE,
                  templateWrapper: {
                    __typename: 'TemplateWrapper',
                    itPolitoCrownlabsV1alpha2Template: {
                      __typename: 'ItPolitoCrownlabsV1alpha2Template',
                      spec: {
                        __typename: 'Spec6',
                        prettyName: 'Personal VS Code Environment',
                        description: 'My personal development environment with VS Code',
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
              status: {
                __typename: 'InstanceStatus', // Changed from 'Status3' to 'InstanceStatus'
                phase: 'Ready',
                url: 'https://personal-vscode-instance-1.crownlabs.polito.it',
                ip: '10.1.1.102',
                nodeName: 'worker-node-1',
                nodeSelector: {},
              },
            },
            // Personal Python instance
            {
              __typename: 'ItPolitoCrownlabsV1alpha2Instance',
              metadata: {
                __typename: 'IoK8sApimachineryPkgApisMetaV1ObjectMeta',
                name: 'personal-python-instance-1',
                namespace: MOCK_TENANT_NAMESPACE,
                creationTimestamp: '2024-01-02T14:00:00Z',
                labels: {
                  'crownlabsPolitoItTemplate': 'personal-python-template',
                  'crownlabsPolitoItWorkspace': 'personal',
                },
              },
              spec: {
                __typename: 'InstanceSpec',
                running: false,
                prettyName: 'My Python Terminal',
                templateCrownlabsPolitoItTemplateRef: {
                  __typename: 'TemplateCrownlabsPolitoItTemplateRef',
                  name: 'personal-python-template',
                  namespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE,
                  templateWrapper: {
                    __typename: 'TemplateWrapper',
                    itPolitoCrownlabsV1alpha2Template: {
                      __typename: 'ItPolitoCrownlabsV1alpha2Template',
                      spec: {
                        __typename: 'Spec6',
                        prettyName: 'Personal Python Workspace',
                        description: 'My personal Python development environment',
                        environmentList: [
                          {
                            __typename: 'EnvironmentListListItem',
                            guiEnabled: false,
                            persistent: true,
                            environmentType: 'Container',
                          },
                        ],
                      },
                    },
                  },
                },
              },
              status: {
                __typename: 'InstanceStatus',
                phase: 'Stopped',
                url: null,
                ip: null,
                nodeName: null,
                nodeSelector: {},
              },
            },
            // Development workspace Ubuntu instance
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
                running: true,
                prettyName: 'My Ubuntu Dev Environment',
                templateCrownlabsPolitoItTemplateRef: {
                  __typename: 'TemplateCrownlabsPolitoItTemplateRef',
                  name: 'ubuntu-dev-template',
                  namespace: MOCK_WORKSPACE_NAMESPACE,
                  templateWrapper: {
                    __typename: 'TemplateWrapper',
                    itPolitoCrownlabsV1alpha2Template: {
                      __typename: 'ItPolitoCrownlabsV1alpha2Template',
                      spec: {
                        __typename: 'Spec6',
                        prettyName: 'Ubuntu Development Environment',
                        description: 'Ubuntu 22.04 with development tools',
                        environmentList: [
                          {
                            __typename: 'EnvironmentListListItem',
                            guiEnabled: true,
                            persistent: false,
                            environmentType: 'Container',
                          },
                        ],
                      },
                    },
                  },
                },
              },
              status: {
                __typename: 'InstanceStatus',
                phase: 'Ready',
                url: 'https://ubuntu-dev-instance-1.crownlabs.polito.it',
                ip: '10.1.1.100',
                nodeName: 'worker-node-1',
                nodeSelector: {},
              },
            },
          ],
        },
      },
    },
  },

  // Add additional mock for when workspace namespace is incorrectly used as tenant namespace
  {
    request: {
      query: OwnedInstancesDocument,
      variables: { tenantNamespace: MOCK_WORKSPACE_NAMESPACE },
    },
    result: {
      data: {
        instanceList: {
          __typename: 'InstanceList',
          instances: [], // Empty since instances are stored in tenant namespace, not workspace
        },
      },
    },
  },

  // Add mock for personal workspace namespace being used as tenant namespace
  {
    request: {
      query: OwnedInstancesDocument,
      variables: { tenantNamespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE },
    },
    result: {
      data: {
        instanceList: {
          __typename: 'InstanceList',
          instances: [], // Empty since instances are stored in tenant namespace, not workspace
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
        sharedvolumeList: {
          __typename: 'SharedVolumeList',
          sharedvolumes: [],
        },
      },
    },
  },

  // Shared volumes query for personal workspace
  {
    request: {
      query: WorkspaceSharedVolumesDocument,
      variables: { workspaceNamespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE },
    },
    result: {
      data: {
        sharedvolumeList: {
          __typename: 'SharedVolumeList',
          sharedvolumes: [],
        },
      },
    },
  },

  // Updated workspace templates subscription - for development workspace
  {
    request: {
      query: UpdatedWorkspaceTemplatesDocument,
      variables: { workspaceNamespace: MOCK_WORKSPACE_NAMESPACE },
    },
    result: {
      data: {
        updatedTemplate: null, // This one might be correct, but let's double-check
      },
    },
  },

  // Updated workspace templates subscription - for development workspace with templateId
  {
    request: {
      query: UpdatedWorkspaceTemplatesDocument,
      variables: {
        workspaceNamespace: MOCK_WORKSPACE_NAMESPACE,
        templateId: undefined,
      },
    },
    result: {
      data: {
        updatedTemplate: null,
      },
    },
  },

  // Updated workspace templates subscription - for personal workspace
  {
    request: {
      query: UpdatedWorkspaceTemplatesDocument,
      variables: { workspaceNamespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE },
    },
    result: {
      data: {
        updatedTemplate: null,
      },
    },
  },
  {
    request: {
      query: UpdatedWorkspaceTemplatesDocument,
      variables: { workspaceNamespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE, templateId: undefined },
    },
    result: {
      data: {
        updatedTemplate: null,
      },
    },
  },
  {
    request: {
      query: UpdatedWorkspaceTemplatesDocument,
      variables: { workspaceNamespace: MOCK_WORKSPACE_NAMESPACE },
    },
    result: {
      data: {
        updatedTemplate: null,
      },
    },
  },
  {
    request: {
      query: UpdatedWorkspaceTemplatesDocument,
      variables: { workspaceNamespace: MOCK_WORKSPACE_NAMESPACE, templateId: undefined },
    },
    result: {
      data: {
        updatedTemplate: null,
      },
    },
  },

  // Updated owned instances subscription
  {
    request: {
      query: UpdatedOwnedInstancesDocument,
      variables: { tenantNamespace: MOCK_TENANT_NAMESPACE },
    },
    result: {
      data: {
        updateInstance: null, // Changed from 'updatedInstance' to 'updateInstance'
      },
    },
  },

  // Add mock for when personal workspace namespace is incorrectly used for instances subscription
  {
    request: {
      query: UpdatedOwnedInstancesDocument,
      variables: { tenantNamespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE },
    },
    result: {
      data: {
        updateInstance: null, // Changed from 'updatedInstance' to 'updateInstance'
      },
    },
  },

  // Add mock for when development workspace namespace is incorrectly used for instances subscription
  {
    request: {
      query: UpdatedOwnedInstancesDocument,
      variables: { tenantNamespace: MOCK_WORKSPACE_NAMESPACE },
    },
    result: {
      data: {
        updateInstance: null, // Changed from 'updatedInstance' to 'updateInstance'
      },
    },
  },

  // Add mocks for instances subscription with instanceId parameter
  {
    request: {
      query: UpdatedOwnedInstancesDocument,
      variables: { 
        tenantNamespace: MOCK_TENANT_NAMESPACE,
        instanceId: undefined 
      },
    },
    result: {
      data: {
        updateInstance: null, // Changed from 'updatedInstance' to 'updateInstance'
      },
    },
  },

  {
    request: {
      query: UpdatedOwnedInstancesDocument,
      variables: { 
        tenantNamespace: MOCK_PERSONAL_WORKSPACE_NAMESPACE,
        instanceId: undefined 
      },
    },
    result: {
      data: {
        updateInstance: null, // Changed from 'updatedInstance' to 'updateInstance'
      },
    },
  },

  {
    request: {
      query: UpdatedOwnedInstancesDocument,
      variables: { 
        tenantNamespace: MOCK_WORKSPACE_NAMESPACE,
        instanceId: undefined 
      },
    },
    result: {
      data: {
        updateInstance: null, // Changed from 'updatedInstance' to 'updateInstance'
      },
    },
  },

  // Workspaces mock for auto-enroll
  {
    request: {
      query: WorkspacesDocument,
      variables: {
        labels: 'crownlabs.polito.it/autoenroll=withApproval',
      },
    },
    result: {
      data: {
        workspaces: {
          __typename: 'ItPolitoCrownlabsV1alpha1WorkspaceList',
          items: [
            {
              __typename: 'ItPolitoCrownlabsV1alpha1Workspace',
              metadata: {
                __typename: 'Metadata2',
                name: 'candidate-workspace-1',
              },
              spec: {
                __typename: 'Spec2',
                prettyName: 'Machine Learning Course',
                autoEnroll: true,
              },
            },
            {
              __typename: 'ItPolitoCrownlabsV1alpha1Workspace',
              metadata: {
                __typename: 'Metadata2',
                name: 'candidate-workspace-2',
              },
              spec: {
                __typename: 'Spec2',
                prettyName: 'Computer Networks Lab',
                autoEnroll: true,
              },
            },
          ],
        },
      },
    },
  },

  // Additional mock for any workspace namespace variations
  {
    request: {
      query: WorkspaceTemplatesDocument,
      variables: { workspaceNamespace: 'development' }, // If passing workspace name instead of namespace
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
  {
    request: {
      query: WorkspaceTemplatesDocument,
      variables: { workspaceNamespace: 'personal' }, // If passing workspace name instead of namespace
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
  {
    request: {
      query: WorkspaceTemplatesDocument,
      variables: { workspaceNamespace: 'tenant-johndoe' }, // If passing tenant namespace
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
  {
    request: {
      query: WorkspaceQuotasDocument
      // variables: {} // Add variables if your query uses them
    },
    result: {
      data: {
        workspaces: {
          __typename: 'ItPolitoCrownlabsV1alpha1WorkspaceList',
          items: [
            {
              __typename: 'ItPolitoCrownlabsV1alpha1Workspace',
              metadata: { __typename: 'Metadata2', name: 'development' },
              spec: {
                __typename: 'Spec2',
                prettyName: 'Development Environment',
                quota: {
                  __typename: 'Quota',
                  cpu: '8',
                  memory: '16Gi',
                  instances: 10,
                },
              },
            },
            {
              __typename: 'ItPolitoCrownlabsV1alpha1Workspace',
              metadata: { __typename: 'Metadata2', name: 'personal' },
              spec: {
                __typename: 'Spec2',
                prettyName: 'Personal Workspace',
                quota: {
                  __typename: 'Quota',
                  cpu: '4',
                  memory: '8Gi',
                  instances: 5,
                },
              },
            },
          ],
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
