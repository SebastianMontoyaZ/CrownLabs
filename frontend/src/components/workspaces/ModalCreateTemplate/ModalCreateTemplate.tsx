import type { FC } from 'react';
import { useState, useEffect, useContext } from 'react';
import {
  Modal,
  Select,
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
  Slider,
} from 'antd';
import type {
  CreateTemplateMutation,
  SharedVolumeMountsListItem,
} from '../../../generated-types';
import {
  EnvironmentType,
  useWorkspaceSharedVolumesQuery,
} from '../../../generated-types';
import type { FetchResult } from '@apollo/client';
import { ErrorContext } from '../../../errorHandling/ErrorContext';
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

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

export type Image = {
  name: string;
  vmorcontainer: Array<EnvironmentType>;
  registry: string;
};

export interface Template {
  name?: string;
  description?: string;
  image?: string;
  registry?: string;
  vmorcontainer?: EnvironmentType;
  persistent: boolean;
  mountMyDrive: boolean;
  gui: boolean;
  cpu: number;
  ram: number;
  disk?: number;
  sharedVolumeMountInfos?: SharedVolumeMountsListItem[];
}

export interface IModalCreateTemplateProps {
  workspaceNamespace: string;
  cpuInterval: { min: number; max: number };
  ramInterval: { min: number; max: number };
  diskInterval: { min: number; max: number };
  setShow: (show: boolean) => void;
  show: boolean;
  images: Image[];
  submitHandler: (
    t: Template
  ) => Promise<
    FetchResult<
      CreateTemplateMutation,
      Record<string, unknown>,
      Record<string, unknown>
    >
  >;
  loading: boolean;
}

const defaultCloudInit = `#cloud-config
# Cloud-init configuration for CrownLabs VM
package_update: true
package_upgrade: true

packages:
  - git
  - curl
  - wget
  - vim
  - htop

runcmd:
  - echo "VM customization completed" > /tmp/cloud-init-done

timezone: UTC
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
];

const ModalCreateTemplate: FC<IModalCreateTemplateProps> = ({
  workspaceNamespace,
  cpuInterval,
  ramInterval,
  diskInterval,
  setShow,
  show,
  images,
  submitHandler,
  loading,
}) => {
  const [form] = Form.useForm();
  const [environmentType, setEnvironmentType] = useState<EnvironmentType>(
    EnvironmentType.Container
  );
  const [customImageUrl, setCustomImageUrl] = useState<string>('');
  const [cloudInit, setCloudInit] = useState<string>(defaultCloudInit);
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(true);

  const { apolloErrorCatcher } = useContext(ErrorContext);

  // Fetch shared volumes for the workspace
  const { data: sharedVolumesData } = useWorkspaceSharedVolumesQuery({
    variables: { workspaceNamespace },
    onError: apolloErrorCatcher,
  });

  const handleEnvironmentTypeChange = (value: EnvironmentType) => {
    setEnvironmentType(value);
    form.setFieldsValue({ environmentType: value });
    // Clear image selection when switching types
    form.setFieldsValue({ image: undefined });
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const templateData: Template = {
        name: values.templateName,
        description: values.description,
        image: customImageUrl || values.image,
        registry: values.registry,
        vmorcontainer: environmentType,
        gui: values.gui || true,
        persistent: values.persistent || false,
        mountMyDrive: values.mountMyDrive || true,
        cpu: values.cpu,
        ram: values.ram,
        disk: values.disk,
        sharedVolumeMountInfos: values.sharedVolumeMountInfos || [],
      };

      submitHandler(templateData).then(() => {
        handleCancel();
      });
    });
  };

  const handleCancel = () => {
    setShow(false);
    form.resetFields();
    setEnvironmentType(EnvironmentType.Container);
    setCustomImageUrl('');
    setCloudInit(defaultCloudInit);
  };

  // Get available images based on environment type
  const getAvailableImages = () => {
    return images
      .filter(img => img.vmorcontainer.includes(environmentType))
      .map(img => img.name);
  };

  const renderImageSelection = () => {
    if (environmentType === EnvironmentType.Container) {
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
            description="Select from available images, popular Docker Hub images, or specify a custom image URL."
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
                  setCustomImageUrl('');
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
              <CloudOutlined />
              Virtual Machine Image
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            label="VM Image"
            name="image"
            rules={[{ required: true, message: 'Please select a VM image' }]}
          >
            <Select placeholder="Select a VM image...">
              {getAvailableImages().map(img => (
                <Option key={img} value={img}>
                  {img}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Cloud-Init Configuration"
            tooltip="Cloud-init script that runs on VM first boot"
          >
            <TextArea
              value={cloudInit}
              onChange={e => setCloudInit(e.target.value)}
              rows={10}
              placeholder={defaultCloudInit}
            />
          </Form.Item>

          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
            💡 Cloud-init will run on VM first boot to install packages and
            configure the system
          </div>
        </Card>
      );
    }
  };

  return (
    <Modal
      title={
        <Space>
          <RocketOutlined />
          Create Your Custom Template
        </Space>
      }
      open={show}
      onCancel={handleCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          disabled={buttonDisabled}
          icon={<PlusOutlined />}
        >
          Create Template
        </Button>,
      ]}
    >
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
          environmentType: EnvironmentType.Container,
          gui: true,
          persistent: false,
          mountMyDrive: true,
          cpu: Math.min(2, cpuInterval.max),
          ram: Math.min(4, ramInterval.max),
          disk: Math.min(10, diskInterval.max || 20),
        }}
        onValuesChange={() => {
          // Enable/disable submit button based on form validation
          form
            .validateFields(['templateName', 'image'])
            .then(() => setButtonDisabled(false))
            .catch(() => setButtonDisabled(true));
        }}
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
            name="templateName"
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
              <Option value={EnvironmentType.Container}>
                <Space>
                  <ContainerOutlined />
                  Container
                </Space>
              </Option>
              <Option value={EnvironmentType.VirtualMachine}>
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

        <Card
          title="Environment Features"
          size="small"
          style={{ marginBottom: 16 }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 16,
            }}
          >
            <Form.Item
              label="GUI Desktop"
              name="gui"
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
              name="mountMyDrive"
              valuePropName="checked"
              tooltip="Access your personal files in the environment"
            >
              <Switch />
            </Form.Item>
          </div>
        </Card>

        <Card title="Resource Configuration" size="small">
          <Alert
            message={`Available: ${cpuInterval.max} CPU cores, ${
              ramInterval.max
            }GB RAM${diskInterval.max ? `, ${diskInterval.max}GB disk` : ''}`}
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
            <div>
              <Form.Item
                label={`CPU Cores (max ${cpuInterval.max})`}
                name="cpu"
                rules={[
                  { required: true, message: 'Please enter CPU cores' },
                  {
                    type: 'number',
                    min: cpuInterval.min,
                    max: cpuInterval.max,
                  },
                ]}
              >
                <Slider
                  min={cpuInterval.min}
                  max={cpuInterval.max}
                  step={1}
                  marks={{
                    [cpuInterval.min]: `${cpuInterval.min}`,
                    [cpuInterval.max]: `${cpuInterval.max}`,
                  }}
                  tooltip={{ formatter: value => `${value} cores` }}
                />
              </Form.Item>

              <Form.Item
                label={`Memory (max ${ramInterval.max}GB)`}
                name="ram"
                rules={[
                  { required: true, message: 'Please enter memory' },
                  {
                    type: 'number',
                    min: ramInterval.min,
                    max: ramInterval.max,
                  },
                ]}
              >
                <Slider
                  min={ramInterval.min}
                  max={ramInterval.max}
                  step={0.5}
                  marks={{
                    [ramInterval.min]: `${ramInterval.min}GB`,
                    [ramInterval.max]: `${ramInterval.max}GB`,
                  }}
                  tooltip={{ formatter: value => `${value} GB` }}
                />
              </Form.Item>
            </div>

            <div>
              {diskInterval.max && (
                <Form.Item
                  label={`Disk Size (max ${diskInterval.max}GB)`}
                  name="disk"
                  tooltip="Persistent disk storage for your environment"
                >
                  <Slider
                    min={diskInterval.min}
                    max={diskInterval.max}
                    step={1}
                    marks={{
                      [diskInterval.min]: `${diskInterval.min}GB`,
                      [diskInterval.max]: `${diskInterval.max}GB`,
                    }}
                    tooltip={{ formatter: value => `${value} GB` }}
                  />
                </Form.Item>
              )}
            </div>
          </div>
        </Card>
      </Form>
    </Modal>
  );
};

export default ModalCreateTemplate;
