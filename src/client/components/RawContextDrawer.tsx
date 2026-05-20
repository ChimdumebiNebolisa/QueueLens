import { useState } from 'react';
import type { ValidatedAnalysisResult } from '../../shared/queueLensDomain.js';

type Props = { result: ValidatedAnalysisResult; embedded?: boolean };

export function RawContextDrawer({ result, embedded = false }: Props) {
  const [open, setOpen] = useState(false);
  const raw = JSON.stringify(result.contextBundle, null, 2);

  return (
    <div className={embedded ? 'raw-context-embedded' : 'panel raw-context-panel'}>
      <button type="button" className="buttonish" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Show'} raw context
      </button>
      {open ? <pre className="raw">{raw}</pre> : null}
    </div>
  );
}
