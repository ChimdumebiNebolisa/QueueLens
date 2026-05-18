type Phase = 'loading' | 'success' | 'partial' | 'empty' | 'error';

type Props = {
  phase: Phase;
  message?: string | undefined;
};

export function StatePanel({ phase, message }: Props) {
  const labels: Record<Phase, string> = {
    loading: 'Gathering context and running analysis…',
    success: 'Analysis complete.',
    partial: 'Partial result — review warnings.',
    empty: 'Nothing to show yet.',
    error: 'Something went wrong.',
  };

  return (
    <div className={`state state-${phase}`} role="status">
      <strong>{labels[phase]}</strong>
      {message && <p className="muted">{message}</p>}
    </div>
  );
}
