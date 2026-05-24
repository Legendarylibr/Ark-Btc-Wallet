export interface SendEstimateState {
  affordable: boolean;
}

/** When the Pay confirm button should stay disabled on the confirm step. */
export function isSendConfirmDisabled(options: {
  loading: boolean;
  estimateLoading: boolean;
  estimate: SendEstimateState | null;
  error: string | null;
}): boolean {
  const { loading, estimateLoading, estimate, error } = options;
  return (
    loading ||
    estimateLoading ||
    !estimate ||
    !!error ||
    !estimate.affordable
  );
}
