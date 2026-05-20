declare module 'hono' {
  /** Minimal surface for QueueLens server routes (full types ship with hono in supported installs). */
  export class Hono {
    post(_path: string, _handler: (c: HonoContext) => unknown | Promise<unknown>): this;
    get(_path: string, _handler: (c: HonoContext) => unknown | Promise<unknown>): this;
    route(_prefix: string, _sub: Hono): this;
    fetch: (..._args: unknown[]) => unknown;
  }

  export type HonoContext = {
    req: {
      json: <T = unknown>() => Promise<T>;
      query: (key: string) => string | undefined;
    };
    json: <T>(body: T, status?: number) => Response;
  };
}
