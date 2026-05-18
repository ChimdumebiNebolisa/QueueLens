import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { analyzeTarget } from './routes/analyzeTarget.js';
import { menuAnalyze } from './routes/menuAnalyze.js';

const app = new Hono();
const internal = new Hono();

internal.route('/menu', menuAnalyze);
app.route('/api', analyzeTarget);
app.route('/internal', internal);

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
