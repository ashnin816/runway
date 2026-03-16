'use client';
import { useAuth } from '@/context/AuthContext';
import { useModel } from '@/context/ModelContext';
import { useUI } from '@/context/UIContext';

const FREE_EMPLOYEE_LIMIT = 3;

export function useGating() {
  const { isPro, trialStartDate, trialEndDate, subscriptionStatus, user } = useAuth();
  const { state } = useModel();
  const { setUpgradeModalFeature } = useUI();

  const now = new Date();
  const isTrial = subscriptionStatus === 'trialing' && trialEndDate && now < trialEndDate;
  const trialDaysLeft = isTrial ? Math.max(0, Math.ceil((trialEndDate - now) / 86400000)) : 0;
  const hasAccess = isPro || isTrial;

  const employeeCount = (state.empRows?.length || 0) + (state.contractorRows?.length || 0);

  return {
    isPro,
    isTrial,
    trialDaysLeft,
    trialExpired: subscriptionStatus === 'trialing' && trialEndDate && now >= trialEndDate,
    hasAccess,
    canAddEmployee: hasAccess || employeeCount < FREE_EMPLOYEE_LIMIT,
    canExport: hasAccess,
    canShare: hasAccess,
    canEditActuals: hasAccess,
    employeeCount,
    employeeLimit: FREE_EMPLOYEE_LIMIT,
    requireUpgrade: (feature) => setUpgradeModalFeature(feature),
  };
}
