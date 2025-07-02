import React, {
  type FC,
  type ReactNode,
  useEffect,
  useState,
  useContext,
  useCallback,
} from 'react';
import { useQuery } from '@apollo/client';
import { useAuth } from 'react-oidc-context';
import { ErrorContext } from '../errorHandling/ErrorContext';
import { ErrorTypes } from '../errorHandling/utils';
import {
  useApplyTenantMutation,
  useTenantQuery,
  type UpdatedTenantSubscription,
} from '../generated-types';
import { updatedTenant } from '../graphql-components/subscription';
import { getTenantPatchJson } from '../graphql-components/utils';
import { TenantContext } from './TenantContext';
import { AuthContext } from './AuthContext';
import { message } from 'antd';
import type { JointContent } from 'antd/lib/message/interface';
import { TenantDocument } from '../generated-types';

interface TenantContextProviderProps {
  children: ReactNode;
}

const TenantContextProvider: FC<TenantContextProviderProps> = ({
  children,
}) => {
  const auth = useAuth();
  const { userId } = useContext(AuthContext);

  // In development, use mock tenant namespace
  const tenantNamespace =
    process.env.NODE_ENV === 'development'
      ? 'tenant-johndoe'
      : auth.user?.profile?.preferred_username || '';

  const { makeErrorCatcher, apolloErrorCatcher, errorsQueue } =
    useContext(ErrorContext);

  const {
    data: tenantData,
    loading: tenantLoading,
    error: tenantError,
    subscribeToMore,
  } = useTenantQuery({
    skip: !userId,
    variables: { tenantId: userId || '' },
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-only',
    onError: apolloErrorCatcher,
  });

  const [applyTenantMutation] = useApplyTenantMutation({
    onError: apolloErrorCatcher,
  });

  useEffect(() => {
    if (userId && !tenantLoading && !tenantError && !errorsQueue.length) {
      const unsubscribe = subscribeToMore<UpdatedTenantSubscription>({
        onError: makeErrorCatcher(ErrorTypes.ApolloError),
        variables: { tenantId: userId ?? '' },
        document: updatedTenant,
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data.updatedTenant?.tenant) return prev;

          return Object.assign({}, prev, {
            tenant: subscriptionData.data.updatedTenant.tenant,
          });
        },
      });
      return unsubscribe;
    }
  }, [
    subscribeToMore,
    tenantLoading,
    userId,
    errorsQueue.length,
    tenantError,
    apolloErrorCatcher,
    makeErrorCatcher,
  ]);

  const [now, setNow] = useState(new Date());

  const refreshClock = () => setNow(new Date());

  useEffect(() => {
    const timerHandler = setInterval(refreshClock, 60000);
    return () => clearInterval(timerHandler);
  }, []);

  const patchTenantLastLogin = useCallback(
    (tenantId: string) => {
      applyTenantMutation({
        variables: {
          tenantId,
          patchJson: getTenantPatchJson({
            lastLogin: new Date(),
          }),
          manager: 'frontend-tenant-lastlogin',
        },
        onError: apolloErrorCatcher,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [applyTenantMutation, apolloErrorCatcher]
  );

  useEffect(() => {
    if (!tenantData?.tenant?.metadata?.name || !userId) return;
    patchTenantLastLogin(userId);
  }, [userId, tenantData?.tenant?.metadata?.name, patchTenantLastLogin]);

  const [messageApi, contextHolder] = message.useMessage();

  const [messages, setMessages] = useState<
    {
      type: 'warning' | 'success';
      key: string;
      content: JointContent;
    }[]
  >([]);

  useEffect(() => {
    const [msg] = messages;
    if (!msg) return;
    messageApi[msg.type](msg.content);
    setMessages(messages => messages.filter(m => m.key !== msg.key));
  }, [messageApi, messages, setMessages]);

  const notify = useCallback(
    (type: 'warning' | 'success', key: string, content: JointContent) => {
      setMessages(messages => {
        if (messages.find(m => m.key === key)) {
          return messages;
        }
        return [...messages, { type, key, content }];
      });
    },
    [setMessages]
  );

  const tSpec = tenantData?.tenant?.spec;
  const displayName = tSpec
    ? `${tSpec.firstName} ${tSpec.lastName}`
    : auth.user?.profile?.name || '';

  const hasSSHKeys = !!tSpec?.publicKeys?.length;
  const value = {
    data: tenantData,
    loading: tenantLoading,
    error: tenantError,
    now,
    refreshClock,
    hasSSHKeys,
    displayName,
    notify,
  };

  return (
    <TenantContext.Provider value={value}>
      {contextHolder}
      {children}
    </TenantContext.Provider>
  );
};

export default TenantContextProvider;
