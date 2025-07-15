import { Spin } from 'antd';
import type { FC } from 'react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { TenantContext } from '../../../contexts/TenantContext';
import { makeWorkspace } from '../../../utilsLogic';
import Dashboard from '../Dashboard/Dashboard';
import {
  Role,
  TenantsDocument,
  useWorkspacesQuery,
  useWorkspaceQuotasQuery,
} from '../../../generated-types';
import type { Workspace } from '../../../utils';
import { WorkspaceRole } from '../../../utils';
import { useApolloClient } from '@apollo/client';
import { ErrorContext } from '../../../errorHandling/ErrorContext';
import { LocalValue, StorageKeys } from '../../../utilsStorage';

const dashboard = new LocalValue(StorageKeys.Dashboard_LoadCandidates, 'false');

const DashboardLogic: FC = () => {
  const { apolloErrorCatcher } = useContext(ErrorContext);

  const { data: quotasData } = useWorkspaceQuotasQuery();

  const workspaceQuotas = useMemo(() => {
    // Map workspace name to quota for easy lookup
    const map: Record<
      string,
      { cpu: string | number; memory: string; instances: number }
    > = {};
    quotasData?.workspaces?.items?.forEach(ws => {
      if (ws?.metadata?.name && ws?.spec?.quota) {
        map[ws.metadata.name] = ws.spec.quota;
      }
    });
    return map;
  }, [quotasData]);

  const {
    data: tenantData,
    error: tenantError,
    loading: tenantLoading,
  } = useContext(TenantContext);

  // revert to original, enrich after the workspaces are loaded instead
  const ws = useMemo(() => {
    return (
      tenantData?.tenant?.spec?.workspaces
        ?.filter(w => w?.role !== Role.Candidate)
        ?.map(makeWorkspace) ?? []
    );
  }, [tenantData?.tenant?.spec?.workspaces]);

  const [viewWs, setViewWs] = useState<Workspace[]>(ws);
  const client = useApolloClient();

  const { data: workspaceQueryData } = useWorkspacesQuery({
    variables: {
      labels: 'crownlabs.polito.it/autoenroll=withApproval',
    },
    onError: apolloErrorCatcher,
  });

  const [loadCandidates, setLoadCandidates] = useState(
    dashboard.get() === 'true',
  );

  const wsIsManagedWithApproval = useCallback(
    (w: Workspace): boolean => {
      return (
        w?.role === WorkspaceRole.manager &&
        workspaceQueryData?.workspaces?.items?.find(
          wq => wq?.metadata?.name === w.name,
        ) !== undefined
      );
    },
    [workspaceQueryData?.workspaces?.items],
  );

  //enrich workspaces with quotas
  useEffect(() => {
    viewWs.forEach(w => {
      w.quota = workspaceQuotas[w.name];
    });
  }, [viewWs, workspaceQuotas]);
  console.log('workspaces ', viewWs);

  useEffect(() => {
    if (loadCandidates) {
      const workspaceQueue: Workspace[] = [];
      const executeNext = () => {
        if (!loadCandidates || workspaceQueue.length === 0) {
          return;
        }
        const w = workspaceQueue.shift();
        client
          .query({
            query: TenantsDocument,
            variables: {
              labels: `crownlabs.polito.it/workspace-${w?.name}=candidate`,
            },
          })
          .then(queryResult => {
            const numCandidate = queryResult.data.tenants.items.length;
            if (numCandidate > 0) {
              ws.find(ws => ws.name === w?.name)!.waitingTenants = numCandidate;
              setViewWs([...ws]);
            }
            executeNext();
          });
      };

      ws
        ?.filter(
          w => w?.role === WorkspaceRole.manager && wsIsManagedWithApproval(w),
        )
        .forEach(w => {
          workspaceQueue.push(w);
          if (workspaceQueue.length === 1) {
            executeNext();
          }
        });
    }
  }, [
    client,
    ws,
    workspaceQueryData?.workspaces?.items,
    loadCandidates,
    wsIsManagedWithApproval,
  ]);

  const selectLoadCandidates = () => {
    if (loadCandidates) {
      ws.forEach(w => (w.waitingTenants = undefined));
    }
    setViewWs([...ws]);
    setLoadCandidates(!loadCandidates);
    dashboard.set(String(!loadCandidates));
  };

  const tenantNs = tenantData?.tenant?.status?.personalNamespace?.name;

  return !tenantLoading && tenantData && !tenantError && tenantNs ? (
    <>
      <Dashboard
        tenantNamespace={tenantNs}
        workspaces={viewWs}
        candidatesButton={{
          show: ws.some(w => wsIsManagedWithApproval(w)),
          selected: loadCandidates,
          select: selectLoadCandidates,
        }}
      />
    </>
  ) : (
    <div className="h-full w-full flex justify-center items-center">
      <Spin size="large" />
    </div>
  );
};

export default DashboardLogic;
