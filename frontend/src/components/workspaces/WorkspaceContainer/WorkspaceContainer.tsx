import React, { useState, useContext } from 'react';
import { Card, Tabs, Alert, Spin } from 'antd';
import {
  AppstoreOutlined,
  CloudServerOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { TenantContext } from '../../../contexts/TenantContext';
import TemplateManager from '../Templates/TemplateManager/TemplateManager';
import QuotaOverview from '../../quota/QuotaOverview/QuotaOverview';
import { WorkspaceRole } from '../../../utils';

export interface IWorkspaceContainerProps {
  tenantNamespace: string;
  workspace: {
    name: string;
    namespace: string;
    prettyName: string;
  };
}

const WorkspaceContainer: React.FC<IWorkspaceContainerProps> = ({
  tenantNamespace,
  workspace,
}) => {
  const { data: tenantData, loading } = useContext(TenantContext);
  const [activeTab, setActiveTab] = useState('templates');

  if (loading) {
    return <Spin size="large" />;
  }

  // Get role from tenant data and convert to WorkspaceRole enum
  const currentWorkspace = tenantData?.tenant?.spec?.workspaces?.find(
    ws =>
      ws &&
      ws.workspaceWrapperTenantV1alpha2?.itPolitoCrownlabsV1alpha1Workspace
        ?.status?.namespace?.name === workspace.namespace
  );

  const roleString = currentWorkspace?.role || 'user';

  // Convert string to WorkspaceRole enum
  const userRole: WorkspaceRole = (() => {
    switch (roleString.toLowerCase()) {
      case 'manager':
        return WorkspaceRole.manager;
      case 'candidate':
        return WorkspaceRole.candidate;
      case 'user':
      default:
        return WorkspaceRole.user;
    }
  })();

  const isManager = userRole === WorkspaceRole.manager;

  // ✅ Fixed: Get quota from tenant level instead of workspace spec
  const tenantQuota = tenantData?.tenant?.status?.quota;

  // Mock current usage for now - in real implementation, this would come from resource usage query
  const currentUsage = {
    cpu: '2',
    memory: '4Gi',
    instances: 1,
  };

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <CloudServerOutlined />
          Overview
        </span>
      ),
      children: (
        <div>
          {tenantQuota && (
            <QuotaOverview
              quota={{
                cpu: tenantQuota.cpu || '0',
                memory: tenantQuota.memory || '0Gi',
                instances: tenantQuota.instances || 0,
              }}
              usage={currentUsage}
              workspaceName={workspace.name}
            />
          )}

          <Card title="Workspace Information" style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Name:</strong> {workspace.prettyName}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Namespace:</strong> {workspace.namespace}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Role:</strong> {roleString}
            </div>
            <div>
              <strong>Type:</strong>{' '}
              {workspace.name.startsWith('personal-') ? 'Personal' : 'Shared'}
            </div>
          </Card>
        </div>
      ),
    },
    {
      key: 'templates',
      label: (
        <span>
          <AppstoreOutlined />
          Templates
        </span>
      ),
      children: (
        <TemplateManager
          tenantNamespace={tenantNamespace}
          workspaceNamespace={workspace.namespace}
          workspaceName={workspace.name}
          role={userRole}
        />
      ),
    },
  ];

  // Add settings tab for managers
  if (isManager) {
    tabItems.push({
      key: 'settings',
      label: (
        <span>
          <SettingOutlined />
          Settings
        </span>
      ),
      children: (
        <Card title="Workspace Settings">
          <Alert
            message="Settings Panel"
            description="Workspace settings functionality will be implemented here."
            type="info"
            showIcon
          />
        </Card>
      ),
    });
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2>{workspace.prettyName}</h2>
        <p style={{ color: '#666', margin: 0 }}>
          Manage templates and resources for this workspace
        </p>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </div>
  );
};

export default WorkspaceContainer;
