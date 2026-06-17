import Benchmark from "benchmark";
import Mutor from "../../dist/index";

// Mutor-only, sync workflow, single escaping mode for fairness
const MUTOR = new Mutor({ autoEscape: true });

// Simple hello world template
const helloTemplate = `Hello {{ title }}`;

// Context for hello
const helloCtx = { title: "World" };

// List rendering template (loops)
const listTemplate = `
<div>
  <h1>{{ title }}</h1>
  <ul>
    {{ for item of items }}
      <li>{{ item.name }} - {{ item.price }}</li>
    {{ endfor }}
  </ul>
</div>`;
const listCtx = {
  title: "Products",
  items: Array.from({ length: 100 }, (_, i) => ({
    name: `Item_${i}`,
    price: (9.99 + i).toFixed(2),
  })),
};

// Nested/conditional template
const nestedTemplate = `
<div>
  {{ if showHeader }}
    <header>{{ header }}</header>
  {{ endif }}
  <section>
    {{ for it of items }}
      <p>{{ it.name }}: {{ it.value }}</p>
    {{ endfor }}
  </section>
</div>`;
const nestedCtx = {
  showHeader: true,
  header: "Overview",
  items: Array.from({ length: 50 }, (_, i) => ({
    name: `Row_${i}`,
    value: i,
  })),
};

// Precompile templates
const helloCompiled = MUTOR.compile(helloTemplate);
const listCompiled = MUTOR.compile(listTemplate);
const nestedCompiled = MUTOR.compile(nestedTemplate);

console.log("\n=========================================");
console.log(" Mutor-only benchmarks");
console.log("=========================================\n");

new Benchmark.Suite("Mutor-only Hello")
  .add("Hello Compile", () => {
    MUTOR.compile(helloTemplate);
  })
  .add("Hello Execute", () => {
    helloCompiled(helloCtx);
  })
  .on("cycle", (evt: any) => console.log(String(evt.target)))
  .on("complete", function (this: any) {
    console.log("Mutor Hello fastest:", this.filter("fastest").map("name"));
  })
  .run({ async: false });

console.log("");

new Benchmark.Suite("Mutor-only List")
  .add("List Compile", () => {
    MUTOR.compile(listTemplate);
  })
  .add("List Execute", () => {
    listCompiled(listCtx);
  })
  .on("cycle", (evt: any) => console.log(String(evt.target)))
  .on("complete", function (this: any) {
    console.log("Mutor List fastest:", this.filter("fastest").map("name"));
  })
  .run({ async: false });

console.log("");

new Benchmark.Suite("Mutor-only Nested/Conditional")
  .add("Nested Compile", () => {
    MUTOR.compile(nestedTemplate);
  })
  .add("Nested Execute", () => {
    nestedCompiled(nestedCtx);
  })
  .on("cycle", (evt: any) => console.log(String(evt.target)))
  .on("complete", function (this: any) {
    console.log("Mutor Nested fastest:", this.filter("fastest").map("name"));
  })
  .run({ async: false });
