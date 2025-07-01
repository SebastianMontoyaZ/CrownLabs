/* eslint-disable @typescript-eslint/no-unused-vars */
import { FetchPolicy } from '@apollo/client';
import { Spin } from 'antd';

import { useContext, useEffect, useState } from 'react';
import { FC } from 'react';
import { AuthContext } from '../../../../contexts/AuthContext';
import {
  useCreateInstanceMutation,
  useDeleteTemplateMutation,
  useOwnedInstancesQuery,
  useWorkspaceTemplatesQuery,
} from '../../../../generated-types';
import { ErrorContext } from '../../../../errorHandling/ErrorContext';
import {
  updatedOwnedInstances,
  updatedWorkspaceTemplates,
} from '../../../../graphql-components/subscription';
import { Instance, Template, WorkspaceRole } from '../../../../utils';
import { ErrorTypes } from '../../../../errorHandling/utils';
import {
  makeGuiInstance,
  makeGuiTemplate,
  joinInstancesAndTemplates,
  updateQueryOwnedInstancesQuery,
  updateQueryWorkspaceTemplatesQuery,
} from '../../../../utilsLogic';
import { TemplatesEmpty } from '../TemplatesEmpty';
import { TemplatesTable } from '../TemplatesTable';
import { SharedVolumesDrawer } from '../../SharedVolumes';

export interface ITemplateTableLogicProps {
  tenantNamespace: string;
  workspaceNamespace: string;
  workspaceName: string;
  role: WorkspaceRole;
}

const fetchPolicy_networkOnly: FetchPolicy = 'network-only';

const TemplatesTableLogic: FC<ITemplateTableLogicProps> = ({ ...props }) => {
  const { userId } = useContext(AuthContext);
  const { makeErrorCatcher, apolloErrorCatcher, errorsQueue } =
    useContext(ErrorContext);
  const { tenantNamespace, workspaceNamespace, workspaceName, role } = props;

  const [dataInstances, setDataInstances] = useState<Instance[]>([]);

  // Add debugging
  useEffect(() => {
    console.log('TemplatesTableLogic props:', {
      tenantNamespace,
      workspaceNamespace,
      workspaceName,
      role,
    });
  }, [tenantNamespace, workspaceNamespace, workspaceName, role]);

  // Fetch templates for this workspace
  const {
    data: dataTemplate,
    loading: loadingTemplate,
    error: errorTemplate,
    refetch: refetchTemplate,
  } = useWorkspaceTemplatesQuery({
    variables: { workspaceNamespace },
    onError: apolloErrorCatcher,
    fetchPolicy: fetchPolicy_networkOnly,
  });

  // Add debugging for templates
  useEffect(() => {
    console.log('Templates query result:', {
      loading: loadingTemplate,
      error: errorTemplate,
      data: dataTemplate,
      templates: dataTemplate?.templateList?.templates,
    });
  }, [dataTemplate, loadingTemplate, errorTemplate]);

  // Fetch instances
  const {
    data: dataInstancesQuery,
    loading: loadingInstances,
    error: errorInstances,
  } = useOwnedInstancesQuery({
    variables: { tenantNamespace },
    onError: apolloErrorCatcher,
    fetchPolicy: fetchPolicy_networkOnly,
  });

  // Add debugging for instances
  useEffect(() => {
    console.log('Instances query result:', {
      loading: loadingInstances,
      error: errorInstances,
      data: dataInstancesQuery,
      instances: dataInstancesQuery?.instanceList?.instances,
    });
  }, [dataInstancesQuery, loadingInstances, errorInstances]);

  // Process instances data
  useEffect(() => {
    if (dataInstancesQuery?.instanceList?.instances) {
      const processedInstances = dataInstancesQuery.instanceList.instances.map(
        instance => {
          // Add debugging for individual instances
          console.log('Processing instance:', instance);

          // Transform the GraphQL instance data to match the Instance interface
          return {
            name: instance.metadata?.name || '',
            prettyName:
              instance.spec?.prettyName || instance.metadata?.name || '',
            // Add more fields as needed based on the Instance interface
          };
        }
      );

      console.log('Processed instances:', processedInstances);
      setDataInstances(processedInstances);
    }
  }, [dataInstancesQuery]);

  const [createInstanceMutation] = useCreateInstanceMutation({
    onError: apolloErrorCatcher,
  });
  const [deleteTemplateMutation, { loading: loadingDeleteTemplateMutation }] =
    useDeleteTemplateMutation({
      onError: apolloErrorCatcher,
    });

  const createInstance = (templateId: string, nodeSelector?: JSON) =>
    createInstanceMutation({
      variables: {
        templateId,
        tenantNamespace,
        tenantId: userId ?? '',
        workspaceNamespace,
        nodeSelector,
      },
    }).then(i => {
      setDataInstances(old =>
        !old.find(x => x.name === i.data?.createdInstance?.metadata?.name)
          ? [
              ...old,
              makeGuiInstance(i.data?.createdInstance, userId, {
                templateName: templateId,
                workspaceName: workspaceName,
              }),
            ]
          : old
      );
      return i;
    });

  const templates = joinInstancesAndTemplates(dataTemplate, dataInstances);

  console.log('Final joined templates:', templates);

  // Helper function to check if this is a personal workspace
  const isPersonalWorkspace = (
    workspaceName: string,
    tenantNamespace: string
  ): boolean => {
    return (
      workspaceName.includes('personal') ||
      workspaceNamespace === tenantNamespace ||
      workspaceNamespace.includes(tenantNamespace)
    );
  };

  const isPersonal = isPersonalWorkspace(workspaceName, tenantNamespace);

  return (
    <Spin size="large" spinning={loadingTemplate || loadingInstances}>
      {!loadingTemplate &&
      !loadingInstances &&
      !errorTemplate &&
      !errorInstances &&
      templates &&
      dataInstances ? (
        <TemplatesTable
          totalInstances={dataInstances.length}
          tenantNamespace={tenantNamespace}
          workspaceNamespace={workspaceNamespace}
          workspaceName={workspaceName}
          templates={templates}
          role={role}
          deleteTemplate={(templateId: string) =>
            deleteTemplateMutation({
              variables: {
                workspaceNamespace,
                templateId,
              },
            })
          }
          deleteTemplateLoading={loadingDeleteTemplateMutation}
          editTemplate={() => null}
          createInstance={createInstance}
        />
      ) : (
        <div
          className={
            loadingTemplate ||
            loadingInstances ||
            errorTemplate ||
            errorInstances
              ? 'invisible'
              : 'visible'
          }
        >
          <TemplatesEmpty role={role} />
        </div>
      )}
      {role === WorkspaceRole.manager &&
      !loadingTemplate &&
      !loadingInstances ? (
        <SharedVolumesDrawer workspaceNamespace={workspaceNamespace} />
      ) : null}
    </Spin>
  );
};

export default TemplatesTableLogic;
