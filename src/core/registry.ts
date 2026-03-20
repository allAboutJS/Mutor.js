import type { Expression } from "../types/types";

export default class Registry {
  static records = new Map<string, Expression[]>();

  static getRecord(path: string) {
    return Registry.records.get(path);
  }

  static hasRecord(path: string) {
    return Registry.records.has(path);
  }

  setRecord(path: string, ast: Expression[]) {
    Registry.records.set(path, ast);
  }
}
