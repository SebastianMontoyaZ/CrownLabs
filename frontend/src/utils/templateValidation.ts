export interface ResourceQuota {
  cpu: number;
  memory: string;
  disk: string;
  instances: number;
}

export interface ResourceUsage {
  cpu: string;
  memory: string;
  disk: string;
  instances: number;
}

export interface TemplateResources {
  cpu: number;
  memory: string;
  disk: string;
}

export const parseMemoryString = (memory: string): number => {
  const value = parseFloat(memory);
  if (memory.includes('Gi')) return value * 1024;
  if (memory.includes('Mi')) return value;
  if (memory.includes('G')) return value * 1000;
  if (memory.includes('M')) return value;
  return value;
};

export const validateTemplateAgainstQuota = (
  template: TemplateResources,
  quota: ResourceQuota,
  currentUsage: ResourceUsage
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check CPU
  const currentCpuUsage = parseFloat(currentUsage.cpu);
  const templateCpu = template.cpu;
  const quotaCpu = quota.cpu;

  if (currentCpuUsage + templateCpu > quotaCpu) {
    errors.push(
      `CPU limit exceeded. Required: ${templateCpu}, Available: ${
        quotaCpu - currentCpuUsage
      }/${quotaCpu}`
    );
  }

  // Check Memory
  const currentMemoryUsage = parseMemoryString(currentUsage.memory);
  const templateMemory = parseMemoryString(template.memory);
  const quotaMemory = parseMemoryString(quota.memory);

  if (currentMemoryUsage + templateMemory > quotaMemory) {
    errors.push(
      `Memory limit exceeded. Required: ${template.memory}, Available: ${(
        quotaMemory - currentMemoryUsage
      ).toFixed(0)}Mi/${quota.memory}`
    );
  }

  // Check Disk
  const currentDiskUsage = parseMemoryString(currentUsage.disk);
  const templateDisk = parseMemoryString(template.disk);
  const quotaDisk = parseMemoryString(quota.disk);

  if (currentDiskUsage + templateDisk > quotaDisk) {
    errors.push(
      `Disk limit exceeded. Required: ${template.disk}, Available: ${(
        quotaDisk - currentDiskUsage
      ).toFixed(0)}Mi/${quota.disk}`
    );
  }

  // Check Instances
  if (currentUsage.instances >= quota.instances) {
    errors.push(
      `Instance limit reached. Maximum: ${quota.instances}, Current: ${currentUsage.instances}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
