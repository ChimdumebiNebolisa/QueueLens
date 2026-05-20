type Phase = 'loading' | 'success' | 'partial' | 'empty' | 'error';

type Props = {
  phase: Phase;
  message?: string | undefined;
};

export function StatePanel({ phase, message }: Props) {
  const labels: Record<Phase, string> = {
    loading: 'Gathering context and running analysis…',
    success: 'Ready to review.',
    partial: 'QueueLens finished with warnings.',
    empty: 'Nothing to show yet.',
    error: 'Something went wrong.',
  };

  return (
    <div className={`state state-${phase}`} role="status">
      <strong>{labels[phase]}</strong>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
