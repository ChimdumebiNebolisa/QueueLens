import { useState } from 'react';
import type { ValidatedAnalysisResult } from '../../shared/queueLensDomain.js';

type Props = { result: ValidatedAnalysisResult };

export function RawContextDrawer({ result }: Props) {
  const [open, setOpen] = useState(false);
  const raw = JSON.stringify(result.contextBundle, null, 2);

  return (
    <section className="panel">
      <button type="button" className="linkish" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Show'} raw context bundle
      </button>
      {open && <pre className="raw">{raw}</pre>}
    </section>
  );
}
