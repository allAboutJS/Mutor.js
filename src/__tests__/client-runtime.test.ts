import Mutor from "../index";

describe("Client runtime behavior", () => {
  test("renders registered components directly", () => {
    const engine = new Mutor();
    engine.registerComponent("card", "<div>{{ title }}</div>");

    expect(engine.renderComponent("card", { title: "Hello" })).toBe(
      "<div>Hello</div>",
    );
  });

  test("includes inherit parent context by default", () => {
    const engine = new Mutor();
    engine.registerComponent("child", "<span>{{ title }}</span>");
    engine.registerComponent("page", 'Page {{ Mutor::include("child") }}');

    expect(engine.renderComponent("page", { title: "Inherited" })).toBe(
      "Page <span>Inherited</span>",
    );
  });

  test("includes can render with an overridden context", () => {
    const engine = new Mutor();
    engine.registerComponent("badge", "<span>{{ Mutor::$$context }}</span>");
    engine.registerComponent(
      "page",
      '{{ Mutor::include("badge", "Scoped") }} {{ Mutor::$$context.title }}',
    );

    expect(engine.renderComponent("page", { title: "Parent" })).toBe(
      "<span>Scoped</span> Parent",
    );
  });

  test("supports nested component includes", () => {
    const engine = new Mutor();
    engine.registerComponent("leaf", "<em>{{ name }}</em>");
    engine.registerComponent("branch", 'Branch {{ Mutor::include("leaf") }}');
    engine.registerComponent("root", 'Root {{ Mutor::include("branch") }}');

    expect(engine.renderComponent("root", { name: "Nested" })).toBe(
      "Root Branch <em>Nested</em>",
    );
  });

  test("throws on circular component includes", () => {
    const engine = new Mutor();
    engine.registerComponent("a", '{{ Mutor::include("b") }}');
    engine.registerComponent("b", '{{ Mutor::include("a") }}');

    expect(() => engine.renderComponent("a", {})).toThrow(
      /Circular dependency detected/,
    );
  });

  test("applies registered layouts when rendering components", () => {
    const engine = new Mutor();
    engine.addLayout('{{# layout "shell" }}<main>{{ ::slot }}</main>');
    engine.registerComponent("page", '{{# use "shell" }}Hello');

    expect(engine.renderComponent("page", {})).toBe("<main>Hello</main>");
  });

  test("applies nested registered layouts in order", () => {
    const engine = new Mutor();
    engine.addLayout('{{# layout "outer" }}<outer>{{ ::slot }}</outer>');
    engine.addLayout(
      '{{# layout "inner" }}{{# use "outer" }}<inner>{{ ::slot }}</inner>',
    );
    engine.registerComponent("page", '{{# use "inner" }}Hello');

    expect(engine.renderComponent("page", {})).toBe(
      "<outer><inner>Hello</inner></outer>",
    );
  });

  test("render() can include registered components", () => {
    const engine = new Mutor();
    engine.registerComponent("hello", "Hi {{ name }}");

    expect(
      engine.render('{{ Mutor::include("hello") }}', { name: "Ada" }),
    ).toBe("Hi Ada");
  });

  test("throws when rendering an unknown component", () => {
    const engine = new Mutor();

    expect(() => engine.renderComponent("missing", {})).toThrow(
      /No template exists with the identifier 'missing'/,
    );
  });
});
