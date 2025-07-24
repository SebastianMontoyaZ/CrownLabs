import React, { useState, useContext } from 'react';
import { Card, Tabs, Button, Space, Alert } from 'antd';
import {
  AppstoreOutlined,
  ToolOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { TenantContext } from '../../../../contexts/TenantContext';
import QuotaOverview from '../../../quota/QuotaOverview/QuotaOverview';
import HelmValidator from '../../../templates/HelmValidator/HelmValidator';
import TemplatesTableLogic from '../TemplatesTableLogic/TemplatesTableLogic';
import { validateResourceAgainstQuota } from '../../../../utils/quotaValidation';
import { WorkspaceRole } from '../../../../utils';

export interface ITemplateManagerProps {
  tenantNamespace: string;
  workspaceNamespace: string;
  workspaceName: string;
  role: WorkspaceRole; // ✅ Fixed: Use WorkspaceRole enum instead of string
}

const TemplateManager: React.FC<ITemplateManagerProps> = ({
  tenantNamespace,
  workspaceNamespace,
  workspaceName,
  role,
}) => {
  const { data: tenantData } = useContext(TenantContext);
  const [activeTab, setActiveTab] = useState('templates');

  // Get tenant-level quota
  const tenantQuota = tenantData?.tenant?.status?.quota;

  // Mock current usage for quota display
  const currentUsage = {
    cpu: '2',
    memory: '4Gi',
    instances: 1,
  };

  const tabItems = [
    {
      key: 'templates',
      label: (
        <span>
          <AppstoreOutlined />
          Templates
        </span>
      ),
      children: (
        <TemplatesTableLogic
          tenantNamespace={tenantNamespace}
          workspaceNamespace={workspaceNamespace}
          workspaceName={workspaceName}
          role={role} // ✅ Now correctly typed as WorkspaceRole
        />
      ),
    },
    {
      key: 'validator',
      label: (
        <span>
          <ToolOutlined />
          Helm Validator
        </span>
      ),
      children: (
        <HelmValidator
          quotaValidation={
            tenantQuota
              ? {
                  enabled: true,
                  quota: {
                    cpu: tenantQuota.cpu || '0',
                    memory: tenantQuota.memory || '0Gi',
                    instances: tenantQuota.instances || 0,
                  },
                  currentUsage,
                }
              : { enabled: false, quota: null, currentUsage: null }
          }
        />
      ),
    },
  ];

  return (
    <div>
      {tenantQuota && (
        <QuotaOverview
          quota={{
            cpu: tenantQuota.cpu || '0',
            memory: tenantQuota.memory || '0Gi',
            instances: tenantQuota.instances || 0,
          }}
          usage={currentUsage}
          workspaceName={workspaceName}
        />
      )}

      <Card style={{ marginTop: 16 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
};

export default TemplateManager;
