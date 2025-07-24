import React from 'react';
import { Card, Progress, Row, Col, Statistic, Alert, Tag } from 'antd';
import {
  ThunderboltOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  HddOutlined,
} from '@ant-design/icons';
import {
  ResourceQuota,
  ResourceUsage,
  formatResourceValue,
  parseResourceString,
} from '../../../utils/quotaValidation';

export interface IQuotaOverviewProps {
  quota: ResourceQuota;
  usage: ResourceUsage;
  workspaceName?: string;
}

const QuotaOverview: React.FC<IQuotaOverviewProps> = ({
  quota,
  usage,
  workspaceName,
}) => {
  const calculatePercentage = (used: string, total: string): number => {
    const usedValue = parseResourceString(used);
    const totalValue = parseResourceString(total);
    return totalValue > 0 ? Math.round((usedValue / totalValue) * 100) : 0;
  };

  const getProgressStatus = (
    percentage: number
  ): 'success' | 'exception' | 'normal' | 'active' => {
    if (percentage >= 90) return 'exception';
    if (percentage >= 75) return 'active';
    return 'success';
  };

  const cpuPercentage = calculatePercentage(usage.cpu, quota.cpu);
  const memoryPercentage = calculatePercentage(usage.memory, quota.memory);
  const instancePercentage = Math.round(
    (usage.instances / quota.instances) * 100
  );
  const diskPercentage =
    quota.disk && usage.disk ? calculatePercentage(usage.disk, quota.disk) : 0;

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CloudServerOutlined />
          Resource Quota Overview
          {workspaceName && <Tag color="blue">{workspaceName}</Tag>}
        </div>
      }
      style={{ marginBottom: 16 }}
    >
      <Row gutter={[16, 16]}>
        {/* CPU Usage */}
        <Col xs={24} sm={12} lg={quota.disk ? 6 : 8}>
          <Card size="small">
            <Statistic
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ThunderboltOutlined />
                  CPU
                </div>
              }
              value={`${formatResourceValue(
                parseResourceString(usage.cpu),
                'cpu'
              )} / ${formatResourceValue(
                parseResourceString(quota.cpu),
                'cpu'
              )}`}
              precision={2}
            />
            <Progress
              percent={cpuPercentage}
              status={getProgressStatus(cpuPercentage)}
              size="small"
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>

        {/* Memory Usage */}
        <Col xs={24} sm={12} lg={quota.disk ? 6 : 8}>
          <Card size="small">
            <Statistic
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <DatabaseOutlined />
                  Memory
                </div>
              }
              value={`${formatResourceValue(
                parseResourceString(usage.memory),
                'memory'
              )} / ${formatResourceValue(
                parseResourceString(quota.memory),
                'memory'
              )}`}
            />
            <Progress
              percent={memoryPercentage}
              status={getProgressStatus(memoryPercentage)}
              size="small"
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>

        {/* Instance Usage */}
        <Col xs={24} sm={12} lg={quota.disk ? 6 : 8}>
          <Card size="small">
            <Statistic
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CloudServerOutlined />
                  Instances
                </div>
              }
              value={`${usage.instances} / ${quota.instances}`}
            />
            <Progress
              percent={instancePercentage}
              status={getProgressStatus(instancePercentage)}
              size="small"
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>

        {/* Disk Usage (only if available) */}
        {quota.disk && usage.disk && (
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title={
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <HddOutlined />
                    Disk
                  </div>
                }
                value={`${formatResourceValue(
                  parseResourceString(usage.disk),
                  'disk'
                )} / ${formatResourceValue(
                  parseResourceString(quota.disk),
                  'disk'
                )}`}
              />
              <Progress
                percent={diskPercentage}
                status={getProgressStatus(diskPercentage)}
                size="small"
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* Alerts for high usage */}
      {(cpuPercentage >= 90 ||
        memoryPercentage >= 90 ||
        instancePercentage >= 90) && (
        <Alert
          message="Resource Usage Warning"
          description="One or more resources are approaching their quota limits. Consider reviewing your resource usage."
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      {(cpuPercentage >= 100 ||
        memoryPercentage >= 100 ||
        instancePercentage >= 100) && (
        <Alert
          message="Quota Limit Reached"
          description="You have reached the quota limit for one or more resources. New deployments may fail."
          type="error"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};

export default QuotaOverview;
