import { useEffect } from 'react';
import { reportRecoverableError } from '../utils/reportError';

export function useLocalStoragePersistence<T>(key: string, value: T, isEnabled: boolean, label: string): void {
  useEffect(() => {
    if (!isEnabled) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      reportRecoverableError(`${label} local storage write failed`, error);
    }
  }, [key, value, isEnabled, label]);
}
