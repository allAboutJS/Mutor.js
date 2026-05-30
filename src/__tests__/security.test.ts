import Mutor from "../index";

describe("Security Boundaries", () => {
  const engine = new Mutor({ allowFnCalls: false });

  test("prevents prototype pollution / access", () => {
    const context = {};
    expect(() => engine.render("{{ __proto__ }}", context)).toThrow();
    expect(() => engine.render("{{ constructor }}", context)).toThrow();
    expect(() => engine.render("{{ Object.prototype }}", context)).toThrow();

    // Also test computed access
    expect(() => engine.render('{{ this["__proto__"] }}', context)).toThrow();
  });

  test("isolates global scope", () => {
    // process, window, global, globalThis should not be accessible
    const context = {};
    const globals = ["process", "window", "global", "globalThis"];

    for (const g of globals) {
      // It should throw during compilation or evaluate to undefined without throwing,
      // but importantly, it should NOT return the actual global object.
      // Usually validateContext or sandbox prevents it.
      let res = "";

      res = engine.render(`{{ ${g} }}`, context);
      expect(res).not.toContain("[object"); // not returning the object
    }
  });

  test("prevents arbitrary function calls when allowFnCalls is false", () => {
    const context = {
      user: {
        delete: () => "deleted",
      },
    };
    expect(() => engine.render("{{ user.delete() }}", context)).toThrow();
  });

  test("allows function calls when allowFnCalls is true", () => {
    const fnEngine = new Mutor({ allowFnCalls: true });
    const context = {
      greet: (name: string) => `Hello ${name}`,
    };
    expect(fnEngine.render('{{ greet("World") }}', context)).toBe(
      "Hello World",
    );
  });
});
