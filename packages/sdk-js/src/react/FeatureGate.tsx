import React from 'react';
import { useFeatureFlag } from './useFeatureFlag';

export interface FeatureGateProps {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  negate?: boolean;
  expectedVariant?: string;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  flag,
  children,
  fallback = null,
  negate = false,
  expectedVariant,
}) => {
  const { enabled, value, loading } = useFeatureFlag<unknown>(flag, false);

  if (loading) {
    return <>{fallback}</>;
  }

  let isMatch = enabled;

  if (expectedVariant !== undefined) {
    isMatch = enabled && String(value) === expectedVariant;
  }

  if (negate) {
    isMatch = !isMatch;
  }

  if (isMatch) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
