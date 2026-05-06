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
});
