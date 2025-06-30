import React from 'react';
import TemplatesTableLogic from '../../workspaces/Templates/TemplatesTableLogic/TemplatesTableLogic';

export interface ITemplateManagerProps {
  tenantNamespace: string;
  workspaceNamespace: string;
  workspaceName: string;
  role: string;
}

const TemplateManager: React.FC<ITemplateManagerProps> = ({
  tenantNamespace,
  workspaceNamespace,
  workspaceName,
  role,
}) => {
  return (
    <div>
      <TemplatesTableLogic
        tenantNamespace={tenantNamespace}
        workspaceNamespace={workspaceNamespace}
        workspaceName={workspaceName}
        role={role as any}
      />
    </div>
  );
};

export default TemplateManager;
