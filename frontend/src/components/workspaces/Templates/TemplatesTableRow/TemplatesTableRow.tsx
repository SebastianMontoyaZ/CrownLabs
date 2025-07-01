import React, { useState, useContext, useMemo } from 'react';
import {
  Button,
  Space,
  Tag,
  Tooltip,
  Modal,
  message,
  Menu,
  Dropdown,
} from 'antd';
import {
  PlayCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  DesktopOutlined,
  CodeOutlined,
  FileTextOutlined,
  MoreOutlined,
} from '@ant-design/icons';
<<<<<<< HEAD
import { FetchResult } from '@apollo/client';
import { TenantContext } from '../../../../contexts/TenantContext';
import { validateResourceAgainstQuota } from '../../../../utils/quotaValidation';
=======
import { Space, Tooltip, Dropdown, Badge } from 'antd';
import { Button } from 'antd';
import type { FetchResult } from '@apollo/client';
import type { FC } from 'react';
import { useCallback, useContext, useState } from 'react';
import SvgInfinite from '../../../../assets/infinite.svg?react';
>>>>>>> master
import { ErrorContext } from '../../../../errorHandling/ErrorContext';
import type {
  CreateInstanceMutation,
  DeleteTemplateMutation,
} from '../../../../generated-types';
import {
  useInstancesLabelSelectorQuery,
  useNodesLabelsQuery,
} from '../../../../generated-types';
<<<<<<< HEAD
import { cleanupLabels, Template, WorkspaceRole } from '../../../../utils';
import Badge from '../../../common/Badge';
=======
import { TenantContext } from '../../../../contexts/TenantContext';
import type { Template } from '../../../../utils';
import { cleanupLabels, WorkspaceRole } from '../../../../utils';
>>>>>>> master
import { ModalAlert } from '../../../common/ModalAlert';
import { TemplatesTableRowSettings } from '../TemplatesTableRowSettings';
import NodeSelectorIcon from '../../../common/NodeSelectorIcon/NodeSelectorIcon';

export interface ITemplatesTableRowProps {
  template: Template;
  role: WorkspaceRole;
  totalInstances: number;
  editTemplate: (id: string) => void;
  deleteTemplate: (
    id: string,
  ) => Promise<
    FetchResult<
      DeleteTemplateMutation,
      Record<string, unknown>,
      Record<string, unknown>
    >
  >;
  deleteTemplateLoading: boolean;
  createInstance: (
    id: string,
    labelSelector?: JSON,
  ) => Promise<
    FetchResult<
      CreateInstanceMutation,
      Record<string, unknown>,
      Record<string, unknown>
    >
  >;
  expandRow: (value: string, create: boolean) => void;
  workspaceNamespace: string;
  workspaceName: string;
}

const convertInG = (s: string) =>
  s.includes('M') && Number(s.split('M')[0]) >= 1000
    ? `${Number(s.split('M')[0]) / 1000}G`
    : s;

const TemplatesTableRow: React.FC<ITemplatesTableRowProps> = ({
  template,
  role,
  totalInstances,
  createInstance,
  editTemplate,
  deleteTemplate,
  deleteTemplateLoading,
  expandRow,
  workspaceNamespace,
  workspaceName,
}) => {
  const {
    data: labelsData,
    loading: loadingLabels,
    error: labelsError,
  } = useNodesLabelsQuery({ fetchPolicy: 'no-cache' });

  const { data, refreshClock } = useContext(TenantContext);
  const { apolloErrorCatcher } = useContext(ErrorContext);
  const { refetch: refetchInstancesLabelSelector } =
    useInstancesLabelSelectorQuery({
      onError: apolloErrorCatcher,
      variables: {
        labels: `crownlabs.polito.it/template=${template.id},crownlabs.polito.it/workspace=${template.workspaceName}`,
      },
      skip: true,
      fetchPolicy: 'network-only',
    });

  const [showDeleteModalNotPossible, setShowDeleteModalNotPossible] =
    useState(false);
  const [showDeleteModalConfirm, setShowDeleteModalConfirm] = useState(false);
  const [createDisabled, setCreateDisabled] = useState(false);

<<<<<<< HEAD
  const [showLogs, setShowLogs] = useState(false);
  const [logsContent, setLogsContent] = useState('');

  const fetchLogs = async () => {
    const logs = 'Logs functionality not yet implemented';
    setLogsContent(logs);
    setShowLogs(true);
  };

  const createInstanceHandler = () => {
=======
  const createInstanceHandler = useCallback(() => {
>>>>>>> master
    setCreateDisabled(true);
    createInstance(template.id)
      .then(() => {
        refreshClock();
        setTimeout(setCreateDisabled, 400, false);
        expandRow(template.id, true);
      })
      .catch(() => setCreateDisabled(false));
  }, [createInstance, expandRow, refreshClock, template.id]);

  const instancesLimit = data?.tenant?.status?.quota?.instances ?? 1;

<<<<<<< HEAD
  const nodesLabels = useMemo(() => {
    const handleNodeLabelClick = (info: { key: string }) => {
      createInstance(template.id, JSON.parse(info.key))
        .then(() => {
          refreshClock();
          setTimeout(setCreateDisabled, 400, false);
          expandRow(template.id, true);
        })
        .catch(() => setCreateDisabled(false));
    };

    return (
      <Menu onClick={handleNodeLabelClick}>
        {loadingLabels ? (
          <Menu.Item disabled>Loading...</Menu.Item>
        ) : labelsError ? (
          <Menu.Item disabled>Error loading labels</Menu.Item>
        ) : (
          labelsData?.labels?.map(({ key, value }) => {
            const label = JSON.stringify({ [key]: value });
            return (
              <Menu.Item key={label}>
                {`${cleanupLabels(key)}=${value}`}
              </Menu.Item>
            );
          })
        )}
      </Menu>
    );
  }, [
    loadingLabels,
    labelsError,
    labelsData,
    createInstance,
    expandRow,
    refreshClock,
    template.id,
  ]);

  const { data: tenantData } = useContext(TenantContext);

  // Validate template against current quota
  const quota = tenantData?.tenant?.status?.quota;

  // Mock current usage since usage doesn't exist in tenant status
  const mockUsage = {
    cpu: '2',
    memory: '4Gi',
    instances: totalInstances,
  };

  const validation = quota
    ? validateResourceAgainstQuota(
        {
          cpu: template.resources?.cpu || 1,
          memory: template.resources?.memory || '1Gi',
        },
        {
          cpu: quota.cpu || '0',
          memory: quota.memory || '0Gi',
          instances: quota.instances || 0,
        },
        mockUsage
      )
    : { valid: true, errors: [] };

  // Check if creating a new instance would exceed the quota
  const wouldExceedInstanceQuota =
    quota && totalInstances + 1 > quota.instances;
  const canDeploy =
    validation.valid &&
    !wouldExceedInstanceQuota &&
    role !== WorkspaceRole.user;

  const handleLaunch = () => {
    const errors = [...validation.errors];

    if (wouldExceedInstanceQuota) {
      errors.push(
        `Creating a new instance would exceed the instance limit (${quota?.instances})`
      );
    }

    if (errors.length > 0) {
      Modal.confirm({
        title: 'Resource Quota Exceeded',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>Launching this template would exceed your resource quota:</p>
            <ul>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
            <p>Do you want to proceed anyway?</p>
          </div>
        ),
        onOk() {
          createInstance(template.id);
        },
      });
    } else {
      createInstance(template.id);
    }
  };

  const handleDelete = () => {
    setShowDeleteModalConfirm(true);
  };

  const confirmDelete = () => {
    deleteTemplate(template.id);
    setShowDeleteModalConfirm(false);
    message.success('Template deleted successfully');
  };

  const getEnvironmentTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'container':
        return 'blue';
      case 'virtualmachine':
        return 'green';
      default:
        return 'default';
    }
  };

  const getEnvironmentIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'container':
        return <CodeOutlined />;
      case 'virtualmachine':
        return <DesktopOutlined />;
      default:
        return <FileTextOutlined />;
    }
  };

  // ✅ Fixed: Use template properties directly instead of template.spec
  const resources = template.resources; // Use template.resources directly
  const isPersistent = template.persistent; // Use template.persistent directly
  const isManager = role === WorkspaceRole.manager;

  // Create dropdown menu for additional actions
  const menuItems = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => editTemplate(template.id),
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: handleDelete,
    },
  ];

  const menu = <Menu items={menuItems} />;

=======
>>>>>>> master
  return (
    <>
      <ModalAlert
        headTitle={template.name}
        message="Cannot delete this template"
        description="A template with active instances cannot be deleted. Please delete all the instances associated with this template."
        type="warning"
        buttons={[
          <Button
            key={0}
            shape="round"
            className="w-24"
            type="primary"
            onClick={() => setShowDeleteModalNotPossible(false)}
          >
            Close
          </Button>,
        ]}
        show={showDeleteModalNotPossible}
        setShow={setShowDeleteModalNotPossible}
      />

      <ModalAlert
        headTitle={template.name}
        message="Delete template"
        description="Do you really want to delete this template?"
        type="warning"
        buttons={[
          <Button
            key={0}
            shape="round"
            className="mr-2 w-24"
            type="primary"
            onClick={() => setShowDeleteModalConfirm(false)}
          >
            Close
          </Button>,
          <Button
            key={1}
            shape="round"
            className="ml-2 w-24"
<<<<<<< HEAD
            type="primary"
            danger // ✅ Fixed: Use danger prop instead of type="danger"
=======
            color="danger"
>>>>>>> master
            loading={deleteTemplateLoading}
            onClick={() =>
              deleteTemplate(template.id)
                .then(() => setShowDeleteModalConfirm(false))
                .catch(console.warn)
            }
          >
            {!deleteTemplateLoading && 'Delete'}
          </Button>,
        ]}
        show={showDeleteModalConfirm}
        setShow={setShowDeleteModalConfirm}
      />

      <div className="w-full flex justify-between py-0">
        <div
          className="flex w-full items-center cursor-pointer"
          onClick={() => expandRow(template.id, false)}
        >
          <Space size="middle">
            <div className="flex items-center">
              {template.gui ? (
                <DesktopOutlined
                  style={{ fontSize: '24px', color: '#1c7afd' }}
                />
              ) : (
                <CodeOutlined style={{ fontSize: '24px', color: '#1c7afd' }} />
              )}
              <label className="ml-3 cursor-pointer">{template.name}</label>
              {template.persistent && (
                <Tooltip
                  title={
                    <>
                      <div className="text-center">
                        These Instances can be stopped and restarted without
                        being deleted.
                      </div>
                      <div className="text-center">
                        Your files won't be deleted in case of an internal
                        disservice of CrownLabs.
                      </div>
                    </>
                  }
                >
                  <div className="success-color-fg ml-3 flex items-center">
                    <span style={{ fontSize: '22px', fontWeight: 'bold' }}>
                      ∞
                    </span>
                  </div>
                </Tooltip>
              )}
              {template.nodeSelector && (
                <div className="ml-3 flex items-center">
                  <NodeSelectorIcon
                    isOnWorkspace={true}
                    nodeSelector={template.nodeSelector}
                  />
                </div>
              )}
            </div>
          </Space>
        </div>

        <Space size="small">
          {template.instances.length ? (
            <Badge
              count={template.instances.length}
              color="blue"
              className="mx-2"
            />
          ) : (
            ''
          )}
          <Tooltip
            placement="left"
            title={
              <>
                <div>
                  CPU: {template.resources.cpu || 'unavailable'} core(s)
                </div>
                <div>
                  RAM: {convertInG(template.resources.memory) || 'unavailable'}B
                </div>
                <div>
                  {template.persistent
                    ? ` DISK: ${
                        convertInG(template.resources.disk) || 'unavailable'
                      }B`
                    : ``}
                </div>
              </>
            }
          >
<<<<<<< HEAD
            <Button type="link" size="middle" className="px-0">
              {' '}
              {/* ✅ Fixed: Use type="link" and remove invalid type="warning" */}
=======
            <Button type="link" color="orange" size="middle" className="px-0">
>>>>>>> master
              Info
            </Button>
          </Tooltip>

          {workspaceName.startsWith('personal-') &&
            role === WorkspaceRole.manager && (
              <>
                <Button onClick={() => editTemplate(template.id)}>Edit</Button>
                <Button danger onClick={() => deleteTemplate(template.id)}>
                  {' '}
                  {/* ✅ This one was already correct */}
                  Remove
                </Button>
              </>
            )}

          <Button
            icon={<FileTextOutlined />}
            onClick={fetchLogs}
            type="default"
            size="middle"
          >
            Logs
          </Button>

          <Modal
            title={`Logs for ${template.name}`}
            open={showLogs}
            onCancel={() => setShowLogs(false)}
            footer={null}
            width={800}
          >
            <pre style={{ maxHeight: 400, overflow: 'auto' }}>
              {logsContent}
            </pre>
          </Modal>

          {role === WorkspaceRole.manager ? (
            <TemplatesTableRowSettings
              id={template.id}
              createInstance={createInstance}
              editTemplate={editTemplate}
              deleteTemplate={() => {
                refetchInstancesLabelSelector()
                  .then(ils => {
                    if (!ils.data.instanceList?.instances!.length && !ils.error)
                      setShowDeleteModalConfirm(true);
                    else setShowDeleteModalNotPossible(true);
                  })
                  .catch(console.warn);
              }}
            />
          ) : (
            <Tooltip placement="top" title="Create Instance">
              <Button
                onClick={createInstanceHandler}
                className="xs:hidden block"
<<<<<<< HEAD
                type="link" // ✅ Fixed: Use type="link" instead of with="link"
=======
                type="link"
                color="primary"
>>>>>>> master
                size="large"
                icon={<PlayCircleOutlined style={{ fontSize: '22px' }} />}
              />
            </Tooltip>
          )}

          {instancesLimit === totalInstances ? (
            <Tooltip
              overlayClassName="w-44"
              title={
                <>
                  <div className="text-center">
                    You have <b>reached your limit</b> of {instancesLimit}{' '}
                    instances
                  </div>
                  <div className="text-center mt-2">
                    Please <b>delete</b> an instance to create a new one
                  </div>
                </>
              }
            >
              <span className="cursor-not-allowed">
                <Button
                  onClick={createInstanceHandler}
                  className="hidden xs:block pointer-events-none"
                  disabled={!canDeploy || createDisabled}
                  type="primary"
                  shape="round"
                  size={'middle'}
                >
                  Create
                </Button>
              </span>
            </Tooltip>
          ) : template.nodeSelector &&
            JSON.stringify(template.nodeSelector) === '{}' ? (
            <Dropdown.Button
              menu={{
                items:
                  loadingLabels || labelsError
                    ? [
                        {
                          key: 'error',
                          label: loadingLabels
                            ? 'Loading labels...'
                            : 'Error loading labels',
                          disabled: true,
                        },
                      ]
                    : labelsData?.labels?.map(({ key, value }) => ({
                        key: JSON.stringify({ [key]: value }),
                        label: `${cleanupLabels(key)}=${value}`,
                        disabled: loadingLabels,
                        onClick: () => {
                          createInstance(template.id, JSON.parse(key))
                            .then(() => {
                              refreshClock();
                              setTimeout(setCreateDisabled, 400, false);
                              expandRow(template.id, true);
                            })
                            .catch(() => setCreateDisabled(false));
                        },
                      })) || [],
              }}
              onClick={createInstanceHandler}
              disabled={!canDeploy || createDisabled}
              type="primary"
              size={'middle'}
            >
              Create
            </Dropdown.Button>
          ) : (
            <Button
              onClick={createInstanceHandler}
              className="hidden xs:block"
              disabled={!canDeploy || createDisabled}
              type="primary"
              shape="round"
              size={'middle'}
            >
              Create
            </Button>
          )}
        </Space>
      </div>
    </>
  );
};

export default TemplatesTableRow;
