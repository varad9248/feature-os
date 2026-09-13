import React, { createContext, useContext, useEffect, useState } from 'react';
import type { EvaluationContext } from '@feature-os/types';
import type { FeatureOSClient } from '../client';

export interface FeatureOSContextValue {
  client: FeatureOSClient | null;
  isReady: boolean;
  context: EvaluationContext | null;
}

export const FeatureOSContext = createContext<FeatureOSContextValue>({
  client: null,
  isReady: false,
  context: null,
});

export interface FeatureOSProviderProps {
  client: FeatureOSClient;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureOSProvider: React.FC<FeatureOSProviderProps> = ({
  client,
  children,
  fallback = null,
}) => {
  const [isReady, setIsReady] = useState<boolean>(client.isReady());
  const [currentContext, setCurrentContext] = useState<EvaluationContext>(client.getContext());

  useEffect(() => {
    let isMounted = true;

    if (!client.isReady()) {
      client
        .initialize()
        .then(() => {
          if (isMounted) {
            setIsReady(true);
            setCurrentContext(client.getContext());
          }
        })
        .catch(() => {
          if (isMounted) {
            setIsReady(true);
          }
        });
    } else {
      setIsReady(true);
    }

    return () => {
      isMounted = false;
    };
  }, [client]);

  if (!isReady && fallback) {
    return <>{fallback}</>;
  }

  return (
    <FeatureOSContext.Provider
      value={{
        client,
        isReady,
        context: currentContext,
      }}
    >
      {children}
    </FeatureOSContext.Provider>
  );
};

export function useFeatureOS(): FeatureOSContextValue {
  const ctx = useContext(FeatureOSContext);
  if (!ctx) {
    throw new Error('useFeatureOS must be used within a <FeatureOSProvider>');
  }
  return ctx;
}
