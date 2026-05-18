import type { SubredditRule } from '../types/context.js';

/** Deterministic demo rules when live subreddit rules are unavailable. */
export const DEMO_SUBREDDIT_RULES: SubredditRule[] = [
  {
    id: 'demo-spam',
    title: 'No spam or self-promotion',
    description: 'Unsolicited advertising, repeated links, and off-topic promotion are not allowed.',
  },
  {
    id: 'demo-civility',
    title: 'Be civil',
    description: 'Personal attacks, slurs, and harassment are prohibited.',
  },
];
