import { compile } from "..";
import type { Context } from "../types/types";
import render from "./render";

export default function renderToString(src: string, ctx: Context) {
  return render(compile(src), ctx);
}
