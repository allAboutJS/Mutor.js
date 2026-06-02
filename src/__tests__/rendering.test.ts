import Mutor from "../index";

describe("Mutor Rendering Logic", () => {
  const engine = new Mutor({});

  test("should handle complex nested loops and conditionals", () => {
    const template = `
      {{~ if showList }}
        <ul>
        {{~ for item of items }}
          <li>{{ item.name }} {{~ if item.admin }} (Admin) {{~ end }}</li>
        {{~ end }}
        </ul>
      {{~ end }}`;

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
        "{{ for item, index of items }}{{ index }}:{{ item }};{{ end }}",
        { items: ["a", "b"] },
      ),
    ).toBe("0:a;1:b;");

    expect(
      engine.render(
        "{{ for key, value in object }}{{ key }}:{{ value }};{{ end }}",
        { object: { a: 1, b: 2 } },
      ),
    ).toBe("a:1;b:2;");
  });

  test("should handle nested loop bindings", () => {
    expect(
      engine.render(
        "{{ for group, groupIndex of groups }}{{ for item, itemIndex of group }}{{ groupIndex }}.{{ itemIndex }}:{{ item }};{{ end }}{{ end }}",
        { groups: [["a", "b"], ["c"]] },
      ),
    ).toBe("0.0:a;0.1:b;1.0:c;");
  });

  test("should handle consecutive loops", () => {
    expect(
      engine.render(
        "{{ for item, index of items }}{{ index }}:{{ item }};{{ end }}{{ for item, index of items }}{{ index }}:{{ item }};{{ end }}",
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
        "{{ for key, value in source.current }}{{ key }}:{{ value }};{{ end }}",
        context,
      ),
    ).toBe("a:1;b:2;");
    expect(accessCount).toBe(1);
  });

  test("should handle switch blocks", () => {
    const template = `
      {{ switch role }}
        {{ case "admin" }}
          Admin
          {{ break }}
        {{ case "user" }}
          User
          {{ break }}
        {{ default }}
          Guest
      {{ end }}`;

    expect(engine.render(template, { role: "admin" })).toContain("Admin");
    expect(engine.render(template, { role: "user" })).toContain("User");
    expect(engine.render(template, { role: "guest" })).toContain("Guest");
  });

  test("should allow switch fallthrough", () => {
    expect(
      engine.render(
        '{{ switch role }}{{ case "admin" }}A{{ case "user" }}U{{ break }}{{ default }}G{{ end }}',
        { role: "admin" },
      ),
    ).toBe("AU");
  });

  test("should handle break and continue inside loops", () => {
    expect(
      engine.render(
        "{{ for item of items }}{{ if item == 2 }}{{ continue }}{{ end }}{{ item }}{{ if item == 3 }}{{ break }}{{ end }}{{ end }}",
        { items: [1, 2, 3, 4] },
      ),
    ).toBe("13");
  });

  test("should allow continue inside a switch nested in a loop", () => {
    expect(
      engine.render(
        "{{ for item of items }}{{ switch item }}{{ case 2 }}{{ continue }}{{ default }}{{ item }}{{ end }}{{ end }}",
        { items: [1, 2, 3] },
      ),
    ).toBe("13");
  });

  test("should reject invalid control flow placement", () => {
    expect(() => engine.render("{{ break }}", {})).toThrow();
    expect(() => engine.render("{{ continue }}", {})).toThrow();
    expect(() => engine.render("{{ case 1 }}", {})).toThrow();
    expect(() =>
      engine.render("{{ switch value }}{{ default }}A{{ default }}B{{ end }}", {
        value: 1,
      }),
    ).toThrow();
    expect(() =>
      engine.render("{{ switch value }}unexpected{{ case 1 }}A{{ end }}", {
        value: 1,
      }),
    ).toThrow();
    expect(() =>
      engine.render("{{ switch value }}{{ case 1 }}A{{ else }}B{{ end }}", {
        value: 1,
      }),
    ).toThrow();
    expect(() =>
      engine.render("{{ for item of items }}{{ else }}{{ end }}", {
        items: [],
      }),
    ).toThrow();
    expect(() => engine.render("{{ else }}", {})).toThrow();
    expect(() =>
      engine.render("{{ if value }}A{{ else }}B{{ else if other }}C{{ end }}", {
        value: true,
        other: true,
      }),
    ).toThrow();
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
