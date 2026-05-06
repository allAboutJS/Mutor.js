import Mutor from "../index";

describe("Mutor Whitespace Trimming", () => {
  const engine = new Mutor({});

  test("should trim leading whitespace (Left Trim)", () => {
    // Template: "Text    {{ ~ name }}" -> Result: "TextMutor"
    const template = "Words    {{~ name }}";
    const result = engine.render(template, { name: "Mutor" });
    expect(result).toBe("WordsMutor");
  });

  test("should trim trailing whitespace (Right Trim)", () => {
    // Template: "{{ name ~ }}    Words" -> Result: "MutorWords"
    const template = "{{ name ~}}    Words";
    const result = engine.render(template, { name: "Mutor" });
    expect(result).toBe("MutorWords");
  });

  test("should trim both sides (Full Control)", () => {
    // Template: "  {{~ name ~}}  " -> Result: "Mutor"
    const template = "   {{~ name ~}}   ";
    const result = engine.render(template, { name: "Mutor" });
    expect(result).toBe("Mutor");
  });

  test("should handle whitespace between blocks", () => {
    const template = `
      {{ if true ~}}
          Visible
      {{~ end }}`;
    const result = engine.render(template, {});
    // Should result in "Visible" without the newlines from the if/end tags
    expect(result.trim()).toBe("Visible");
  });
});
