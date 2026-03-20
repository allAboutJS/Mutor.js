import { Executor } from "../core";
import type { Context, Expression } from "../types/types";

export default function render(ast: Expression[], ctx: Context) {
  return new Executor(ast, ctx).execute();
}
