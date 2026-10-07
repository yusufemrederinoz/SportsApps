import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { haptics } from '@/feedback/haptics';

type LeaveAction = Parameters<Parameters<typeof usePreventRemove>[1]>[0]['data']['action'];

export function useLeaveGuard(active: boolean, ranked: boolean) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [pending, setPending] = useState<LeaveAction | null>(null);

  usePreventRemove(active, ({ data }) => {
    haptics.warning();
    setPending(data.action);
  });

  if (!pending) {
    return null;
  }

  return (
    <ConfirmDialog
      title={t('leave.title')}
      message={t(ranked ? 'leave.messageRanked' : 'leave.message')}
      confirmLabel={t('leave.confirm')}
      cancelLabel={t('leave.cancel')}
      onConfirm={() => {
        setPending(null);
        navigation.dispatch(pending);
      }}
      onCancel={() => setPending(null)}
    />
  );
}
