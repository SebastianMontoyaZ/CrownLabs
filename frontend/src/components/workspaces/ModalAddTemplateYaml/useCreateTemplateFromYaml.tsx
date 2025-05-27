import { useApplyTemplateMutation } from '../../../generated-types';

export const useCreateTemplateFromYaml = () => {
  const [applyTemplateMutation, { loading, error }] = useApplyTemplateMutation();

  const createTemplateFromYaml = async ({
    yaml,
    workspaceNamespace,
  }: {
    yaml: string;
    workspaceNamespace: string;
  }) => {
    return applyTemplateMutation({
      variables: {
        yaml,
        workspaceNamespace,
      },
    });
  };

  return { createTemplateFromYaml, loading, error };
};