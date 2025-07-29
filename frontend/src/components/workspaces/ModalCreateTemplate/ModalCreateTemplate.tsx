import type { FC } from 'react';
import { useState, useEffect, useContext } from 'react';
import {
  Modal,
  Slider,
  Form,
  Input,
  Checkbox,
  Tooltip,
  AutoComplete,
  Select,
} from 'antd';
import { Button } from 'antd';
import type {
  CreateTemplateMutation,
  SharedVolumeMountsListItem,
} from '../../../generated-types';
import {
  EnvironmentType,
  useWorkspaceTemplatesQuery,
} from '../../../generated-types';
import type { FetchResult } from '@apollo/client';
import { ErrorContext } from '../../../errorHandling/ErrorContext';
import ShVolFormItem, { type ShVolFormItemValue } from './ShVolFormItem';

const alternativeHandle = { border: 'solid 2px #1c7afdd8' };

export type Image = {
  name: string;
  type: Array<ImageType>;
  registry: string;
};

type ImageType = EnvironmentType.VirtualMachine | EnvironmentType.Container | EnvironmentType.CloudVm | EnvironmentType.Standalone;

type Template = {
  name?: string;
  image?: string;
  registry?: string;
  imageType?: ImageType;
  persistent: boolean;
  mountMyDrive: boolean;
  gui: boolean;
  cpu: number;
  ram: number;
  disk: number;
  sharedVolumeMountInfos?: SharedVolumeMountsListItem[];
};

type Interval = {
  max: number;
  min: number;
};

type Valid = {
  name: { status: string; help?: string };
  image: { status: string; help?: string };
};
export interface IModalCreateTemplateProps {
  workspaceNamespace: string;
  template?: Template;
  images: Array<Image>;
  cpuInterval: Interval;
  ramInterval: Interval;
  diskInterval: Interval;
  show: boolean;
  setShow: (status: boolean) => void;
  submitHandler: (
    t: Template,
  ) => Promise<
    FetchResult<
      CreateTemplateMutation,
      Record<string, unknown>,
      Record<string, unknown>
    >
  >;
  loading: boolean;
  isPersonal?: boolean;
}

const getImageNoVer = (image: string) =>
  image.split(':').length === 2 ? image.split(':')[0] : image;

const isEmptyOrSpaces = (str: string) => !str || str.match(/^ *$/);

const ModalCreateTemplate: FC<IModalCreateTemplateProps> = ({ ...props }) => {
  const {
    show,
    setShow,
    cpuInterval,
    ramInterval,
    diskInterval,
    images,
    template,
    submitHandler,
    loading,
    workspaceNamespace,
    isPersonal,
  } = props;

  // Add "External image" to the options if personal workspace
  const imagesNoVersion = [
    ...(isPersonal ? ['**-- External image --**'] : []),
    ...images.map(x => getImageNoVer(x.name)),
  ];

  const [buttonDisabled, setButtonDisabled] = useState(true);

  const [formTemplate, setFormTemplate] = useState<Template>({
    name: template && template.name,
    image: template && template.image,
    registry: template && template.registry,
    imageType: template && template.imageType,
    persistent: template?.persistent ?? false,
    mountMyDrive: template?.mountMyDrive ?? true,
    gui: template?.gui ?? true,
    cpu: template ? template.cpu : cpuInterval.min,
    ram: template ? template.ram : ramInterval.min,
    disk: template ? template.disk : diskInterval.min,
    sharedVolumeMountInfos: template ? template.sharedVolumeMountInfos : [],
  });

  const [valid, setValid] = useState<Valid>({
    name: { status: 'success', help: undefined },
    image: { status: 'success', help: undefined },
  });

  const [imagesSearchOptions, setImagesSearchOptions] = useState<string[]>();

  useEffect(() => {
    if (
      formTemplate.name &&
      formTemplate.image &&
      formTemplate.imageType &&
      valid.name.status === 'success' &&
      (template
        ? template.name !== formTemplate.name ||
          template.image !== formTemplate.image ||
          template.imageType !== formTemplate.imageType ||
          template.gui !== formTemplate.gui ||
          template.persistent !== formTemplate.persistent ||
          template.cpu !== formTemplate.cpu ||
          template.ram !== formTemplate.ram ||
          template.disk !== formTemplate.disk ||
          JSON.stringify(template.sharedVolumeMountInfos) !==
            JSON.stringify(formTemplate.sharedVolumeMountInfos)
        : true)
    )
      setButtonDisabled(false);
    else setButtonDisabled(true);
  }, [formTemplate, template, valid.name.status]);

  const nameValidator = () => {
    if (formTemplate.name === '' || formTemplate.name === undefined) {
      setValid(old => {
        return {
          ...old,
          name: { status: 'error', help: 'Please insert template name' },
        };
      });
    } else if (
      !errorFetchTemplates &&
      !loadingFetchTemplates &&
      dataFetchTemplates?.templateList?.templates
        ?.map(t => t?.spec?.prettyName)
        .includes(formTemplate.name.trim())
    ) {
      setValid(old => {
        return {
          ...old,
          name: {
            status: 'error',
            help: 'This name has already been used in this workspace',
          },
        };
      });
    } else {
      setValid(old => {
        return {
          ...old,
          name: { status: 'success', help: undefined },
        };
      });
    }
  };

  const imageValidator = () => {
    if (isEmptyOrSpaces(formTemplate.image!)) {
      setValid(old => {
        return {
          ...old,
          image: { status: 'error', help: 'Insert an image' },
        };
      });
    } else {
      setValid(old => {
        return {
          ...old,
          image: { status: 'success', help: undefined },
        };
      });
    }
  };

  const [form] = Form.useForm();

  const fullLayout = {
    wrapperCol: { offset: 0, span: 24 },
  };

  const closehandler = () => {
    setShow(false);
  };

  const { apolloErrorCatcher } = useContext(ErrorContext);
  const {
    data: dataFetchTemplates,
    error: errorFetchTemplates,
    loading: loadingFetchTemplates,
    refetch: refetchTemplates,
  } = useWorkspaceTemplatesQuery({
    onError: apolloErrorCatcher,
    variables: { workspaceNamespace },
  });

  const onSubmit = () => {
    const shvolMounts: ShVolFormItemValue[] = form.getFieldValue('shvolss');
    const sharedVolumeMountInfos: SharedVolumeMountsListItem[] =
      shvolMounts.map(obj => ({
        sharedVolume: {
          namespace: obj.shvol.split('/')[0],
          name: obj.shvol.split('/')[1],
        },
        mountPath: obj.mountpath,
        readOnly: Boolean(obj.readonly),
      }));

    submitHandler({
      ...formTemplate,
      image: formTemplate.image === '**-- External image --**'
        ? formTemplate.registry  // Use registry for external images
        : images.find(i => getImageNoVer(i.name) === formTemplate.image)?.name ?? formTemplate.image,
      sharedVolumeMountInfos: sharedVolumeMountInfos,
    })
      .then(() => {
        setShow(false);
        setFormTemplate(old => {
          return { ...old, name: undefined };
        });
        form.setFieldsValue({
          templatename: undefined,
        });
      })
      .catch(apolloErrorCatcher);
  };

  // Track if "External image" is selected
  const isExternalImage = formTemplate.image === '**-- External image --**';

  // Environment type options for external images
  const environmentOptions = [
    { value: EnvironmentType.VirtualMachine, label: 'VirtualMachine' },
    { value: EnvironmentType.Container, label: 'Container' },
    { value: EnvironmentType.CloudVm, label: 'CloudVM' },
    { value: EnvironmentType.Standalone, label: 'Standalone' },
  ];

  return (
    <Modal
      destroyOnHidden={true}
      styles={{ body: { paddingBottom: '5px' } }}
      centered
      footer={null}
      title={template ? 'Modify template' : 'Create a new template'}
      open={show}
      onCancel={closehandler}
      width="600px"
    >
      <Form
        labelCol={{ span: 2 }}
        wrapperCol={{ span: 22 }}
        form={form}
        onSubmitCapture={onSubmit}
        initialValues={{
          templatename: formTemplate.name,
          image: formTemplate.image,
          imageType: formTemplate.imageType,
          cpu: formTemplate.cpu,
          ram: formTemplate.ram,
          disk: formTemplate.disk,
        }}
      >
        <Form.Item
          {...fullLayout}
          name="templatename"
          className="mt-1"
          required
          validateStatus={valid.name.status as 'success' | 'error'}
          help={valid.name.help}
          validateTrigger="onChange"
          rules={[
            {
              required: true,
              validator: nameValidator,
            },
          ]}
        >
          <Input
            onFocus={() => refetchTemplates({ workspaceNamespace })}
            onChange={e =>
              setFormTemplate(old => {
                return { ...old, name: e.target.value };
              })
            }
            placeholder="Insert template name"
            allowClear
          />
        </Form.Item>

        <div className="flex justify-between items-start inline mb-6">
          <Form.Item
            className="mb-4"
            {...fullLayout}
            style={{ width: '100%' }}
            name="image"
            required
            validateStatus={valid.image.status as 'success' | 'error'}
            help={valid.image.help}
            validateTrigger="onChange"
            rules={[
              {
                required: true,
                validator: imageValidator,
              },
            ]}
          >
            <AutoComplete
              options={imagesNoVersion.map(x => ({ value: x }))}
              onFocus={() => {
                if (!imagesSearchOptions?.length)
                  setImagesSearchOptions(imagesNoVersion!);
              }}
              onChange={value => {
                setImagesSearchOptions(
                  imagesNoVersion?.filter(s => s.includes(value)),
                );
                if (value !== formTemplate.image) {
                  if (value === '**-- External image --**') {
                    setFormTemplate(old => ({
                      ...old,
                      image: '**-- External image --**',
                      registry: '', // reset registry
                      imageType: EnvironmentType.Container,
                      persistent: false,
                      gui: true,
                    }));
                    form.setFieldsValue({
                      image: value,
                      imageType: EnvironmentType.Container,
                    });
                  } else {
                    const imageFound = images.find(
                      i => getImageNoVer(i.name) === value,
                    );
                    setFormTemplate(old => ({
                      ...old,
                      image: String(value),
                      registry: imageFound?.registry,
                      imageType:
                        imageFound?.type[0] ?? EnvironmentType.Container,
                      persistent: false,
                      gui: true,
                    }));
                    form.setFieldsValue({
                      image: value,
                      imageType:
                        imageFound?.type[0] ?? EnvironmentType.Container,
                    });
                  }
                }
              }}
              placeholder="Select an image"
            />
          </Form.Item>
        
          {isExternalImage && (
            <>
              <Form.Item
                className="mb-4"
                name="registry"
                required
                rules={[
                  { required: true, message: 'Please enter the container image' },
                  {
                    pattern: /^([a-z0-9]+([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]+([-a-z0-9]*[a-z0-9])?)*(\/[a-z0-9]+([-a-z0-9]*[a-z0-9])?)*)(:[a-z0-9]+)?$/,
                    message: 'Please enter a valid container image name',
                  },
                ]}
              >
                <Input
                  value={formTemplate.registry}
                  onChange={e =>
                    setFormTemplate(old => ({
                      ...old,
                      registry: e.target.value,
                    }))
                  }
                  placeholder="docker.io/library/ubuntu:22.04"
                />
              </Form.Item>
              
              <Form.Item
                className="mb-4"
                name="imageType"
                required
                rules={[
                  { required: true, message: 'Please select environment type' },
                ]}
              >
                <Select
                  value={formTemplate.imageType}
                  onChange={value => {
                    setFormTemplate(old => ({
                      ...old,
                      imageType: value,
                    }));
                    form.setFieldsValue({
                      imageType: value,
                    });
                  }}
                  options={environmentOptions}
                  placeholder="Select environment type"
                />
              </Form.Item>
            </>
          )}

          <Form.Item className="mb-4">
            <span>GUI:</span>
            <Checkbox
              className="ml-3"
              checked={formTemplate.gui}
              onChange={() =>
                setFormTemplate(old => {
                  return { ...old, gui: !old.gui };
                })
              }
            />
          </Form.Item>
          <Form.Item className="mb-4">
            <span>Persistent: </span>
            <Tooltip title="A persistent VM/container disk space won't be destroyed after being turned off.">
              <Checkbox
                className="ml-3"
                checked={formTemplate.persistent}
                onChange={() =>
                  setFormTemplate(old => {
                    return {
                      ...old,
                      persistent: !old.persistent,
                      disk: !old.persistent
                        ? template?.disk || diskInterval.min
                        : 0,
                    };
                  })
                }
              />
            </Tooltip>
          </Form.Item>
        </div>

        <Form.Item labelAlign="left" className="mt-10" label="CPU" name="cpu">
          <div className="sm:pl-3 pr-1">
            <Slider
              styles={{ handle: alternativeHandle }}
              defaultValue={formTemplate.cpu}
              tooltip={{ open: false }}
              value={formTemplate.cpu}
              onChange={(value: number) =>
                setFormTemplate(old => {
                  return { ...old, cpu: value };
                })
              }
              min={cpuInterval.min}
              max={cpuInterval.max}
              marks={{
                [cpuInterval.min]: `${cpuInterval.min}`,
                [formTemplate.cpu]: `${formTemplate.cpu}`,
                [cpuInterval.max]: `${cpuInterval.max}`,
              }}
              included={false}
              step={1}
              tipFormatter={(value?: number) => `${value} Core`}
            />
          </div>
        </Form.Item>
        <Form.Item labelAlign="left" label="RAM" name="ram">
          <div className="sm:pl-3 pr-1">
            <Slider
              styles={{ handle: alternativeHandle }}
              defaultValue={formTemplate.ram}
              tooltip={{ open: false }}
              value={formTemplate.ram}
              onChange={(value: number) =>
                setFormTemplate(old => {
                  return { ...old, ram: value };
                })
              }
              min={ramInterval.min}
              max={ramInterval.max}
              marks={{
                [ramInterval.min]: `${ramInterval.min}GB`,
                [formTemplate.ram]: `${formTemplate.ram}GB`,
                [ramInterval.max]: `${ramInterval.max}GB`,
              }}
              included={false}
              step={0.25}
              tipFormatter={(value?: number) => `${value} GB`}
            />
          </div>
        </Form.Item>
        <Form.Item
          labelAlign="left"
          label="DISK"
          name="disk"
          className={formTemplate.persistent ? '' : 'hidden'}
        >
          <div className="sm:pl-3 pr-1 ">
            <Slider
              styles={{ handle: alternativeHandle }}
              tooltip={{ open: false }}
              value={formTemplate.disk}
              defaultValue={formTemplate.disk}
              onChange={(value: number) =>
                setFormTemplate(old => {
                  return { ...old, disk: value };
                })
              }
              min={diskInterval.min}
              max={diskInterval.max}
              marks={{
                [diskInterval.min]: `${diskInterval.min}GB`,
                [formTemplate.disk]: `${formTemplate.disk}GB`,
                [diskInterval.max]: `${diskInterval.max}GB`,
              }}
              included={false}
              step={1}
              tipFormatter={(value?: number) => `${value} GB`}
            />
          </div>
        </Form.Item>

        <ShVolFormItem workspaceNamespace={workspaceNamespace} />

        <Form.Item {...fullLayout}>
          <div className="flex justify-center">
            {buttonDisabled ? (
              <Tooltip
                title={
                  template
                    ? 'Cannot modify the Template, please change the old parameters and fill all required fields'
                    : 'Cannot create the Template, please fill all required fields'
                }
              >
                <span className="cursor-not-allowed">
                  <Button
                    className="w-24 pointer-events-none"
                    disabled
                    htmlType="submit"
                    type="primary"
                    shape="round"
                    size="middle"
                  >
                    {template ? 'Modify' : 'Create'}
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button
                className="w-24"
                htmlType="submit"
                type="primary"
                shape="round"
                size="middle"
                loading={loading}
              >
                {!loading && (template ? 'Modify' : 'Create')}
              </Button>
            )}
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export type { Template };
export default ModalCreateTemplate;