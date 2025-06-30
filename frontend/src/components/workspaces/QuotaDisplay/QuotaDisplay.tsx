import { Row, Col, Typography, Space, Progress } from 'antd';
import {
  DesktopOutlined,
  CloudOutlined,
  DatabaseOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { FC } from 'react';
import { useContext } from 'react';
import { TenantContext } from '../../../contexts/TenantContext';
import './QuotaDisplay.less';

const { Text, Title } = Typography;

export interface IQuotaDisplayProps {
  tenantNamespace: string;
}

const QuotaDisplay: FC<IQuotaDisplayProps> = ({ tenantNamespace }) => {
  const { data: tenantData } = useContext(TenantContext);

  // Get actual quota data from tenant context
  const quota = tenantData?.tenant?.status?.quota;

  // Default values if quota is not available
  const quotaData = {
    cpu: quota?.cpu ? parseInt(quota.cpu) : 8,
    memory: quota?.memory ? parseInt(quota.memory.replace('Gi', '')) : 32,
    instances: quota?.instances || 10,
    usedCpu: 2, // Mock usage - should come from actual usage data
    usedMemory: 8, // Mock usage - should come from actual usage data
    usedInstances: 3, // Mock usage - should come from actual usage data
  };

  const cpuPercent = Math.round((quotaData.usedCpu / quotaData.cpu) * 100);
  const memoryPercent = Math.round(
    (quotaData.usedMemory / quotaData.memory) * 100
  );
  const instancesPercent = Math.round(
    (quotaData.usedInstances / quotaData.instances) * 100
  );

  const getProgressColor = (percent: number) => {
    if (percent > 80) return '#ff4d4f';
    if (percent > 60) return '#faad14';
    return '#52c41a';
  };

  return (
    <div className="quota-display-container">
      <Row align="middle" justify="space-between">
        <Col xs={24} sm={6}>
          <Space direction="vertical" size="small">
            <Space>
              <InfoCircleOutlined className="primary-color-fg" />
              <Title level={5} style={{ margin: 0 }}>
                Workspace Resources
              </Title>
            </Space>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Available quota for this workspace
            </Text>
          </Space>
        </Col>

        <Col xs={24} sm={18}>
          <Row gutter={[24, 16]} justify="end">
            <Col xs={24} sm={8}>
              <div className="quota-metric">
                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: '100%' }}
                >
                  <Space>
                    <DesktopOutlined className="primary-color-fg" />
                    <Text strong>
                      {quotaData.usedCpu}/{quotaData.cpu}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      CPU cores
                    </Text>
                  </Space>
                  <Progress
                    percent={cpuPercent}
                    size="small"
                    strokeColor={getProgressColor(cpuPercent)}
                    showInfo={false}
                  />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {cpuPercent}% used
                  </Text>
                </Space>
              </div>
            </Col>

            <Col xs={24} sm={8}>
              <div className="quota-metric">
                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: '100%' }}
                >
                  <Space>
                    <DatabaseOutlined className="success-color-fg" />
                    <Text strong>
                      {quotaData.usedMemory}/{quotaData.memory}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      GB RAM
                    </Text>
                  </Space>
                  <Progress
                    percent={memoryPercent}
                    size="small"
                    strokeColor={getProgressColor(memoryPercent)}
                    showInfo={false}
                  />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {memoryPercent}% used
                  </Text>
                </Space>
              </div>
            </Col>

            <Col xs={24} sm={8}>
              <div className="quota-metric">
                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: '100%' }}
                >
                  <Space>
                    <CloudOutlined className="warning-color-fg" />
                    <Text strong>
                      {quotaData.usedInstances}/{quotaData.instances}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Instances
                    </Text>
                  </Space>
                  <Progress
                    percent={instancesPercent}
                    size="small"
                    strokeColor={getProgressColor(instancesPercent)}
                    showInfo={false}
                  />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {instancesPercent}% used
                  </Text>
                </Space>
              </div>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default QuotaDisplay;
