import { Context } from "hono";
import { Bindings } from "hono/types";
import { RemoteSQL } from "remote-sql";

export type Services<Env extends Bindings = Bindings> = {
  getDB: (env: Env) => RemoteSQL;
};

export type ServerOptions<Env extends Bindings = Bindings> = {
  services: Services<Env>;
  getEnv: (c: Context<{ Bindings: Env }>) => Env;
};
