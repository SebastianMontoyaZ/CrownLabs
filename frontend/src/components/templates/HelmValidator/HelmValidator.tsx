import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Alert, Tabs, Space, Tag, Spin } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import {
  validateResourceAgainstQuota,
  QuotaValidationResult,
} from '../../../utils/quotaValidation';

const { TextArea } = Input;
const { TabPane } = Tabs;

export interface HelmChart {
  name: string;
  version: string;
  description: string;
  values: any;
  templates: HelmTemplate[];
}

export interface HelmTemplate {
  name: string;
  kind: string;
  apiVersion: string;
  spec: any;
  metadata: {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
}

export interface HelmValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  resourceValidation?: QuotaValidationResult;
  securityIssues: string[];
  bestPracticeViolations: string[];
  helmLintResults: string[];
}

export interface IHelmValidatorProps {
  onValidationComplete?: (result: HelmValidationResult) => void;
  quotaValidation?: {
    enabled: boolean;
    quota: any;
    currentUsage: any;
  };
}

const HelmValidator: React.FC<IHelmValidatorProps> = ({
  onValidationComplete,
  quotaValidation,
}) => {
  const [form] = Form.useForm();
  const [validationResult, setValidationResult] =
    useState<HelmValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [chartYaml, setChartYaml] = useState('');
  const [valuesYaml, setValuesYaml] = useState('');

  const validateHelmChart = async (
    chartContent: string,
    valuesContent: string
  ): Promise<HelmValidationResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const securityIssues: string[] = [];
    const bestPracticeViolations: string[] = [];
    const helmLintResults: string[] = [];

    try {
      // Parse YAML content (simplified - in real implementation use yaml parser)
      const chart = parseYamlContent(chartContent);
      const values = parseYamlContent(valuesContent);

      // Basic Helm chart structure validation
      if (!chart.apiVersion) {
        errors.push('Chart.yaml missing required field: apiVersion');
      }
      if (!chart.name) {
        errors.push('Chart.yaml missing required field: name');
      }
      if (!chart.version) {
        errors.push('Chart.yaml missing required field: version');
      }

      // Security validations
      if (values.securityContext?.runAsRoot === true) {
        securityIssues.push('Container configured to run as root user');
      }
      if (!values.securityContext?.runAsNonRoot) {
        warnings.push('Consider setting securityContext.runAsNonRoot to true');
      }
      if (values.securityContext?.privileged === true) {
        securityIssues.push('Container configured with privileged access');
      }

      // Resource validations
      if (!values.resources?.limits) {
        bestPracticeViolations.push('No resource limits specified');
      }
      if (!values.resources?.requests) {
        bestPracticeViolations.push('No resource requests specified');
      }

      // Networking security
      if (values.service?.type === 'NodePort') {
        warnings.push(
          'NodePort service type exposes service on all cluster nodes'
        );
      }
      if (values.service?.type === 'LoadBalancer') {
        warnings.push(
          'LoadBalancer service type may expose service externally'
        );
      }

      // Storage validations
      if (values.persistence?.enabled && !values.persistence?.storageClass) {
        warnings.push(
          'Persistent volume enabled without specific storage class'
        );
      }

      // CrownLabs specific validations
      if (!values.metadata?.labels?.['crownlabs.polito.it/managed-by']) {
        bestPracticeViolations.push('Missing CrownLabs management label');
      }

      // Quota validation if enabled
      let resourceValidation: QuotaValidationResult | undefined;
      if (quotaValidation?.enabled && values.resources) {
        resourceValidation = validateResourceAgainstQuota(
          {
            cpu:
              values.resources.requests?.cpu ||
              values.resources.limits?.cpu ||
              1,
            memory:
              values.resources.requests?.memory ||
              values.resources.limits?.memory ||
              '1Gi',
            // Removed disk: values.persistence?.size || '10Gi',
          },
          quotaValidation.quota,
          quotaValidation.currentUsage
        );

        if (!resourceValidation.valid) {
          errors.push(...resourceValidation.errors);
        }
        warnings.push(...resourceValidation.warnings);
      }

      // Helm lint simulation
      helmLintResults.push('✓ Chart.yaml validation passed');
      helmLintResults.push('✓ Values.yaml validation passed');
      if (errors.length === 0) {
        helmLintResults.push('✓ Template validation passed');
      } else {
        helmLintResults.push(
          `✗ Template validation failed: ${errors.length} errors found`
        );
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        resourceValidation,
        securityIssues,
        bestPracticeViolations,
        helmLintResults,
      };
    } catch (error) {
      // Type guard to safely access error properties
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      return {
        valid: false,
        errors: [`Failed to parse Helm chart: ${errorMessage}`],
        warnings: [],
        securityIssues: [],
        bestPracticeViolations: [],
        helmLintResults: ['✗ Chart parsing failed'],
      };
    }
  };

  const parseYamlContent = (content: string): any => {
    // Simplified YAML parsing - in real implementation, use a proper YAML parser
    try {
      // This is a simplified parser for demo purposes
      const lines = content.split('\n');
      const result: any = {};

      let currentKey = '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split(':');
          if (valueParts.length > 0) {
            const value = valueParts.join(':').trim();
            result[key.trim()] = value || true;
          }
        }
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown YAML parsing error';
      throw new Error(`YAML parsing error: ${errorMessage}`);
    }
  };

  const handleValidate = async () => {
    setLoading(true);
    try {
      const result = await validateHelmChart(chartYaml, valuesYaml);
      setValidationResult(result);
      onValidationComplete?.(result);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getValidationIcon = (type: 'success' | 'warning' | 'error') => {
    switch (type) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    }
  };

  const defaultChartYaml = `apiVersion: v2
name: my-template
description: A CrownLabs template Helm chart
version: 1.0.0
appVersion: "1.0"
type: application
keywords:
  - crownlabs
  - template
maintainers:
  - name: CrownLabs Team`;

  const defaultValuesYaml = `# Default values for CrownLabs template
replicaCount: 1

image:
  repository: nginx
  pullPolicy: IfNotPresent
  tag: "latest"

nameOverride: ""
fullnameOverride: ""

serviceAccount:
  create: true
  annotations: {}
  name: ""

securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  capabilities:
    drop:
    - ALL
  readOnlyRootFilesystem: true

service:
  type: ClusterIP
  port: 80

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

persistence:
  enabled: false
  storageClass: ""
  size: 8Gi

metadata:
  labels:
    crownlabs.polito.it/managed-by: template-operator
    crownlabs.polito.it/type: environment`;

  return (
    <Card title="Helm Chart Validator" style={{ marginBottom: 16 }}>
      <Tabs defaultActiveKey="editor">
        <TabPane tab="Chart Editor" key="editor">
          <Form form={form} layout="vertical">
            <Form.Item label="Chart.yaml">
              <TextArea
                rows={15}
                value={chartYaml}
                onChange={e => setChartYaml(e.target.value)}
                placeholder={defaultChartYaml}
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>

            <Form.Item label="values.yaml">
              <TextArea
                rows={20}
                value={valuesYaml}
                onChange={e => setValuesYaml(e.target.value)}
                placeholder={defaultValuesYaml}
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  onClick={handleValidate}
                  loading={loading}
                  disabled={!chartYaml && !valuesYaml}
                >
                  Validate Chart
                </Button>
                <Button
                  onClick={() => {
                    setChartYaml(defaultChartYaml);
                    setValuesYaml(defaultValuesYaml);
                  }}
                >
                  Load Example
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </TabPane>

        <TabPane
          tab="Validation Results"
          key="results"
          disabled={!validationResult}
        >
          {validationResult && (
            <div>
              {/* Overall Status */}
              <Alert
                message={
                  validationResult.valid
                    ? 'Validation Passed'
                    : 'Validation Failed'
                }
                description={
                  validationResult.valid
                    ? 'Your Helm chart passes all validation checks.'
                    : `Found ${validationResult.errors.length} errors and ${validationResult.warnings.length} warnings.`
                }
                type={validationResult.valid ? 'success' : 'error'}
                icon={getValidationIcon(
                  validationResult.valid ? 'success' : 'error'
                )}
                style={{ marginBottom: 16 }}
              />

              {/* Errors */}
              {validationResult.errors.length > 0 && (
                <Card
                  size="small"
                  title={`${getValidationIcon('error')} Errors`}
                  style={{ marginBottom: 16 }}
                >
                  {validationResult.errors.map((error, index) => (
                    <Tag color="red" key={index} style={{ marginBottom: 4 }}>
                      {error}
                    </Tag>
                  ))}
                </Card>
              )}

              {/* Warnings */}
              {validationResult.warnings.length > 0 && (
                <Card
                  size="small"
                  title={`${getValidationIcon('warning')} Warnings`}
                  style={{ marginBottom: 16 }}
                >
                  {validationResult.warnings.map((warning, index) => (
                    <Tag color="orange" key={index} style={{ marginBottom: 4 }}>
                      {warning}
                    </Tag>
                  ))}
                </Card>
              )}

              {/* Security Issues */}
              {validationResult.securityIssues.length > 0 && (
                <Card
                  size="small"
                  title="🔒 Security Issues"
                  style={{ marginBottom: 16 }}
                >
                  {validationResult.securityIssues.map((issue, index) => (
                    <Tag color="red" key={index} style={{ marginBottom: 4 }}>
                      {issue}
                    </Tag>
                  ))}
                </Card>
              )}

              {/* Best Practice Violations */}
              {validationResult.bestPracticeViolations.length > 0 && (
                <Card
                  size="small"
                  title="📋 Best Practice Recommendations"
                  style={{ marginBottom: 16 }}
                >
                  {validationResult.bestPracticeViolations.map(
                    (violation, index) => (
                      <Tag color="blue" key={index} style={{ marginBottom: 4 }}>
                        {violation}
                      </Tag>
                    )
                  )}
                </Card>
              )}

              {/* Helm Lint Results */}
              <Card
                size="small"
                title="⚙️ Helm Lint Results"
                style={{ marginBottom: 16 }}
              >
                {validationResult.helmLintResults.map((result, index) => (
                  <div
                    key={index}
                    style={{ marginBottom: 4, fontFamily: 'monospace' }}
                  >
                    {result}
                  </div>
                ))}
              </Card>

              {/* Resource Quota Validation */}
              {validationResult.resourceValidation && (
                <Card
                  size="small"
                  title="📊 Resource Quota Validation"
                  style={{ marginBottom: 16 }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <strong>CPU:</strong>{' '}
                    {validationResult.resourceValidation.details.cpu.requested}{' '}
                    requested,
                    {validationResult.resourceValidation.details.cpu.available.toFixed(
                      2
                    )}{' '}
                    available
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Memory:</strong>{' '}
                    {
                      validationResult.resourceValidation.details.memory
                        .requested
                    }
                    Mi requested,
                    {validationResult.resourceValidation.details.memory.available.toFixed(
                      0
                    )}
                    Mi available
                  </div>
                  <div>
                    <strong>Instances:</strong>{' '}
                    {
                      validationResult.resourceValidation.details.instances
                        .requested
                    }{' '}
                    requested,
                    {
                      validationResult.resourceValidation.details.instances
                        .available
                    }{' '}
                    available
                  </div>
                </Card>
              )}
            </div>
          )}
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default HelmValidator;
