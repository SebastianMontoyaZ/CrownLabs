import React, { useState, useEffect } from 'react';
import {
  Modal,
  Select,
  Divider,
  Form,
  Input,
  Switch,
  InputNumber,
  Button,
  Space,
  Card,
  Alert,
  Tabs,
  Tag,
  Tooltip,
  AutoComplete,
} from 'antd';
import type {
  CreateTemplateMutation,
  SharedVolumeMountsListItem,
  EnvironmentType,
  useWorkspaceTemplatesQuery,
} from '../../../generated-types';
import type { FetchResult } from '@apollo/client';
import { ErrorContext } from '../../../errorHandling/ErrorContext';
import ShVolFormItem, { type ShVolFormItemValue } from './ShVolFormItem';
import {
  PlusOutlined,
  EditOutlined,
  ContainerOutlined,
  InfoCircleOutlined,
  DesktopOutlined,
  CloudOutlined,
  RocketOutlined,
  CodeOutlined,
} from '@ant-design/icons';
const alternativeHandle = { border: 'solid 2px #1c7afdd8' };
export type Image = {
  name: string;
  registry: string;
};
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

export interface ContainerImageSpec {
  name: string;
  registry: string;
  versions: string[];
}

export interface VMImageSpec {
  name: string;
  registry: string;
  tag: string;
  description?: string;
}

export interface Template {
  // Template metadata
  prettyName?: string;
  description?: string;
  deleteAfter?: string;

  // Environment configuration
  environmentName?: string;
  environmentType?: 'Container' | 'VirtualMachine';
  image?: string;
  guiEnabled?: boolean;
  persistent?: boolean;
  mode?: 'Standard' | 'Exam' | 'Exercise';
  mountMyDriveVolume?: boolean;

  // Resources
  cpu?: number;
  memory?: number; // in GB
  disk?: number; // in GB
  reservedCPUPercentage?: number;

  // Container specific
  containerStartupOptions?: {
    sourceArchiveURL?: string;
    contentPath?: string;
    startupArgs?: string[];
    enforceWorkdir?: boolean;
  };

  // VM specific
  cloudInit?: string;

  // Advanced
  storageClassName?: string;
  sharedVolumeMounts?: any[];
}

export interface IModalCreateTemplateProps {
  workspaceNamespace: string;
  workspaceName: string;
  cpuQuota: number;
  memoryQuota: number;
  diskQuota: number;
  setShow: (show: boolean) => void;
  show: boolean;
  submitHandler: (template: Template) => void;
  loading: boolean;
  existingTemplates?: any[];
  containerImages?: ContainerImageSpec[];
  vmImages?: VMImageSpec[];
  storageClasses?: string[];
}

const CREATE_NEW_TEMPLATE_VALUE = '__CREATE_NEW__';

const defaultCloudInit = `#cloud-config
# Cloud-init configuration for CrownLabs VM
# This runs on first boot to customize your VM

# Update system packages
package_update: true
package_upgrade: true

# Install additional packages
packages:
  - git
  - curl
  - wget
  - vim
  - htop

# Create additional users (optional)
# users:
#   - name: developer
#     groups: sudo
#     shell: /bin/bash
#     sudo: ['ALL=(ALL) NOPASSWD:ALL']

# Run custom commands
runcmd:
  - echo "VM customization completed" > /tmp/cloud-init-done
  # Add your custom commands here
  # - git clone https://github.com/your-repo/project.git /home/crownlabs/project
  # - systemctl enable your-service

# Write files to the filesystem
# write_files:
#   - path: /home/crownlabs/welcome.txt
#     content: |
#       Welcome to your CrownLabs VM!
#       This file was created by cloud-init.
#     owner: crownlabs:crownlabs
#     permissions: '0644'

# Configure timezone
timezone: UTC

# Set hostname (optional)
# hostname: my-crownlabs-vm

# Final message
final_message: "CrownLabs VM setup completed successfully!"
`;

const popularContainerImages = [
  'ubuntu:22.04',
  'ubuntu:20.04',
  'python:3.11',
  'python:3.9',
  'node:18',
  'node:16',
  'nginx:latest',
  'postgres:15',
  'redis:7',
  'mysql:8.0',
  'jupyter/datascience-notebook:latest',
  'jupyter/scipy-notebook:latest',
  'tensorflow/tensorflow:latest',
  'pytorch/pytorch:latest',
];

const ModalCreateTemplate: FC<IModalCreateTemplateProps> = ({
  workspaceNamespace,
  workspaceName,
  cpuQuota,
  memoryQuota,
  diskQuota,
  setShow,
  show,
  submitHandler,
  loading,
  existingTemplates = [],
  containerImages = [],
  vmImages = [],
  storageClasses = [],
}) => {
  const [form] = Form.useForm();
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    CREATE_NEW_TEMPLATE_VALUE
  );
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('basic');
  const [environmentType, setEnvironmentType] = useState<
    'Container' | 'VirtualMachine'
  >('Container');
  const [startupArgs, setStartupArgs] = useState<string>('');
  const [cloudInit, setCloudInit] = useState<string>(defaultCloudInit);
  const [customImageUrl, setCustomImageUrl] = useState<string>('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (show) {
      setSelectedTemplate(CREATE_NEW_TEMPLATE_VALUE);
      setIsEditing(false);
      setActiveTab('basic');
      setEnvironmentType('Container');
      setStartupArgs('');
      setCloudInit(defaultCloudInit);
      setCustomImageUrl('');
      form.resetFields();
    }
  }, [show]);

  const handleEnvironmentTypeChange = (
    value: 'Container' | 'VirtualMachine'
  ) => {
    setEnvironmentType(value);
    form.setFieldsValue({ environmentType: value });
    // Clear image selection when switching types
    form.setFieldsValue({ image: undefined });
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const templateData: Template = {
        // Basic configuration
        prettyName: values.prettyName,
        description: values.description,
        deleteAfter: values.deleteAfter || 'never',

        // Environment
        environmentName: values.environmentName || values.prettyName,
        environmentType: environmentType,
        image: customImageUrl || values.image,
        guiEnabled: values.guiEnabled,
        persistent: values.persistent,
        mode: values.mode,
        mountMyDriveVolume: values.mountMyDriveVolume,

        // Resources
        cpu: values.cpu,
        memory: values.memory,
        disk: values.disk,
        reservedCPUPercentage: values.reservedCPUPercentage,

        // Advanced
        storageClassName: values.storageClassName,
      };

      // Environment-specific configuration
      if (environmentType === 'Container') {
        templateData.containerStartupOptions =
          values.sourceArchiveURL || values.contentPath || startupArgs
            ? {
                sourceArchiveURL: values.sourceArchiveURL,
                contentPath: values.contentPath,
                startupArgs: startupArgs
                  ? startupArgs.split('\n').filter(arg => arg.trim())
                  : [],
                enforceWorkdir: values.enforceWorkdir,
              }
            : undefined;
      } else if (environmentType === 'VirtualMachine') {
        templateData.cloudInit = cloudInit;
      }

      submitHandler(templateData);
    });
  };

  const handleCancel = () => {
    setShow(false);
    form.resetFields();
    setSelectedTemplate(CREATE_NEW_TEMPLATE_VALUE);
    setIsEditing(false);
    setEnvironmentType('Container');
    setStartupArgs('');
    setCloudInit(defaultCloudInit);
    setCustomImageUrl('');
  };

  // Get available images based on environment type
  const getAvailableImages = () => {
    if (environmentType === 'Container') {
      const allImages: string[] = [];

      // Add CrownLabs container images
      containerImages.forEach(image => {
        image.versions.forEach(version => {
          allImages.push(`${image.registry}/${image.name}:${version}`);
        });
      });

      return allImages;
    } else {
      // VM images
      return vmImages.map(vm => `${vm.registry}/${vm.name}:${vm.tag}`);
    }
  };

  const renderImageSelection = () => {
    if (environmentType === 'Container') {
      return (
        <Card
          title={
            <Space>
              <ContainerOutlined />
              Container Image
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Alert
            message="Container Image Options"
            description="Select from CrownLabs images, popular Docker Hub images, or specify a custom image URL."
            type="info"
            style={{ marginBottom: 16 }}
            showIcon
          />

          <Form.Item
            label="Image Source"
            tooltip="Choose how you want to specify the container image"
          >
            <Select
              value={customImageUrl ? 'custom' : 'predefined'}
              onChange={value => {
                if (value === 'custom') {
                  form.setFieldsValue({ image: undefined });
                } else {
                  setCustomImageUrl('');
                }
              }}
            >
              <Option value="predefined">Select from available images</Option>
              <Option value="custom">Specify custom image URL</Option>
            </Select>
          </Form.Item>

          {!customImageUrl ? (
            <Form.Item
              label="Container Image"
              name="image"
              rules={[
                { required: true, message: 'Please select a container image' },
              ]}
            >
              <AutoComplete
                placeholder="Search or select an image..."
                options={[
                  ...getAvailableImages().map(img => ({
                    value: img,
                    label: img,
                  })),
                  ...popularContainerImages.map(img => ({
                    value: img,
                    label: (
                      <span>
                        {img} <Tag color="blue">Popular</Tag>
                      </span>
                    ),
                  })),
                ]}
                filterOption={(inputValue, option) =>
                  option?.value
                    .toLowerCase()
                    .includes(inputValue.toLowerCase()) || false
                }
              />
            </Form.Item>
          ) : (
            <Form.Item
              label="Custom Image URL"
              tooltip="Enter any Docker image URL (e.g., docker.io/library/ubuntu:22.04)"
            >
              <Input
                value={customImageUrl}
                onChange={e => setCustomImageUrl(e.target.value)}
                placeholder="docker.io/library/ubuntu:22.04"
              />
            </Form.Item>
          )}

          <div style={{ fontSize: '12px', color: '#666' }}>
            💡 Examples: ubuntu:22.04, python:3.11,
            jupyter/datascience-notebook:latest
          </div>
        </Card>
      );
    } else {
      return (
        <Card
          title={
            <Space>
              <DesktopOutlined />
              Virtual Machine Image
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Alert
            message="VM Image Selection"
            description="Choose from available CrownLabs VM images. These are pre-configured virtual machines."
            type="info"
            style={{ marginBottom: 16 }}
            showIcon
          />

          <Form.Item
            label="VM Image"
            name="image"
            rules={[{ required: true, message: 'Please select a VM image' }]}
          >
            <Select placeholder="Select a VM image...">
              {vmImages.map(vm => (
                <Option
                  key={`${vm.name}:${vm.tag}`}
                  value={`${vm.registry}/${vm.name}:${vm.tag}`}
                >
                  <div>
                    <div style={{ fontWeight: 'bold' }}>
                      {vm.name}:{vm.tag}
                    </div>
                    {vm.description && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {vm.description}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {vm.registry}
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {vmImages.length === 0 && (
            <Alert
              message="No VM images available"
              description="Contact your administrator to add VM images to the CrownLabs registry."
              type="warning"
              showIcon
            />
          )}
        </Card>
      );
    }
  };

  const renderAdvancedConfiguration = () => {
    if (environmentType === 'Container') {
      return (
        <Card title="Container Startup Options" style={{ marginBottom: 16 }}>
          <Form.Item
            label="Download & Extract Archive"
            name="sourceArchiveURL"
            tooltip="URL to download and extract into your container on startup"
          >
            <Input placeholder="https://example.com/my-project.tar.gz" />
          </Form.Item>

          <Form.Item
            label="Content/Working Directory"
            name="contentPath"
            tooltip="Where to extract archive or set as working directory"
          >
            <Input placeholder="/workspace" />
          </Form.Item>

          <Form.Item
            label="Custom Startup Commands"
            tooltip="Commands to run when container starts (one per line)"
          >
            <TextArea
              value={startupArgs}
              onChange={e => setStartupArgs(e.target.value)}
              placeholder={`npm install\nnpm start\n# or any other commands...`}
              rows={4}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item
            label="Enforce Working Directory"
            name="enforceWorkdir"
            valuePropName="checked"
            tooltip="Force container to start in the content directory"
          >
            <Switch />
          </Form.Item>
        </Card>
      );
    } else {
      return (
        <Card
          title={
            <Space>
              <CloudOutlined />
              Cloud-Init Configuration
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Alert
            message="VM Customization with Cloud-Init"
            description="Use cloud-init to automatically configure your VM on first boot. Install packages, create users, run commands, and more."
            type="info"
            style={{ marginBottom: 16 }}
            showIcon
          />

          <Form.Item label="Cloud-Init Configuration">
            <TextArea
              value={cloudInit}
              onChange={e => setCloudInit(e.target.value)}
              placeholder="Enter your cloud-init configuration in YAML format..."
              rows={12}
              style={{
                fontFamily:
                  'Monaco, Menlo, "Ubuntu Mono", consolas, "source-code-pro", monospace',
                fontSize: '13px',
                lineHeight: '1.4',
                background: '#f8f8f8',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
              }}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
              💡 Cloud-init will run on VM first boot to install packages and
              configure the system
            </div>
          </Form.Item>
        </Card>
      );
    }
  };

  return (
    <Modal
      title={
        <Space>
          <RocketOutlined />
          {isEditing ? 'Edit Your Template' : 'Create Your Custom Template'}
        </Space>
      }
      open={show}
      onCancel={handleCancel}
      width={1000}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          icon={isEditing ? <EditOutlined /> : <PlusOutlined />}
        >
          {isEditing ? 'Update Template' : 'Create Template'}
        </Button>,
      ]}
    >
      {/* Template Selection */}
      {existingTemplates.length > 0 && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}
            >
              Start from existing template or create new:
            </label>
            <Select
              value={selectedTemplate}
              onChange={setSelectedTemplate}
              style={{ width: '100%' }}
              size="large"
            >
              <Option value={CREATE_NEW_TEMPLATE_VALUE}>
                <Space>
                  <PlusOutlined />
                  Create New Template
                </Space>
              </Option>
              <Divider style={{ margin: '8px 0' }}>Your Templates</Divider>
              {existingTemplates.map(template => (
                <Option key={template.id} value={template.id}>
                  <Space>
                    <EditOutlined />
                    {template.prettyName}
                  </Space>
                </Option>
              ))}
            </Select>
          </div>
          <Divider />
        </>
      )}

      <Alert
        message="Create Your Personal Environment"
        description="Design custom environments for your workspace. Choose between containers for lightweight applications or VMs for complete operating systems."
        type="info"
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 24 }}
        showIcon
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          deleteAfter: 'never',
          environmentType: 'Container',
          mode: 'Standard',
          guiEnabled: true,
          persistent: false,
          mountMyDriveVolume: true,
          cpu: Math.min(2, cpuQuota),
          memory: Math.min(4, memoryQuota),
          disk: Math.min(10, diskQuota),
          reservedCPUPercentage: 50,
        }}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* Basic Configuration */}
          <TabPane
            tab={
              <Space>
                <CodeOutlined />
                Basic
              </Space>
            }
            key="basic"
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: 16,
              }}
            >
              <Form.Item
                label="Template Name"
                name="prettyName"
                rules={[
                  { required: true, message: 'Please enter a template name' },
                ]}
              >
                <Input placeholder="My Awesome Development Environment" />
              </Form.Item>

              <Form.Item
                label="Environment Type"
                name="environmentType"
                rules={[
                  { required: true, message: 'Please select environment type' },
                ]}
              >
                <Select
                  value={environmentType}
                  onChange={handleEnvironmentTypeChange}
                >
                  <Option value="Container">
                    <Space>
                      <ContainerOutlined />
                      Container
                    </Space>
                  </Option>
                  <Option value="VirtualMachine">
                    <Space>
                      <DesktopOutlined />
                      Virtual Machine
                    </Space>
                  </Option>
                </Select>
              </Form.Item>
            </div>

            <Form.Item label="Description" name="description">
              <TextArea
                placeholder="Describe what this environment is for..."
                rows={3}
                showCount
                maxLength={500}
              />
            </Form.Item>

            {renderImageSelection()}

            <Card title="Environment Features" size="small">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 16,
                }}
              >
                <Form.Item
                  label="GUI Desktop"
                  name="guiEnabled"
                  valuePropName="checked"
                  tooltip="Enable if you need a graphical desktop interface"
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  label="Persistent Storage"
                  name="persistent"
                  valuePropName="checked"
                  tooltip="Keep your data when environment restarts"
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  label="Mount My Drive"
                  name="mountMyDriveVolume"
                  valuePropName="checked"
                  tooltip="Access your personal files in the environment"
                >
                  <Switch />
                </Form.Item>
              </div>
            </Card>
          </TabPane>

          {/* Resource Configuration */}
          <TabPane
            tab={
              <Space>
                <DesktopOutlined />
                Resources
              </Space>
            }
            key="resources"
          >
            <Alert
              message={`Your Quota: ${cpuQuota} CPU cores, ${memoryQuota}GB RAM, ${diskQuota}GB disk`}
              type="info"
              style={{ marginBottom: 16 }}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 24,
              }}
            >
              <Card title="CPU & Memory" size="small">
                <Form.Item
                  label={`CPU Cores (max ${cpuQuota})`}
                  name="cpu"
                  rules={[
                    { required: true, message: 'Please enter CPU cores' },
                    { type: 'number', min: 1, max: cpuQuota },
                  ]}
                >
                  <InputNumber
                    min={1}
                    max={cpuQuota}
                    style={{ width: '100%' }}
                    addonAfter="cores"
                  />
                </Form.Item>

                <Form.Item
                  label={`Memory (max ${memoryQuota}GB)`}
                  name="memory"
                  rules={[
                    { required: true, message: 'Please enter memory' },
                    { type: 'number', min: 1, max: memoryQuota },
                  ]}
                >
                  <InputNumber
                    min={1}
                    max={memoryQuota}
                    style={{ width: '100%' }}
                    addonAfter="GB"
                  />
                </Form.Item>

                <Form.Item
                  label="Reserved CPU %"
                  name="reservedCPUPercentage"
                  tooltip="Percentage of CPU guaranteed to be available"
                >
                  <InputNumber
                    min={10}
                    max={100}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Card>

              <Card title="Storage & Lifecycle" size="small">
                <Form.Item
                  label={`Disk Size (max ${diskQuota}GB)`}
                  name="disk"
                  tooltip="Persistent disk storage for your environment"
                >
                  <InputNumber
                    min={1}
                    max={diskQuota}
                    style={{ width: '100%' }}
                    addonAfter="GB"
                  />
                </Form.Item>

                <Form.Item
                  label="Auto-delete instances after"
                  name="deleteAfter"
                  tooltip="Automatically clean up instances to save resources"
                >
                  <Select>
                    <Option value="never">Never</Option>
                    <Option value="1h">1 Hour</Option>
                    <Option value="8h">8 Hours</Option>
                    <Option value="24h">24 Hours</Option>
                    <Option value="7d">7 Days</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label="Environment Mode"
                  name="mode"
                  tooltip="Standard: full access, Exam/Exercise: restricted access"
                >
                  <Select>
                    <Option value="Standard">Standard</Option>
                    <Option value="Exam">Exam Mode</Option>
                    <Option value="Exercise">Exercise Mode</Option>
                  </Select>
                </Form.Item>
              </Card>
            </div>
          </TabPane>

          {/* Advanced Configuration */}
          <TabPane
            tab={
              <Space>
                <RocketOutlined />
                Advanced
              </Space>
            }
            key="advanced"
          >
            {renderAdvancedConfiguration()}

            {storageClasses.length > 0 && (
              <Card title="Storage Options" style={{ marginBottom: 16 }}>
                <Form.Item
                  label="Storage Type"
                  name="storageClassName"
                  tooltip="Different storage types may have different performance characteristics"
                >
                  <Select placeholder="Default storage">
                    {storageClasses.map(sc => (
                      <Option key={sc} value={sc}>
                        {sc}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Card>
            )}

            <Alert
              message="Pro Tips"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>
                    Container: Use lightweight base images for faster startup
                  </li>
                  <li>
                    VM: Cloud-init runs only on first boot, not on restarts
                  </li>
                  <li>Test your configurations in small instances first</li>
                  <li>
                    Consider using popular images that are likely already cached
                  </li>
                </ul>
              }
              type="info"
              showIcon
            />
          </TabPane>
        </Tabs>
      </Form>
    </Modal>
  );
};

export default ModalCreateTemplate;
