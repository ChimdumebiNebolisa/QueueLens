type Props = { level: 'low' | 'medium' | 'high' };

export function ConfidenceBadge({ level }: Props) {
  return (
    <span className={`confidence confidence-${level}`} title="Model-reported confidence (not a verdict)">
      Confidence: {level}
    </span>
  );
}
