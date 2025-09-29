import { PlusOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { Badge, Modal, Tooltip } from 'antd';
import { Button } from 'antd';
import type { FC } from 'react';
import { useContext, useState } from 'react';
import { ErrorContext } from '../../../errorHandling/ErrorContext';
import {
  useCreateTemplateMutation,
  type EnvironmentListListItemInput,
  type SharedVolumeMountsListItemInput,
} from '../../../generated-types';
import type { Workspace } from '../../../utils';
import { WorkspaceRole } from '../../../utils';
import UserListLogic from '../../accountPage/UserListLogic/UserListLogic';
import Box from '../../common/Box';
import ModalCreateTemplate from '../ModalCreateTemplate';
import type { Template } from '../ModalCreateTemplate/ModalCreateTemplate';
import { TemplatesTableLogic } from '../Templates/TemplatesTableLogic';
import { Col } from 'antd';

export interface IWorkspaceContainerProps {
  tenantNamespace: string;
  workspace: Workspace;
  availableQuota?: {
    cpu?: string | number;
    memory?: string;
    instances?: number;
  };
  refreshQuota?: () => void; // Add refresh function
  isPersonalWorkspace?: boolean;
}

const WorkspaceContainer: FC<IWorkspaceContainerProps> = ({ ...props }) => {
  const [showUserListModal, setShowUserListModal] = useState<boolean>(false);

  const { tenantNamespace, workspace, availableQuota, refreshQuota } = props;

  const { apolloErrorCatcher } = useContext(ErrorContext);
  const [createTemplateMutation, { loading }] = useCreateTemplateMutation({
    onError: apolloErrorCatcher,
  });

  const [show, setShow] = useState(false);

  const isPersonal = props.isPersonalWorkspace;

  const submitHandler = (t: Template) => {
    const workspaceNamespace = isPersonal
      ? tenantNamespace
      : workspace.namespace;
    const templateIdValue = `${workspace.name}-`;

    const environmentList: EnvironmentListListItemInput[] = [];
    for (const formEnv of t.environments) {
      const env: EnvironmentListListItemInput = {
        name: formEnv.name.trim(),
        environmentType: formEnv.environmentType,
        image: formEnv.image,
        mountMyDriveVolume: true,
        resources: {
          cpu: formEnv.cpu,
          reservedCPUPercentage: 50,
          memory: `${formEnv.ram * 1000}M`,
        },
        guiEnabled: formEnv.gui,
      };

      // Handle persistent environments
      if (formEnv.persistent) {
        env.persistent = formEnv.persistent;
        env.resources.disk = `${formEnv.disk * 1000}M`;
      }

      // Handle shared volume mounts
      if (!isPersonal) {
        const sharedVolumeMounts: SharedVolumeMountsListItemInput[] = [];

        for (const formShVol of formEnv.sharedVolumeMounts) {
          const splShVol = formShVol.sharedVolume.split('/');

          const shVol: SharedVolumeMountsListItemInput = {
            mountPath: formShVol.mountPath,
            readOnly: formShVol.readOnly,
            sharedVolume: {
              namespace: splShVol[0],
              name: splShVol[1],
            },
          };

          sharedVolumeMounts.push(shVol);
        }

        if (sharedVolumeMounts.length > 0) {
          env.sharedVolumeMounts = sharedVolumeMounts;
        }
      }

      environmentList.push(env);
    }

    return createTemplateMutation({
      variables: {
        workspaceId: workspace.name,
        workspaceNamespace: workspaceNamespace,
        templateId: templateIdValue,
        templateName: t.name?.trim() || '',
        descriptionTemplate: t.name?.trim() || '',
        environmentList: environmentList,
      },
    })
      .then(result => {
        // Refresh quota after template creation
        refreshQuota?.();
        return result;
      })
      .catch(error => {
        console.error(
          'WorkspaceContainer createTemplateMutation error:',
          error,
        );
        throw error;
      });
  };

  return (
    <Col span={24}>
      <ModalCreateTemplate
        workspaceNamespace={isPersonal ? tenantNamespace : workspace.namespace}
        cpuInterval={{ max: 8, min: 1 }}
        ramInterval={{ max: 32, min: 1 }}
        diskInterval={{ max: 50, min: 10 }}
        setShow={setShow}
        show={show}
        submitHandler={submitHandler}
        loading={loading}
        isPersonal={isPersonal}
      />

      {/* Wrapper div to constrain height */}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box
          header={{
            size: 'large',
            center: (
              <div className="h-full flex justify-center items-center px-5">
                <p className="md:text-4xl text-2xl text-center mb-0">
                  <b>{workspace.prettyName}</b>
                </p>
              </div>
            ),
            left: workspace.role === WorkspaceRole.manager && (
              <div className="h-full flex justify-center items-center pl-10">
                <Tooltip title="Manage users">
                  <Button
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={<UserSwitchOutlined />}
                    onClick={() => setShowUserListModal(true)}
                  >
                    {workspace.waitingTenants && (
                      <Badge
                        count={workspace.waitingTenants}
                        color="yellow"
                        className="absolute -top-2.5 -right-2.5"
                      />
                    )}
                  </Button>
                </Tooltip>
              </div>
            ),
            right: workspace.role === WorkspaceRole.manager && (
              <div className="h-full flex justify-center items-center pr-10">
                <Tooltip title="Create template">
                  <Button
                    onClick={() => {
                      setShow(true);
                    }}
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={<PlusOutlined />}
                  />
                </Tooltip>
              </div>
            ),
          }}
        >
          {/* Make the content scrollable */}
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <TemplatesTableLogic
              tenantNamespace={tenantNamespace}
              role={workspace.role}
              workspaceNamespace={
                isPersonal ? tenantNamespace : workspace.namespace
              }
              workspaceName={workspace.name}
              availableQuota={availableQuota}
              refreshQuota={refreshQuota}
              isPersonal={isPersonal}
            />
          </div>
        </Box>
      </div>

      <Modal
        destroyOnHidden={true}
        title={`Users in ${workspace.prettyName} `}
        width="800px"
        open={showUserListModal}
        footer={null}
        onCancel={() => setShowUserListModal(false)}
      >
        <UserListLogic workspace={workspace} />
      </Modal>
    </Col>
  );
};

export default WorkspaceContainer;
