import { useApplyTemplateMutation } from '../../../generated-types';

export const useCreateTemplateFromYaml = () => {
  const [applyTemplateMutation, { loading, error }] =
    useApplyTemplateMutation();

  const createTemplateFromYaml = async ({
    yaml,
    workspaceNamespace,
  }: {
    yaml: string;
    workspaceNamespace: string;
  }) => {
    // TODO: This is a placeholder implementation
    // We need to parse the YAML and convert it to the expected format
    // For now, using dummy values to make it compile
    return applyTemplateMutation({
      variables: {
        templateId: 'template-from-yaml',
        workspaceNamespace,
        patchJson: JSON.stringify({}), // This should be the parsed YAML as JSON patch
        manager: 'manual', // This might need to be dynamic
      },
    });
  };

  return { createTemplateFromYaml, loading, error };
};
