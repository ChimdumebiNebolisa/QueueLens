type Props = { level: 'low' | 'medium' | 'high'; label?: string | undefined };

export function ConfidenceBadge({ level, label }: Props) {
  const text = label ?? level;
  return (
    <span className={`confidence confidence-${level}`} title="Model-reported confidence (not a verdict)">
      {text}
    </span>
  );
}
