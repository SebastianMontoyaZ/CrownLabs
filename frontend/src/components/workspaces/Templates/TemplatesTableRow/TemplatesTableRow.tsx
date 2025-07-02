import React, { useState, useContext, useMemo } from 'react';
import {
  Button,
  Space,
  Tag,
  Tooltip,
  Modal,
  Badge,
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
import { FetchResult } from '@apollo/client';
import { TenantContext } from '../../../../contexts/TenantContext';
import { validateResourceAgainstQuota } from '../../../../utils/quotaValidation';
import type { FetchResult } from '@apollo/client';
import type { FC } from 'react';
import { ErrorContext } from '../../../../errorHandling/ErrorContext';
import type {
  CreateInstanceMutation,
  DeleteTemplateMutation,
} from '../../../../generated-types';
import type { Template } from '../../../../utils';
import { cleanupLabels, WorkspaceRole } from '../../../../utils';
import { ModalAlert } from '../../../common/ModalAlert';
import { TemplatesTableRowSettings } from '../TemplatesTableRowSettings';
import NodeSelectorIcon from '../../../common/NodeSelectorIcon/NodeSelectorIcon';

export interface ITemplatesTableRowProps {
  template: Template;
  role: WorkspaceRole;
  totalInstances: number;
  deleteTemplate: (
    templateId: string
  ) => Promise<FetchResult<DeleteTemplateMutation>>;
  deleteTemplateLoading: boolean;
  editTemplate: (template: Template) => void;
  createInstance: (
    templateId: string,
    nodeSelector?: object
  ) => Promise<FetchResult<CreateInstanceMutation>>;
}

const convertInG = (s: string) =>
  s.includes('M') && Number(s.split('M')[0]) >= 1000
    ? `${Number(s.split('M')[0]) / 1000}G`
    : s;

const TemplatesTableRow: FC<ITemplatesTableRowProps> = ({ ...props }) => {
  const {
    template,
    role,
    totalInstances,
    deleteTemplate,
    deleteTemplateLoading,
    editTemplate,
    createInstance,
  } = props;

  const { data } = useContext(TenantContext);
  const [showDeleteModalConfirm, setShowDeleteModalConfirm] = useState(false);
  const [createDisabled, setCreateDisabled] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logsContent, setLogsContent] = useState('');

  const fetchLogs = async () => {
    const logs = 'Logs functionality not yet implemented';
    setLogsContent(logs);
    setShowLogs(true);
  };

  const createInstanceHandler = useCallback(() => {
    setCreateDisabled(true);
    createInstance(template.id)
      .then(() => {
        setCreateDisabled(false);
      })
      .catch(() => {
        setCreateDisabled(false);
      });
  }, [createInstance, template.id]);

  const instancesLimit = data?.tenant?.status?.quota?.instances ?? 1;

  const menuItems = [
    {
      key: 'edit',
      label: (
        <Space>
          <EditOutlined />
          Edit
        </Space>
      ),
      onClick: () => editTemplate(template),
      disabled: role !== WorkspaceRole.manager,
    },
    {
      key: 'delete',
      label: (
        <Space>
          <DeleteOutlined />
          Delete
        </Space>
      ),
      onClick: () => setShowDeleteModalConfirm(true),
      disabled: role !== WorkspaceRole.manager || template.instances.length > 0,
      danger: true,
    },
  ];

  const menu = <Menu items={menuItems} />;

  return (
    <>
      <ModalAlert
        title={template.name}
        message="Cannot delete this template"
        description="You have running instances using this template. Stop all instances before deleting the template."
        type="error"
        show={template.instances.length > 0 && showDeleteModalConfirm}
        closable={true}
        onClose={() => setShowDeleteModalConfirm(false)}
      />

      <ModalAlert
        title={template.name}
        message="Delete template"
        description="Do you really want to delete this template?"
        type="warning"
        show={template.instances.length === 0 && showDeleteModalConfirm}
        closable={true}
        onClose={() => setShowDeleteModalConfirm(false)}
        onConfirm={() => {
          deleteTemplate(template.id).then(() => {
            setShowDeleteModalConfirm(false);
          });
        }}
        confirmLoading={deleteTemplateLoading}
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
            <Button type="link" color="orange" size="middle" className="px-0">
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
                type="link" // ✅ Fixed: Use type="link" instead of with="link"
                color="primary"
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
