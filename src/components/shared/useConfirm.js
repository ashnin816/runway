'use client';
import { useState, useCallback } from 'react';
import ConfirmModal from './ConfirmModal';

export function useConfirm() {
  const [state, setState] = useState(null);

  const confirm = useCallback(({ title, message, confirmLabel, variant }) => {
    return new Promise((resolve) => {
      setState({ title, message, confirmLabel, variant, resolve });
    });
  }, []);

  const modal = state ? (
    <ConfirmModal
      open
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      variant={state.variant}
      onConfirm={() => { state.resolve(true); setState(null); }}
      onCancel={() => { state.resolve(false); setState(null); }}
    />
  ) : null;

  return { confirm, ConfirmDialog: modal };
}
