import {
  PlusOutlined,
  UserSwitchOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Modal,
  Tooltip,
  Card,
  Row,
  Col,
  Progress,
  Button,
  Space,
} from 'antd';
import type { FC } from 'react';
import { useContext, useState } from 'react';
import { ErrorContext } from '../../../errorHandling/ErrorContext';
import { TenantContext } from '../../../contexts/TenantContext';
import type { ImagesQuery } from '../../../generated-types';
import {
  EnvironmentType,
  useCreateTemplateMutation,
  useImagesQuery,
  useWorkspaceTemplatesQuery,
} from '../../../generated-types';
import type { Workspace } from '../../../utils';
import { JSONDeepCopy, WorkspaceRole } from '../../../utils';
import UserListLogic from '../../accountPage/UserListLogic/UserListLogic';
import Box from '../../common/Box';
import ModalCreateTemplate, {
  Template,
  ContainerImageSpec,
  VMImageSpec,
} from '../ModalCreateTemplate/ModalCreateTemplate';
import QuotaDisplay from '../QuotaDisplay/QuotaDisplay';
import { TemplatesTableLogic } from '../Templates/TemplatesTableLogic';

export interface IWorkspaceContainerProps {
  tenantNamespace: string;
  workspace: Workspace;
}

// Rename Image to avoid conflict with browser's Image class
export interface ContainerImageSpec {
  name: string;
  vmorcontainer: any[];
  registry: string;
}

const getImages = (dataImages: ImagesQuery) => {
  let images: ContainerImageSpec[] = [];
  JSONDeepCopy(dataImages?.imageList?.images)?.forEach(i => {
    const registry = i?.spec?.registryName;
    const imagesRaw = i?.spec?.images;

    imagesRaw?.forEach(imageRaw => {
      if (imageRaw?.name && registry) {
        images.push({
          name: imageRaw.name,
          registry: registry,
          vmorcontainer: imageRaw.versions || [],
        });
      }
    });
  });
  return images;
};

// Helper function to determine if workspace is personal
const isPersonalWorkspace = (
  workspace: Workspace,
  tenantNamespace: string
): boolean => {
  // Check if workspace namespace matches tenant namespace (personal workspace pattern)
  return (
    workspace.namespace === tenantNamespace ||
    workspace.name.includes('personal') ||
    workspace.namespace.includes(tenantNamespace)
  );
};

const WorkspaceContainer: FC<IWorkspaceContainerProps> = ({ ...props }) => {
  const [showUserListModal, setShowUserListModal] = useState<boolean>(false);
  const [showCreateInstanceModal, setShowCreateInstanceModal] =
    useState<boolean>(false);
  const [show, setShow] = useState(false);

  const { tenantNamespace, workspace } = props;
  const isPersonal = isPersonalWorkspace(workspace, tenantNamespace);

  const { apolloErrorCatcher } = useContext(ErrorContext);
  const [createTemplateMutation, { loading }] = useCreateTemplateMutation({
    onError: apolloErrorCatcher,
  });

  const { data: dataImages, refetch: refetchImages } = useImagesQuery({
    variables: {},
    onError: apolloErrorCatcher,
  });

  const { data: templatesData } = useWorkspaceTemplatesQuery({
    variables: { workspaceNamespace: workspace.namespace },
    onError: apolloErrorCatcher,
  });

  // Get images data
  const { data: imagesData } = useImagesQuery({
    onError: apolloErrorCatcher,
  });

  // Process images
  const allImages = getImages(imagesData);

  // Separate container and VM images
  const containerImages: ContainerImageSpec[] = allImages
    .filter(
      img =>
        // Filter for container images (adjust logic based on your image naming convention)
        !img.name.includes('vm') && !img.name.includes('virtual')
    )
    .map(img => ({
      name: img.name,
      registry: img.registry,
      versions: img.vmorcontainer || [],
    }));

  const vmImages: VMImageSpec[] = allImages
    .filter(
      img =>
        // Filter for VM images (adjust logic based on your image naming convention)
        img.name.includes('vm') || img.name.includes('virtual')
    )
    .flatMap(img =>
      (img.vmorcontainer || []).map(version => ({
        name: img.name,
        registry: img.registry,
        tag: version,
        description: `VM Image: ${img.name}`,
      }))
    );

  const submitHandler = (templateData: Template) => {
    // For now, just log the template data until we implement the backend
    console.log('Template data to submit:', templateData);

    // TODO: Implement actual template creation
    // This could be:
    // 1. GraphQL mutation (once we add it to schema)
    // 2. REST API call
    // 3. Direct Kubernetes API call

    setShow(false);
  };

  const handleCreateInstance = () => {
    console.log('Create instance clicked for workspace:', workspace.name);
    setShowCreateInstanceModal(true);
    // TODO: Implement instance creation logic
  };

  // Transform the templates data for the modal
  const existingTemplates =
    templatesData?.templateList?.templates?.map(template => ({
      id: template.metadata?.name || '',
      name: template.spec?.prettyName || '',
      description: template.spec?.description || '',
      image: template.spec?.environmentList?.[0]?.image || '',
      gui: template.spec?.environmentList?.[0]?.guiEnabled || false,
      persistent: template.spec?.environmentList?.[0]?.persistent || false,
      mountMyDrive:
        template.spec?.environmentList?.[0]?.mountMyDriveVolume || false,
      cpu: template.spec?.environmentList?.[0]?.resources?.cpu || 1,
      memory: template.spec?.environmentList?.[0]?.resources?.memory || '1000M',
      disk: template.spec?.environmentList?.[0]?.resources?.disk,
      environmentType:
        template.spec?.environmentList?.[0]?.environmentType || 'Container',
    })) || [];

  return (
    <>
      {/* Mini header with quota display */}
      <div style={{ marginBottom: 16 }}>
        <QuotaDisplay tenantNamespace={tenantNamespace} />
      </div>

      <Box
        header={{
          size: 'large',
          center: (
            <div className="h-full flex justify-center items-center px-5">
              <p className="md:text-4xl text-2xl text-center mb-0">
                <b>{workspace.prettyName}</b>
                {isPersonal && (
                  <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Personal
                  </span>
                )}
              </p>
            </div>
          ),
          // Show manage users button only in NON-personal workspaces
          left: workspace.role === WorkspaceRole.manager && !isPersonal && (
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
          // Show action buttons in personal workspace and if user is manager
          right: workspace.role === WorkspaceRole.manager && isPersonal && (
            <div className="h-full flex justify-center items-center pr-10">
              <Space size="middle">
                <Tooltip title="Create instance">
                  <Button
                    onClick={handleCreateInstance}
                    type="default"
                    shape="circle"
                    size="large"
                    icon={<PlayCircleOutlined />}
                  />
                </Tooltip>
                <Tooltip title="Create template">
                  <Button
                    onClick={() => {
                      refetchImages();
                      setShow(true);
                    }}
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={<PlusOutlined />}
                  />
                </Tooltip>
              </Space>
            </div>
          ),
        }}
      >
        {/* Show templates only in personal workspace */}
        {isPersonal ? (
          <TemplatesTableLogic
            tenantNamespace={tenantNamespace}
            role={workspace.role}
            workspaceNamespace={workspace.namespace}
            workspaceName={workspace.name}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">
              Templates are only available in your personal workspace.
            </p>
            <p className="text-gray-400 text-sm">
              Switch to your personal workspace to manage templates and view
              quota information.
            </p>
          </div>
        )}

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

        {/* Create Instance Modal - placeholder for now */}
        <Modal
          title="Create Instance"
          open={showCreateInstanceModal}
          onCancel={() => setShowCreateInstanceModal(false)}
          footer={null}
          width="600px"
        >
          <div className="text-center py-8">
            <PlayCircleOutlined
              style={{ fontSize: '48px', color: '#1890ff' }}
            />
            <h3>Create New Instance</h3>
            <p>Select a template to create an instance from:</p>
            <p className="text-gray-500">
              This feature will allow you to create instances based on available
              templates.
            </p>
            <Button
              type="primary"
              onClick={() => setShowCreateInstanceModal(false)}
            >
              Close
            </Button>
          </div>
        </Modal>

        {/* Template creation modal for personal workspaces */}
        {isPersonalWorkspace(workspace, tenantNamespace) && (
          <ModalCreateTemplate
            workspaceNamespace={workspace.namespace}
            workspaceName={workspace.name}
            cpuQuota={8}
            memoryQuota={32}
            diskQuota={50}
            setShow={setShow}
            show={show}
            submitHandler={submitHandler}
            loading={false}
            existingTemplates={[]}
            containerImages={containerImages}
            vmImages={vmImages}
            storageClasses={['standard', 'fast-ssd']}
          />
        )}
      </Box>
    </>
  );
};

export default WorkspaceContainer;
