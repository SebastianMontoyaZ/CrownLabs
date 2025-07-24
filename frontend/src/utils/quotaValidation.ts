export interface ResourceQuota {
  cpu: string;
  memory: string;
  instances: number;
  disk?: string;
}

export interface ResourceUsage {
  cpu: string;
  memory: string;
  instances: number;
  disk?: string;
}

export interface TemplateResources {
  cpu: number;
  memory: string;
  disk?: string;
}

export const parseResourceString = (value: string): number => {
  if (!value) return 0;

  // Handle CPU values (e.g., "2", "2000m")
  if (value.includes('m')) {
    return parseFloat(value.replace('m', '')) / 1000;
  }

  // Handle memory values (e.g., "4Gi", "4096Mi", "4G")
  if (value.includes('Gi')) return parseFloat(value.replace('Gi', '')) * 1024;
  if (value.includes('Mi')) return parseFloat(value.replace('Mi', ''));
  if (value.includes('G')) return parseFloat(value.replace('G', '')) * 1000;
  if (value.includes('M')) return parseFloat(value.replace('M', ''));

  return parseFloat(value);
};

export const formatResourceValue = (
  value: number,
  unit: 'cpu' | 'memory' | 'disk'
): string => {
  switch (unit) {
    case 'cpu':
      return value < 1 ? `${Math.round(value * 1000)}m` : `${value}`;
    case 'memory':
    case 'disk':
      return value >= 1024 ? `${(value / 1024).toFixed(1)}Gi` : `${value}Mi`;
    default:
      return value.toString();
  }
};

// Define the missing types
export interface QuotaInfo {
  cpu: number;
  memory: number;
  instances: number;
}

export interface UsedQuotaInfo {
  cpu: number;
  memory: number;
  instances: number;
}

export interface QuotaDetails {
  cpu: {
    used: number;
    requested: number;
    available: number;
    limit: number;
  };
  memory: {
    used: number;
    requested: number;
    available: number;
    limit: number;
  };
  instances: {
    used: number;
    requested: number;
    available: number;
    limit: number;
  };
}

export interface QuotaValidationResult {
  valid: boolean; // Changed from isValid to valid
  errors: string[];
  warnings: string[];
  details: QuotaDetails;
}

// Helper function to parse memory strings like "4Gi", "512Mi", etc.
const parseMemoryString = (memoryStr: string): number => {
  const units: { [key: string]: number } = {
    Ki: 1024,
    Mi: 1024 * 1024,
    Gi: 1024 * 1024 * 1024,
    Ti: 1024 * 1024 * 1024 * 1024,
    K: 1000,
    M: 1000 * 1000,
    G: 1000 * 1000 * 1000,
    T: 1000 * 1000 * 1000 * 1000,
  };

  const match = memoryStr.match(/^(\d+(?:\.\d+)?)(.*)?$/);
  if (!match) {
    return 0;
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || '';

  return value * (units[unit] || 1);
};

export const validateResourceAgainstQuota = (
  templateResources: {
    cpu: number | string;
    memory: string;
    // Note: instances are not part of template resources
  },
  quota: {
    cpu: string;
    memory: string;
    instances: number;
    // Note: no disk in tenant quota
  },
  currentUsage: {
    cpu: string;
    memory: string;
    instances: number;
    // Note: no disk in current usage
  }
): QuotaValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse values
  const quotaCpu = parseResourceString(quota.cpu);
  const usedCpu = parseResourceString(currentUsage.cpu);
  const requestedCpu = parseFloat(String(templateResources.cpu));

  const quotaMemory = parseResourceString(quota.memory);
  const usedMemory = parseResourceString(currentUsage.memory);
  const requestedMemory = parseResourceString(templateResources.memory);

  const quotaInstances = quota.instances;
  const usedInstances = currentUsage.instances;
  const requestedInstances = 1;

  // CPU validation
  const availableCpu = quotaCpu - usedCpu;
  if (requestedCpu > availableCpu) {
    errors.push(
      `CPU quota exceeded: Requested ${requestedCpu}, Available ${availableCpu.toFixed(
        2
      )}/${quotaCpu}`
    );
  } else if (requestedCpu > availableCpu * 0.8) {
    warnings.push(
      `High CPU usage: Requested ${requestedCpu}, Available ${availableCpu.toFixed(
        2
      )}/${quotaCpu}`
    );
  }

  // Memory validation
  const availableMemory = quotaMemory - usedMemory;
  if (requestedMemory > availableMemory) {
    errors.push(
      `Memory quota exceeded: Requested ${formatResourceValue(
        requestedMemory,
        'memory'
      )}, Available ${formatResourceValue(
        availableMemory,
        'memory'
      )}/${formatResourceValue(quotaMemory, 'memory')}`
    );
  } else if (requestedMemory > availableMemory * 0.8) {
    warnings.push(
      `High memory usage: Requested ${formatResourceValue(
        requestedMemory,
        'memory'
      )}, Available ${formatResourceValue(
        availableMemory,
        'memory'
      )}/${formatResourceValue(quotaMemory, 'memory')}`
    );
  }

  // Instance validation
  const availableInstances = quotaInstances - usedInstances;
  if (requestedInstances > availableInstances) {
    errors.push(
      `Instance quota exceeded: Requested ${requestedInstances}, Available ${availableInstances}/${quotaInstances}`
    );
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    details: {
      cpu: {
        used: usedCpu,
        requested: requestedCpu,
        available: availableCpu,
        limit: quotaCpu,
      },
      memory: {
        used: usedMemory,
        requested: requestedMemory,
        available: availableMemory,
        limit: quotaMemory,
      },
      instances: {
        used: usedInstances,
        requested: requestedInstances,
        available: availableInstances,
        limit: quotaInstances,
      },
    },
  };
};

export const validateQuota = (
  requestedCpu: string | number,
  requestedMemory: string,
  requestedInstances: number,
  quota: QuotaInfo,
  usedQuota: UsedQuotaInfo
): QuotaValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Convert requestedCpu to number if it's a string
  const cpuValue =
    typeof requestedCpu === 'string' ? parseFloat(requestedCpu) : requestedCpu;

  // Validate that the conversion was successful
  if (isNaN(cpuValue)) {
    errors.push(`Invalid CPU value: ${requestedCpu}`);
    return {
      valid: false, // Changed from isValid to valid
      errors,
      warnings,
      details: {
        cpu: {
          used: usedQuota.cpu,
          requested: 0, // Use 0 for invalid values
          available: quota.cpu - usedQuota.cpu,
          limit: quota.cpu,
        },
        memory: {
          used: usedQuota.memory,
          requested: parseMemoryString(requestedMemory),
          available: quota.memory - usedQuota.memory,
          limit: quota.memory,
        },
        instances: {
          used: usedQuota.instances,
          requested: requestedInstances,
          available: quota.instances - usedQuota.instances,
          limit: quota.instances,
        },
      },
    };
  }

  const {
    cpu: quotaCpu,
    memory: quotaMemory,
    instances: quotaInstances,
  } = quota;
  const {
    cpu: usedCpu,
    memory: usedMemory,
    instances: usedInstances,
  } = usedQuota;

  const requestedMemoryBytes = parseMemoryString(requestedMemory);

  // CPU validation
  const availableCpu = quotaCpu - usedCpu;
  if (cpuValue > availableCpu) {
    errors.push(
      `CPU quota exceeded: Requested ${cpuValue}, Available ${availableCpu.toFixed(
        2
      )}/${quotaCpu}`
    );
  } else if (cpuValue > availableCpu * 0.8) {
    warnings.push(
      `High CPU usage: Requested ${cpuValue}, Available ${availableCpu.toFixed(
        2
      )}/${quotaCpu}`
    );
  }

  // Memory validation
  const availableMemory = quotaMemory - usedMemory;
  if (requestedMemoryBytes > availableMemory) {
    errors.push(
      `Memory quota exceeded: Requested ${requestedMemory}, Available ${(
        availableMemory /
        (1024 * 1024 * 1024)
      ).toFixed(2)}Gi/${(quotaMemory / (1024 * 1024 * 1024)).toFixed(2)}Gi`
    );
  } else if (requestedMemoryBytes > availableMemory * 0.8) {
    warnings.push(
      `High memory usage: Requested ${requestedMemory}, Available ${(
        availableMemory /
        (1024 * 1024 * 1024)
      ).toFixed(2)}Gi/${(quotaMemory / (1024 * 1024 * 1024)).toFixed(2)}Gi`
    );
  }

  // Instances validation
  const availableInstances = quotaInstances - usedInstances;
  if (requestedInstances > availableInstances) {
    errors.push(
      `Instance quota exceeded: Requested ${requestedInstances}, Available ${availableInstances}/${quotaInstances}`
    );
  } else if (requestedInstances > availableInstances * 0.8) {
    warnings.push(
      `High instance usage: Requested ${requestedInstances}, Available ${availableInstances}/${quotaInstances}`
    );
  }

  return {
    valid: errors.length === 0, // Changed from isValid to valid
    errors,
    warnings,
    details: {
      cpu: {
        used: usedCpu,
        requested: cpuValue, // Now guaranteed to be a number
        available: availableCpu,
        limit: quotaCpu,
      },
      memory: {
        used: usedMemory,
        requested: requestedMemoryBytes,
        available: availableMemory,
        limit: quotaMemory,
      },
      instances: {
        used: usedInstances,
        requested: requestedInstances,
        available: availableInstances,
        limit: quotaInstances,
      },
    },
  };
};
