import Benchmark from "benchmark";
import ejs from "ejs";
import { Eta } from "eta";
import Handlebars from "handlebars";
import nunjucks from "nunjucks";
import { compile as mutorCompile } from "../src";

// Context
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

// Templates (equivalent)
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
  <% if (user.active) { %>
    <section>
      <h2><%= user.name %></h2>
      <ul>
        <% user.tasks.forEach(task => { %>
          <% if (task.done) { %>
            <li><%= task.title %></li>
          <% } %>
        <% }) %>
      </ul>
    </section>
  <% } %>
<% }) %>
</div>
`;

const ejsTemplate = `
<div>
<% users.forEach(user => { %>
  <% if (user.active) { %>
    <section>
      <h2><%= user.name %></h2>
      <ul>
        <% user.tasks.forEach(task => { %>
          <% if (task.done) { %>
            <li><%= task.title %></li>
          <% } %>
        <% }) %>
      </ul>
    </section>
  <% } %>
<% }) %>
</div>
`;

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

// Engine setup
const eta = new Eta({ autoEscape: true });
nunjucks.configure({ autoescape: true });

// Precompile
const mutorRender = mutorCompile(mutorTemplate);
const etaRender = eta.compile(etaTemplate);
const ejsRender = ejs.compile(ejsTemplate);
const hbRender = Handlebars.compile(hbTemplate);
const njRender = nunjucks.compile(njTemplate);

// Mutor compile args
const namespaces = {};
const allowedProps = new Set();
const forbiddenProps = new Set();

// Warm up
for (let i = 0; i < 1000; i++) {
  mutorRender(ctx, namespaces, allowedProps, forbiddenProps);
  etaRender.call(eta, ctx);
  ejsRender(ctx);
  hbRender(ctx);
  njRender.render(ctx);
}

// Benchmark suites
console.log("\n=========================================");
console.log(" BENCHMARK.JS (FAIR)");
console.log("=========================================\n");

// 1. Compilation
new Benchmark.Suite("Compilation")
  .add("Mutor.js Compile", () => {
    mutorCompile(mutorTemplate);
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
  .on("cycle", (e) => console.log(String(e.target)))
  .on("complete", function () {
    console.log("Fastest:", this.filter("fastest").map("name"));
  })
  .run({ async: false });

// 2. Execution
new Benchmark.Suite("Execution")
  .add("Mutor.js Execute", () => {
    mutorRender(ctx, namespaces, allowedProps, forbiddenProps);
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
  .on("cycle", (e) => console.log(String(e.target)))
  .on("complete", function () {
    console.log("Fastest:", this.filter("fastest").map("name"));
  })
  .run({ async: false });

// 3. Full pipeline
new Benchmark.Suite("Full Pipeline")
  .add("Mutor.js Full", () => {
    const r = mutorCompile(mutorTemplate);
    r(ctx);
  })
  .add("Eta Full", () => {
    const r = eta.compile(etaTemplate);
    r.call(eta, ctx);
  })
  .add("EJS Full", () => {
    ejs.render(ejsTemplate, ctx);
  })
  .add("Handlebars Full", () => {
    const r = Handlebars.compile(hbTemplate);
    r(ctx);
  })
  .add("Nunjucks Full", () => {
    nunjucks.renderString(njTemplate, ctx);
  })
  .on("cycle", (e) => console.log(String(e.target)))
  .on("complete", function () {
    console.log("Fastest:", this.filter("fastest").map("name"));
  })
  .run({ async: false });
