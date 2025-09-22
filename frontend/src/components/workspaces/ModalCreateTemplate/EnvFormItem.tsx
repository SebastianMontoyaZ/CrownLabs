import {
  DeleteOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Alert,
  AutoComplete,
  Button,
  Checkbox,
  Divider,
  Form,
  Input,
  Select,
  Slider,
  Tooltip,
} from 'antd';
import { useEffect, useState, type FC } from 'react';
import {
  EnvironmentType,
  type SharedVolumeMountsListItem,
} from '../../../generated-types';
import type { Image } from './ModalCreateTemplate';
import ShVolFormItem from './ShVolFormItem';
import type { SharedVolume } from '../../../utils';

type Interval = {
  max: number;
  min: number;
};

type Resources = {
  cpu: Interval;
  disk: Interval;
  ram: Interval;
};

export type TemplateEnvironment = {
  name: string;
  environmentType: EnvironmentType;
  image: string;
  registry: string;
  gui: boolean;
  cpu: number;
  ram: number;
  persistent: boolean;
  disk: number;
  sharedVolumeMounts: SharedVolumeMountsListItem[];
};

// Environment type options
const environmentTypeOptions = [
  { value: EnvironmentType.VirtualMachine, label: 'Virtual Machine' },
  { value: EnvironmentType.Container, label: 'Container' },
  { value: EnvironmentType.CloudVm, label: 'Cloud VM' },
  { value: EnvironmentType.Standalone, label: 'Standalone' },
];

const getImageNameNoVer = (image: string) => {
  // split on the last ':' to correctly handle registry:port/repo:tag cases
  return image.includes(':') ? image.slice(0, image.lastIndexOf(':')) : image;
};

const getImageNames = (images: Image[]) => {
  const baseNames = images.map(img => getImageNameNoVer(img.name));
  return Array.from(new Set(baseNames)).sort((a, b) => a.localeCompare(b));
};

interface IEnvFormItemProps {
  availableImages: Image[];
  resources: Resources;
  sharedVolumes: SharedVolume[];
  isPersonal: boolean;
}

export const EnvFormItem: FC<IEnvFormItemProps> = ({
  availableImages,
  resources,
  sharedVolumes,
  isPersonal,
}) => {
  const form = Form.useFormInstance();

  const environments = Form.useWatch<TemplateEnvironment[] | undefined>(
    'environments',
  );

  // Custom validator for unique environment names
  const validateUniqueName = (currIndex: number) => {
    return async (_: unknown, name: string) => {
      if (!environments || !name) return;

      const trimmedName = name.trim().toLowerCase();
      const duplicateIndex = environments.findIndex(
        (env, idx) =>
          idx !== currIndex && env.name.toLowerCase() === trimmedName,
      );

      if (duplicateIndex !== -1) {
        throw new Error(`Name "${name}" is already used`);
      }
    };
  };

  // Function to trigger validation of all name fields when any name changes
  const handleNameChange = (changedIndex: number) => {
    if (!environments) return;

    // Validate all other name fields to update their validation status
    environments.forEach((_: TemplateEnvironment, idx: number) => {
      if (idx !== changedIndex) {
        form.validateFields([['environments', idx, 'name']]).catch(() => {
          // Ignore validation errors, just trigger the validation
        });
      }
    });
  };

  const getDefaultEnvironment = (envCount: number): TemplateEnvironment => {
    const name = `env-${envCount}`;

    return {
      name,
      environmentType: EnvironmentType.VirtualMachine,
      image: '',
      registry: '',
      gui: true,
      cpu: resources.cpu.min,
      ram: resources.ram.min,
      persistent: false,
      disk: 0,
      sharedVolumeMounts: [],
    };
  };

  const [imagesSearchOptions, setImagesSearchOptions] = useState<string[]>([]);

  useEffect(() => {
    setImagesSearchOptions(getImageNames(availableImages));
  }, [availableImages]);

  const isVM = (currIndex: number) => {
    if (!environments) return false;
    if (!environments[currIndex]) return false;

    return (
      environments[currIndex].environmentType === EnvironmentType.VirtualMachine
    );
  };

  const isPersistent = (currIndex: number) => {
    if (!environments) return false;
    if (!environments[currIndex]) return false;

    return environments[currIndex].persistent;
  };

  const getImageAlert = (currIndex: number) => {
    if (!environments) return <></>;
    if (!environments[currIndex]) return <></>;
    if (!environments[currIndex].environmentType) return <></>;

    switch (environments[currIndex].environmentType) {
      case EnvironmentType.CloudVm:
        return <CloudVmAlert />;
      case EnvironmentType.Container:
        return <ContainerAlert />;
      case EnvironmentType.Standalone:
        return <StandaloneAlert />;
    }

    return <></>;
  };

  const getGUIDescription = (currIndex: number) => {
    if (!environments) return '';
    if (!environments[currIndex]) return '';

    switch (environments[currIndex].environmentType) {
      case EnvironmentType.Container:
      case EnvironmentType.Standalone:
        return 'Standalone and Container environments only work with GUI and not SSH';
      case EnvironmentType.CloudVm:
        return 'CloudVM instances do not support GUI access';
    }

    return '';
  };

  const getEnvironmentType = (currIndex: number) => {
    if (!environments) return '';
    if (!environments[currIndex]) return '';

    return environments[currIndex].environmentType;
  };

  const handleSliderChange = (
    currIndex: number,
    field: 'cpu' | 'ram' | 'disk',
    value: number,
  ) => {
    if (!environments) return;
    if (!environments[currIndex]) return;

    form.setFieldsValue({
      environments: environments.map((env, idx) => {
        if (idx === currIndex) {
          return {
            ...env,
            [field]: value,
          };
        }
        return env;
      }),
    });
  };

  return (
    <Form.List name="environments">
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...restField }) => (
            <div key={key}>
              {key !== 0 && (
                <>
                  <Divider />

                  <Button
                    className="mb-4"
                    type="dashed"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => remove(name)}
                    block
                  >
                    Remove Environment
                  </Button>
                </>
              )}

              {/* Environment Name */}
              <Form.Item
                {...restField}
                name={[name, 'name']}
                label="Name"
                labelCol={{ span: 6 }} // Adjust label width
                wrapperCol={{ span: 18 }} // Adjust input width
                validateTrigger={['onChange', 'onBlur']}
                rules={[
                  { required: true, message: 'Environment name is required' },
                  { validator: validateUniqueName(name) },
                ]}
                validateDebounce={500}
              >
                <Input
                  placeholder="Environment Name"
                  allowClear
                  onChange={() => handleNameChange(name)}
                />
              </Form.Item>

              {/* Environment Type Selection */}
              <Form.Item
                label="Type"
                name={[name, 'environmentType']}
                required
                rules={[
                  {
                    required: true,
                    message: 'Select an environment type',
                  },
                ]}
                labelCol={{ span: 6 }} // Adjust label width
                wrapperCol={{ span: 18 }} // Adjust input width
              >
                <Select
                  placeholder="Select environment type"
                  getPopupContainer={trigger =>
                    trigger.parentElement || document.body
                  }
                >
                  {environmentTypeOptions.map(option => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {/* VM Image Selection - Remove {...fullLayout} */}
              {isVM(name) ? (
                <Form.Item
                  {...restField}
                  label="Image"
                  name={[name, 'image']}
                  required
                  validateTrigger="onChange"
                  rules={[
                    {
                      required: true,
                      message: 'Select a virtual machine image',
                    },
                  ]}
                  labelCol={{ span: 6 }} // Adjust label width
                  wrapperCol={{ span: 18 }} // Adjust input width
                >
                  <AutoComplete
                    options={imagesSearchOptions.map(imgName => ({
                      value: imgName,
                    }))}
                    onFocus={() => {
                      if (imagesSearchOptions.length === 0)
                        setImagesSearchOptions(getImageNames(availableImages));
                    }}
                    onChange={(value: string) => {
                      setImagesSearchOptions(
                        getImageNames(availableImages).filter(s =>
                          s.includes(value),
                        ),
                      );
                    }}
                    placeholder="Select a virtual machine image"
                    getPopupContainer={trigger =>
                      trigger.parentElement || document.body
                    }
                  />
                </Form.Item>
              ) : (
                <>
                  {/* External Image Input for Container, CloudVM, Standalone */}
                  <Alert
                    message={`${getEnvironmentType(name)} Image Requirements`}
                    description={getImageAlert(name)}
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  {/* External Image Input */}
                  <Form.Item
                    {...restField}
                    label="External Image"
                    name={[name, 'registry']}
                    required
                    validateTrigger="onChange"
                    rules={[
                      {
                        required: true,
                        message: 'Enter an external image',
                      },
                    ]}
                    labelCol={{ span: 6 }} // Adjust label width
                    wrapperCol={{ span: 18 }} // Adjust input width
                    extra="Examples: ubuntu:22.04, docker.io/library/nginx:latest"
                  >
                    <Input
                      placeholder="Enter image name (e.g., ubuntu:22.04)"
                      suffix={
                        <Tooltip title="Image format: [registry/]repository[:tag]">
                          <InfoCircleOutlined
                            style={{ color: 'rgba(0,0,0,.45)' }}
                          />
                        </Tooltip>
                      }
                    />
                  </Form.Item>
                </>
              )}

              {/* GUI Toggle */}
              <Form.Item
                {...restField}
                label="GUI"
                name={[name, 'gui']}
                valuePropName="checked"
                labelCol={{ span: 6 }} // Adjust label width
                wrapperCol={{ span: 18 }} // Adjust input width
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    disabled={!isVM(name)} // Disable GUI for CloudVM, Standalone, and Container
                  />

                  <div className="ant-form-item-extra text-xs pt-1">
                    {getGUIDescription(name)}
                  </div>
                </div>
              </Form.Item>

              {/* CPU Slider */}
              <Form.Item {...restField} label="CPU" name={[name, 'cpu']}>
                <div className="sm:pl-3 pr-1">
                  <Slider
                    tooltip={{
                      defaultOpen: false,
                      formatter: value => `${value} Cores`,
                    }}
                    min={resources.cpu.min}
                    max={resources.cpu.max}
                    marks={{
                      [resources.cpu.min]: `${resources.cpu.min}`,
                      [resources.cpu.max]: `${resources.cpu.max}`,
                    }}
                    onChangeComplete={value =>
                      handleSliderChange(name, 'cpu', value)
                    }
                  />
                </div>
              </Form.Item>

              {/* RAM Slider */}
              <Form.Item {...restField} label="RAM" name={[name, 'ram']}>
                <div className="sm:pl-3 pr-1">
                  <Slider
                    tooltip={{
                      defaultOpen: false,
                      formatter: value => `${value} GB`,
                    }}
                    min={resources.ram.min}
                    max={resources.ram.max}
                    marks={{
                      [resources.ram.min]: `${resources.ram.min}GB`,
                      [resources.ram.max]: `${resources.ram.max}GB`,
                    }}
                    step={0.25}
                    onChangeComplete={value =>
                      handleSliderChange(name, 'ram', value)
                    }
                  />
                </div>
              </Form.Item>

              {/* Persistent Toggle */}
              <Form.Item
                {...restField}
                label="Persistent"
                name={[name, 'persistent']}
                valuePropName="checked"
                labelCol={{ span: 6 }} // Adjust label width
                wrapperCol={{ span: 18 }} // Adjust input width
              >
                {/* <Tooltip title="A persistent VM/container disk space won't be destroyed after being turned off."> */}
                <Checkbox />
                {/* </Tooltip> */}
              </Form.Item>

              {/* Disk Slider */}
              <Form.Item label="Disk" name={[name, 'disk']}>
                <div className="sm:pl-3 pr-1 ">
                  <Slider
                    tooltip={{
                      defaultOpen: false,
                      formatter: value => `${value} GB`,
                    }}
                    min={resources.disk.min}
                    max={resources.disk.max}
                    marks={{
                      [resources.disk.min]: `${resources.disk.min}GB`,
                      [resources.disk.max]: `${resources.disk.max}GB`,
                    }}
                    disabled={!isPersistent(name)}
                    onChangeComplete={value =>
                      handleSliderChange(name, 'disk', value)
                    }
                  />
                </div>
              </Form.Item>

              {!isPersonal && (
                <ShVolFormItem
                  parentFormName={name}
                  sharedVolumes={sharedVolumes}
                />
              )}
            </div>
          ))}

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => add(getDefaultEnvironment(fields.length + 1))}
          >
            Add Environment
          </Button>
        </>
      )}
    </Form.List>
  );
};

const ContainerAlert = () => {
  return (
    <p>
      Must be compliant with{' '}
      <a
        href="https://github.com/netgroup-polito/CrownLabs/tree/master/provisioning/containers"
        target="_blank"
        rel="noopener noreferrer"
      >
        CrownLabs container guidelines
      </a>
      . GUI-based container applications with desktop environment access via web
      browser.
    </p>
  );
};

const StandaloneAlert = () => {
  return (
    <p>
      Must be compliant with{' '}
      <a
        href="https://github.com/netgroup-polito/CrownLabs/tree/master/provisioning/standalone"
        target="_blank"
        rel="noopener noreferrer"
      >
        CrownLabs standalone guidelines
      </a>
      . Web-based applications exposed over HTTP, perfect for web services,
      IDEs, and tools with web interfaces.
    </p>
  );
};

const CloudVmAlert = () => {
  return (
    <p>
      Can be any cloud-init compatible image, but will only be accessible via
      SSH. Suitable for server workloads and CLI applications.
    </p>
  );
};
