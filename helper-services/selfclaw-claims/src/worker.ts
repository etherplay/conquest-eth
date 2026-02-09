// ------------------------------------------------------------------------------------------------
// Logging
// ------------------------------------------------------------------------------------------------
import "named-logs-context";
import { enable as enableWorkersLogger } from "workers-logger";
import { logs } from "named-logs";
// ------------------------------------------------------------------------------------------------
import { RemoteD1 } from "remote-sql-d1";
import { wrapWithLogger } from "./logging/index.js";
import { Context } from "hono";
import { CloudflareWorkerEnv } from "./env.js";
import type { RemoteSQL } from "remote-sql";
import { createServer } from "./index.js";

// ------------------------------------------------------------------------------------------------
enableWorkersLogger("*");
const logger = logs("selfclaw-test-cf-worker");
// ------------------------------------------------------------------------------------------------

const services = {
  getDB: (env: CloudflareWorkerEnv): RemoteSQL => new RemoteD1(env.DB),
};

export const app = createServer<CloudflareWorkerEnv>({
  services,
  getEnv: (c: Context<{ Bindings: CloudflareWorkerEnv }>) => c.env,
});

const fetch = async (
  request: Request,
  env: CloudflareWorkerEnv,
  ctx: ExecutionContext,
) => {
  return wrapWithLogger(request, env, ctx, async () =>
    app.fetch(request, env, ctx),
  );
};

export default {
  fetch,
  // // @ts-expect-error TS6133
  // async scheduled(event, env, ctx) {
  // 	ctx.waitUntil(() => {
  // 		console.log(`scheduled`);
  // 	});
  // },
};
