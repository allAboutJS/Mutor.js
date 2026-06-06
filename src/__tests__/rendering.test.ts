import Mutor from "../index";

describe("Mutor Rendering Logic", () => {
  const engine = new Mutor({});

  test("should handle complex nested loops and conditionals", () => {
    const template = `
      {{~ if showList }}
        <ul>
        {{~ for item of items }}
          <li>{{ item.name }} {{~ if item.admin }} (Admin) {{~ endif }}</li>
        {{~ endfor }}
        </ul>
      {{~ endif }}`;

    const context = {
      showList: true,
      items: [
        { name: "Alice", admin: true },
        { name: "Bob", admin: false },
      ],
    };

    const result = engine.render(template, context);

    expect(result).toContain("<li>Alice (Admin)</li>");
    expect(result).toContain("<li>Bob</li>");
  });

  test("should expose optional loop bindings", () => {
    expect(
      engine.render(
        "{{ for item, index of items }}{{ index }}:{{ item }};{{ endfor }}",
        { items: ["a", "b"] },
      ),
    ).toBe("0:a;1:b;");

    expect(
      engine.render(
        "{{ for key, value in object }}{{ key }}:{{ value }};{{ endfor }}",
        { object: { a: 1, b: 2 } },
      ),
    ).toBe("a:1;b:2;");
  });

  test("should handle nested loop bindings", () => {
    expect(
      engine.render(
        "{{ for group, groupIndex of groups }}{{ for item, itemIndex of group }}{{ groupIndex }}.{{ itemIndex }}:{{ item }};{{ endfor }}{{ endfor }}",
        { groups: [["a", "b"], ["c"]] },
      ),
    ).toBe("0.0:a;0.1:b;1.0:c;");
  });

  test("should handle consecutive loops", () => {
    expect(
      engine.render(
        "{{ for item, index of items }}{{ index }}:{{ item }};{{ endfor }}{{ for item, index of items }}{{ index }}:{{ item }};{{ endfor }}",
        { items: ["a", "b"] },
      ),
    ).toBe("0:a;1:b;0:a;1:b;");
  });

  test("should evaluate loop iterables once", () => {
    let accessCount = 0;
    const context = {
      source: {
        get current() {
          accessCount++;
          return { a: 1, b: 2 };
        },
      },
    };

    expect(
      engine.render(
        "{{ for key, value in source.current }}{{ key }}:{{ value }};{{ endfor }}",
        context,
      ),
    ).toBe("a:1;b:2;");
    expect(accessCount).toBe(1);
  });

  test("should handle break and continue inside loops", () => {
    expect(
      engine.render(
        "{{ for item of items }}{{ if item == 2 }}{{ continue }}{{ endif }}{{ item }}{{ if item == 3 }}{{ break }}{{ endif }}{{ endfor }}",
        { items: [1, 2, 3, 4] },
      ),
    ).toBe("13");
  });

  test("should allow keywords as property names", () => {
    expect(
      engine.render("{{ object.default }}", { object: { default: "a" } }),
    ).toBe("a");
  });

  test("should fail gracefully or throw on invalid context access", () => {
    const template = "{{ user.profile.details.age }}";
    // Accessing property of undefined should be caught by validateContext or the builder
    expect(() => engine.render(template, { user: {} })).toThrow();
  });

  test("should render from a registered component", () => {
    // Disable HTML escaping
    engine.addConfig({ autoEscape: false });
    engine.registerComponent(
      "alert",
      '<div class="alert">{{ Mutor::$$context }}</div>',
    );
    const result = engine.render('{{ Mutor::include("alert", "Hello") }}', {});
    expect(result).toBe('<div class="alert">Hello</div>');
  });
  test("should handle ternary and nullish coalescing operators", () => {
    expect(engine.render("{{ true ? 'yes' : 'no' }}", {})).toBe("yes");
    expect(engine.render("{{ false ? 'yes' : 'no' }}", {})).toBe("no");
    expect(engine.render("{{ null ?? 'fallback' }}", {})).toBe("fallback");
    expect(engine.render("{{ undefined ?? 'fallback' }}", {})).toBe("fallback");
    expect(engine.render("{{ 'value' ?? 'fallback' }}", {})).toBe("value");
  });

  test("should handle complex logical expressions", () => {
    const context = { a: true, b: false, c: true };
    expect(engine.render("{{ a && b || c }}", context)).toBe("true");
    expect(engine.render("{{ a && (b || c) }}", context)).toBe("true");
  });
});
