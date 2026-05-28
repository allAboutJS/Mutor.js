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
