import type { FC } from 'react';
import { useState, useContext, useEffect } from 'react';
import { Modal, Form, Input, Tooltip } from 'antd';
import { Button } from 'antd';
import type {
  CreateTemplateMutation,
  ImagesQuery,
} from '../../../generated-types';
import {
  EnvironmentType,
  useWorkspaceTemplatesQuery,
  useImagesQuery,
  useWorkspaceSharedVolumesQuery,
} from '../../../generated-types';
import type { FetchResult } from '@apollo/client';
import { ErrorContext } from '../../../errorHandling/ErrorContext';
import { EnvFormItem, type TemplateEnvironment } from './EnvFormItem';
import { makeGuiSharedVolume } from '../../../utilsLogic';
import type { SharedVolume } from '../../../utils';

export type Image = {
  name: string;
  type: Array<ImageType>;
  registry: string;
};

export type ImageList = {
  name: string;
  registryName: string;
  images: Array<{
    name: string;
    versions: Array<string>;
  }>;
};

type ImageType =
  | EnvironmentType.VirtualMachine
  | EnvironmentType.Container
  | EnvironmentType.CloudVm
  | EnvironmentType.Standalone;

type Template = {
  name: string;
  environments: TemplateEnvironment[];
};

// type Environment = {
//   name: string;
//   image?: string;
//   registry?: string;
//   environmentType?: ImageType;
//   imageList?: string;
//   persistent: boolean;
//   mountMyDrive: boolean;
//   gui: boolean;
//   cpu: number;
//   ram: number;
//   disk: number;
//   sharedVolumeMounts?: SharedVolumeMountsListItem[];
// };

type Interval = {
  max: number;
  min: number;
};

// Get images from selected image list
const getImagesFromList = (imageList: ImageList): Image[] => {
  const images: Image[] = [];

  imageList.images.forEach(img => {
    const versionsInImageName: Image[] = img.versions.map(v => ({
      name: `${img.name}:${v}`,
      type: [],
      registry: imageList.registryName,
    }));

    images.push(...versionsInImageName);
  });

  return images;
};

// Process image lists from the query
const getImageLists = (data: ImagesQuery): ImageList[] => {
  if (!data?.imageList?.images) return [];

  return data.imageList.images
    .filter(img => img?.spec?.registryName && img?.spec?.images)
    .map(img => ({
      name: img!.spec!.registryName,
      registryName: img!.spec!.registryName,
      images: img!
        .spec!.images.filter(i => i?.name && i?.versions)
        .map(i => ({
          name: i!.name,
          versions: i!.versions.filter(v => v !== null) as string[],
        })),
    }));
};

export interface IModalCreateTemplateProps {
  workspaceNamespace: string;
  template?: Template;
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

const ModalCreateTemplate: FC<IModalCreateTemplateProps> = ({ ...props }) => {
  const {
    show,
    setShow,
    cpuInterval,
    ramInterval,
    diskInterval,
    template,
    submitHandler,
    loading,
    workspaceNamespace,
    isPersonal,
  } = props;

  const { apolloErrorCatcher } = useContext(ErrorContext);

  // Fetch all image lists
  const { data: dataImages } = useImagesQuery({
    variables: {},
    onError: apolloErrorCatcher,
  });

  const [form] = Form.useForm<Template>();

  const getDefaultEnvironment = (envCount: number): TemplateEnvironment => {
    const name = `env-${envCount}`;

    return {
      name: name,
      image: '',
      registry: '',
      environmentType: EnvironmentType.VirtualMachine,
      persistent: false,
      gui: true,
      cpu: cpuInterval.min,
      ram: ramInterval.min,
      disk: diskInterval.min,
      sharedVolumeMounts: [],
    };
  };

  const getInitialTemplate = (tmpl?: Template): Template => {
    if (!tmpl) {
      return {
        name: '',
        environments: [getDefaultEnvironment(1)],
      };
    }

    return tmpl;
  };

  // const [formTemplate, setFormTemplate] = useState<Template>(
  //   getInitialTemplate(template),
  // );

  const [sharedVolumes, setDataShVols] = useState<SharedVolume[]>([]);

  useWorkspaceSharedVolumesQuery({
    variables: { workspaceNamespace },
    onError: apolloErrorCatcher,
    onCompleted: data =>
      setDataShVols(
        data.sharedvolumeList?.sharedvolumes
          ?.map(sv => makeGuiSharedVolume(sv))
          .sort((a, b) =>
            (a.prettyName ?? '').localeCompare(b.prettyName ?? ''),
          ) ?? [],
      ),
    fetchPolicy: 'network-only',
  });

  const [buttonDisabled, setButtonDisabled] = useState(true);

  useEffect(() => {
    // let isValid = true;
    // if (!formTemplate.name || valid.status === 'error') {
    //   isValid = false;
    // } else {
    //   for (const env of formTemplate.environments) {
    //     if (!env.name || !env.image) {
    //       isValid = false;
    //       break;
    //     }
    //   }
    // }
    // setButtonDisabled(!isValid);
    // if (
    //   formTemplate.name &&
    //   formTemplate.imageType &&
    //   valid.name.status === 'success' &&
    //   // For VMs, check if image is selected from the list
    //   (formTemplate.imageType === EnvironmentType.VirtualMachine
    //     ? formTemplate.image && formTemplate.imageList
    //     : formTemplate.registry) && // For others, check if external image is provided
    //   (template
    //     ? template.name !== formTemplate.name ||
    //       template.image !== formTemplate.image ||
    //       template.imageType !== formTemplate.imageType ||
    //       template.imageList !== formTemplate.imageList ||
    //       template.gui !== formTemplate.gui ||
    //       template.persistent !== formTemplate.persistent ||
    //       template.cpu !== formTemplate.cpu ||
    //       template.ram !== formTemplate.ram ||
    //       template.disk !== formTemplate.disk ||
    //       template.registry !== formTemplate.registry ||
    //       JSON.stringify(template.sharedVolumeMountInfos) !==
    //         JSON.stringify(formTemplate.sharedVolumeMountInfos)
    //     : true)
    // )
    //   setButtonDisabled(false);
    // else setButtonDisabled(true);
  }, [form]);

  const validateName = async (_: unknown, name: string) => {
    if (!dataFetchTemplates || loadingFetchTemplates || errorFetchTemplates) {
      throw new Error('Error fetching templates');
    }

    if (!dataFetchTemplates.templateList) return;

    const trimmedName = name.trim().toLowerCase();
    const duplicateIndex = dataFetchTemplates.templateList.templates.findIndex(
      t => {
        return t?.spec?.prettyName?.toLowerCase() === trimmedName;
      },
    );

    if (duplicateIndex !== -1) {
      throw new Error(`This name has already been used in this workspace`);
    }
  };

  const fullLayout = {
    wrapperCol: { offset: 0, span: 24 },
  };

  const closehandler = () => {
    setShow(false);
  };

  const {
    data: dataFetchTemplates,
    error: errorFetchTemplates,
    loading: loadingFetchTemplates,
  } = useWorkspaceTemplatesQuery({
    onError: error => {
      console.error(
        'ModalCreateTemplate useWorkspaceTemplatesQuery error:',
        error,
        'workspaceNamespace:',
        workspaceNamespace,
      );
      apolloErrorCatcher(error);
    },
    variables: { workspaceNamespace },
  });

  const onSubmit = () => {
    console.log('submit');

    // // prepare sharedVolumeMountInfos for submit (empty for personal templates)
    // let sharedVolumeMountInfos: SharedVolumeMountsListItem[] = [];
    // if (!isPersonal) {
    //   const shvolMounts: ShVolFormItemValue[] =
    //     form.getFieldValue('shvolss') ?? [];
    //   sharedVolumeMountInfos = (shvolMounts || []).map(obj => ({
    //     sharedVolume: {
    //       namespace: String(obj.shvol).split('/')[0],
    //       name: String(obj.shvol).split('/')[1],
    //     },
    //     mountPath: obj.mountpath,
    //     readOnly: Boolean(obj.readonly),
    //   }));
    // }
    // // Determine the final image URL
    // let finalImage = '';
    // if (formTemplate.imageType === EnvironmentType.VirtualMachine) {
    //   // For VMs, use the selected image from internal registry
    //   const selectedImage = availableImages.find(
    //     i => getImageNoVer(i.name) === formTemplate.image,
    //   );
    //   if (selectedImage) {
    //     finalImage = `registry.internal.crownlabs.polito.it/${selectedImage.name}`;
    //   } else if (formTemplate.image) {
    //     finalImage = formTemplate.image.includes('/')
    //       ? formTemplate.image
    //       : `registry.internal.crownlabs.polito.it/${formTemplate.image}`;
    //   }
    // } else {
    //   // For other types, use the external image
    //   finalImage = formTemplate.registry || '';
    //   // If it doesn't include a registry, default to internal registry
    //   if (finalImage && !finalImage.includes('/')) {
    //     finalImage = `registry.internal.crownlabs.polito.it/${finalImage}`;
    //   }
    // }
    // const templateToSubmit = {
    //   ...formTemplate,
    //   image: finalImage,
    //   sharedVolumeMounts: sharedVolumeMountInfos,
    // };
    // submitHandler(templateToSubmit)
    //   .then(_result => {
    //     setShow(false);
    //     setFormTemplate(old => {
    //       return {
    //         ...old,
    //         name: undefined,
    //         imageList: undefined,
    //         image: undefined,
    //         imageType: undefined,
    //         registry: undefined,
    //       };
    //     });
    //     setAvailableImages([]);
    //     form.setFieldsValue({
    //       templatename: undefined,
    //       imageList: undefined,
    //       image: undefined,
    //       imageType: undefined,
    //       registry: undefined,
    //     });
    //   })
    //   .catch(error => {
    //     console.error('ModalCreateTemplate submitHandler error:', error);
    //     apolloErrorCatcher(error);
    //   });
  };

  // Initialize available images when editing an existing template
  // useEffect(() => {
  //   console.log('template trigger');

  //   // if (
  //   //   template?.environments.some(
  //   //     env => env.environmentType === EnvironmentType.VirtualMachine,
  //   //   ) &&
  //   //   imageLists.length
  //   // ) {
  //   //   const internalRegistry = imageLists.find(
  //   //     list => list.registryName === 'registry.internal.crownlabs.polito.it',
  //   //   );

  //   //   if (internalRegistry) {
  //   //     const imgs = getImagesFromList(internalRegistry);
  //   //     const dedupedImgs = imgs.reduce<Image[]>((acc, img) => {
  //   //       const base = getImageNoVer(img.name);
  //   //       if (!acc.some(a => getImageNoVer(a.name) === base)) acc.push(img);
  //   //       return acc;
  //   //     }, []);
  //   //     setAvailableImages(dedupedImgs);
  //   //   }
  //   // }
  // }, [template, imageLists]);

  const [availableImages, setAvailableImages] = useState<Image[]>([]);

  useEffect(() => {
    console.log('get available images');

    if (!dataImages) {
      setAvailableImages([]);
      return;
    }

    const imageLists = getImageLists(dataImages);
    const internalRegistry = imageLists.find(
      list => list.registryName === 'registry.internal.crownlabs.polito.it',
    );

    if (!internalRegistry) {
      setAvailableImages([]);
      return;
    }

    setAvailableImages(getImagesFromList(internalRegistry));
  }, [dataImages]);

  // // Handle image selection (for VMs only)
  // const handleImageChange = (envIdx: number, image: string) => {
  //   if (image === formTemplate.environments[envIdx].image) return;

  //   const imageFound = availableImages.find(
  //     i => getImageNoVer(i.name) === image,
  //   );

  //   setFormTemplate(old => ({
  //     ...old,
  //     environments: old.environments.map((env, idx) => {
  //       if (idx === envIdx) {
  //         return {
  //           ...env,
  //           image: image,
  //           registry: imageFound?.registry,
  //         };
  //       }
  //       return env;
  //     }),
  //   }));

  //   form.setFieldsValue({
  //     environments: formTemplate.environments.map((env, idx) => {
  //       if (idx === envIdx) {
  //         return {
  //           ...env,
  //           image: image,
  //           registry: imageFound?.registry,
  //         };
  //       }
  //       return env;
  //     }),
  //   });
  // };

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
        initialValues={getInitialTemplate(template)}
      >
        <Form.Item
          {...fullLayout}
          name="name"
          className="mt-1"
          required
          validateTrigger="onChange"
          rules={[
            {
              required: true,
              message: 'Please enter template name',
            },
            {
              validator: validateName,
            },
          ]}
        >
          <Input placeholder="Insert template name" allowClear />
        </Form.Item>

        <EnvFormItem
          availableImages={availableImages}
          resources={{
            cpu: cpuInterval,
            ram: ramInterval,
            disk: diskInterval,
          }}
          sharedVolumes={sharedVolumes}
          isPersonal={isPersonal === undefined ? false : isPersonal}
        />

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
