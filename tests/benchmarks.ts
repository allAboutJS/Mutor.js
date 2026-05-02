import Benchmark from "benchmark";
import ejs from "ejs";
import { Eta } from "eta";
import Handlebars from "handlebars";
import nunjucks from "nunjucks";
import compile from "../src/core/compile";

// Context generator
function createUsers(count = 20, tasks = 10) {
  return Array.from({ length: count }, (_, i) => ({
    name: `User_${i}`,
    active: true,
    tasks: Array.from({ length: tasks }, (_, j) => ({
      title: `Task_${j}`,
      done: j % 2 === 0,
    })),
  }));
}

const ctx = { users: createUsers(20, 10) };

// Mutor.js template
const mutorTemplate = `
<div>
  {{ for user of users }}
    {{ if user.active }}
      <section>
        <h2>{{ user.name }}</h2>
        <ul>
          {{ for task of user.tasks }}
            {{ if task.done }}
              <li>{{ task.title }}</li>
            {{ end }}
          {{ end }}
        </ul>
      </section>
    {{ end }}
  {{ end }}
</div>
`;

const etaTemplate = `
<div>
<% it.users.forEach(user => { %>
  <% if(user.active) { %>
    <section>
      <h2><%= user.name %></h2>
      <ul>
        <% it.users[0].tasks.constructor === Array && user.tasks.forEach(task => { %>
          <% if(task.done) { %>
            <li><%= task.title %></li>
          <% } %>
        <% }) %>
      </ul>
    </section>
  <% } %>
<% }) %>
</div>
`;

// EJS template
const ejsTemplate = `
<div>
<% users.forEach(user => { %>
  <% if(user.active) { %>
    <section>
      <h2><%= user.name %></h2>
      <ul>
        <% user.tasks.forEach(task => { %>
          <% if(task.done) { %>
            <li><%= task.title %></li>
          <% } %>
        <% }) %>
      </ul>
    </section>
  <% } %>
<% }) %>
</div>
`;

// Handlebars template
const hbTemplate = `
<div>
{{#each users}}
  {{#if active}}
    <section>
      <h2>{{name}}</h2>
      <ul>
        {{#each tasks}}
          {{#if done}}
            <li>{{title}}</li>
          {{/if}}
        {{/each}}
      </ul>
    </section>
  {{/if}}
{{/each}}
</div>
`;

// Nunjucks template
const njTemplate = `
<div>
{% for user in users %}
  {% if user.active %}
    <section>
      <h2>{{ user.name }}</h2>
      <ul>
        {% for task in user.tasks %}
          {% if task.done %}
            <li>{{ task.title }}</li>
          {% endif %}
        {% endfor %}
      </ul>
    </section>
  {% endif %}
{% endfor %}
</div>
`;

const eta = new Eta({ autoEscape: true });
nunjucks.configure({ autoescape: true });

// Precompiled variants
const mutorRender = compile(mutorTemplate);
const ejsRender = ejs.compile(ejsTemplate);
const etaRender = eta.compile(etaTemplate);
const hbRender = Handlebars.compile(hbTemplate);
const njRender = nunjucks.compile(njTemplate);

console.log("\n=========================================");
console.log(" BENCHMARK.JS SUITES");
console.log("=========================================\n");

const compileSuite = new Benchmark.Suite("Compilation (Lexing + Parsing)");
compileSuite
  .add("Mutor.js Compile", () => {
    compile(mutorTemplate);
  })
  .add("Eta Compile", () => {
    eta.compile(etaTemplate);
  })
  .add("EJS Compile", () => {
    ejs.compile(ejsTemplate);
  })
  .add("Handlebars Compile", () => {
    Handlebars.compile(hbTemplate);
  })
  .add("Nunjucks Compile", () => {
    nunjucks.compile(njTemplate);
  })
  .on("cycle", (event: Benchmark.Event) => {
    console.log(String(event.target));
  })
  .on("complete", function (this: Benchmark.Suite) {
    console.log(`Fastest is ${this.filter("fastest").map("name")}`);
  });

const execSuite = new Benchmark.Suite("Execution Speed (Precompiled)");
execSuite
  .add("Mutor.js Execute", () => {
    mutorRender(ctx);
  })
  .add("Eta Execute", () => {
    etaRender.call(eta, ctx);
  })
  .add("EJS Execute", () => {
    ejsRender(ctx);
  })
  .add("Handlebars Execute", () => {
    hbRender(ctx);
  })
  .add("Nunjucks Execute", () => {
    njRender.render(ctx);
  })
  .on("cycle", (event: Benchmark.Event) => {
    console.log(String(event.target));
  })
  .on("complete", function (this: Benchmark.Suite) {
    console.log(`Fastest is ${this.filter("fastest").map("name")}`);
  });

const completeSuite = new Benchmark.Suite("Complete Pipeline Speed");
completeSuite
  .add("Mutor.js Complete", () => {
    const render = compile(mutorTemplate);
    render(ctx);
  })
  .add("Eta Complete", () => {
    const fn = eta.compile(etaTemplate);
    fn.call(eta, ctx);
  })
  .add("EJS Complete", () => {
    ejs.render(ejsTemplate, ctx);
  })
  .add("Handlebars Complete", () => {
    const render = Handlebars.compile(hbTemplate);
    render(ctx);
  })
  .add("Nunjucks Complete", () => {
    nunjucks.renderString(njTemplate, ctx);
  })
  .on("cycle", (event: Benchmark.Event) => {
    console.log(String(event.target));
  })
  .on("complete", function (this: Benchmark.Suite) {
    console.log(`Fastest is ${this.filter("fastest").map("name")}`);
  });

console.log("--- 1. Compilation Speed (Benchmark.js) ---");
compileSuite.run({ async: false });

console.log("\n--- 2. Execution Speed (Benchmark.js) ---");
execSuite.run({ async: false });

console.log("\n--- 3. Complete Pipeline Speed (Benchmark.js) ---");
completeSuite.run({ async: false });
