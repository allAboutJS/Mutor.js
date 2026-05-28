import Mutor from "../index";

describe("Namespaces", () => {
  const engine = new Mutor({});

  test("Math namespace access", () => {
    expect(engine.render("{{ Math::abs(-5) }}", {})).toBe("5");
    expect(engine.render("{{ Math::max(10, 20) }}", {})).toBe("20");
  });

  test("Date namespace access", () => {
    expect(engine.render("{{ Date::now() > 0 }}", {})).toBe("true");
  });

  test("throws on invalid namespace access", () => {
    expect(() => engine.render("{{ Math::invalidFn() }}", {})).toThrow();
    expect(() => engine.render("{{ Unknown::fn() }}", {})).toThrow();
  });
});
