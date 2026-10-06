import { useState } from 'react';

import { errorCodeOf, type RequestErrorCode } from '@/api/client';
import { haptics } from '@/feedback/haptics';

export function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<RequestErrorCode | null>(null);

  const submit = async (work: () => Promise<void>, problem: RequestErrorCode | null = null) => {
    if (busy) {
      return;
    }
    if (problem) {
      setError(problem);
      haptics.error();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await work();
      haptics.success();
    } catch (failure) {
      setError(errorCodeOf(failure));
      haptics.error();
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, submit, clearError: () => setError(null) };
}
