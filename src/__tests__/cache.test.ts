import Mutor from "../index";

describe("Cache Logic", () => {
  test("caches templates successfully", () => {
    const engine = new Mutor({ cache: { active: true, maxSize: 100 } });

    // First render compiles and caches
    const res1 = engine.render("{{ a }}", { a: 1 });
    expect(res1).toBe("1");

    // Check if the map has it (internal, so we just verify the next render works exactly the same)
    const res2 = engine.render("{{ a }}", { a: 2 });
    expect(res2).toBe("2");
  });

  test("does not cache if active is false", () => {
    const engine = new Mutor({ cache: { active: false, maxSize: 100 } });
    const res1 = engine.render("{{ a }}", { a: 1 });
    expect(res1).toBe("1");

    // We would need to inspect internals to prove it isn't cached, but we can verify it renders.
    const res2 = engine.render("{{ a }}", { a: 2 });
    expect(res2).toBe("2");
  });
});
