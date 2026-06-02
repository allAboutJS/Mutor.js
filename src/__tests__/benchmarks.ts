import Benchmark from "benchmark";
import ejs from "ejs";
import { Eta } from "eta";
import Handlebars from "handlebars";
import nunjucks from "nunjucks";
import Mutor from "../../dist/index";

const tEngine = new Mutor({ autoEscape: false });

function createComplexCtx() {
  return {
    title: "Mutor.js Performance Dashboard",
    user: { name: "Liz", roles: ["Admin", "Developer"], premium: true },
    items: Array.from({ length: 50 }, (_, i) => ({
      id: i,
      name: `Product_ID_${i}`,
      price: 19.99 + i,
      meta: {
        available: i % 3 !== 0,
        category: i % 2 === 0 ? "Hardware" : "Software",
      },
      tags: ["v1", "stable", "performance"],
    })),
  };
}

const ctx = createComplexCtx();

const mutorTemplate = `
<div>
  <h1>{{ title }}</h1>
  {{ if user.premium }}
    <p>Welcome, {{ user.name }} (Role: {{ user.roles[0] }})</p>
  {{ end }}
  <ul>
    {{ for item of items }}
      <li>
        <strong>{{ item.name }}</strong> - {{ item.price }}
        {{ if item.meta.available }}
          <span>[{{ item.meta.category }}]</span>
          <small>
            {{ for tag of item.tags }} #{{ tag }}{{ end }}
          </small>
        {{ end }}
      </li>
    {{ end }}
  </ul>
</div>`;

const etaTemplate = `
<div>
  <h1><%= it.title %></h1>
  <% if (it.user.premium) { %>
    <p>Welcome, <%= it.user.name %> (Role: <%= it.user.roles[0] %>)</p>
  <% } %>
  <ul>
    <% it.items.forEach(item => { %>
      <li>
        <strong><%= item.name %></strong> - <%= item.price %>
        <% if (item.meta.available) { %>
          <span>[<%= item.meta.category %>]</span>
          <small>
            <% item.tags.forEach(tag => { %> #<%= tag %><% }) %>
          </small>
        <% } %>
      </li>
    <% }) %>
  </ul>
</div>`;

const ejsTemplate = `
<div>
  <h1><%= title %></h1>
  <% if (user.premium) { %>
    <p>Welcome, <%= user.name %> (Role: <%= user.roles[0] %>)</p>
  <% } %>
  <ul>
    <% items.forEach(item => { %>
      <li>
        <strong><%= item.name %></strong> - <%= item.price %>
        <% if (item.meta.available) { %>
          <span>[<%= item.meta.category %>]</span>
          <small>
            <% item.tags.forEach(tag => { %> #<%= tag %><% }) %>
          </small>
        <% } %>
      </li>
    <% }) %>
  </ul>
</div>`;

const hbTemplate = `
<div>
  <h1>{{title}}</h1>
  {{#if user.premium}}
    <p>Welcome, {{user.name}} (Role: {{user.roles.[0]}})</p>
  {{/if}}
  <ul>
    {{#each items}}
      <li>
        <strong>{{name}}</strong> - {{price}}
        {{#if meta.available}}
          <span>[{{meta.category}}]</span>
          <small>
            {{#each tags}} #{{this}}{{/each}}
          </small>
        {{/if}}
      </li>
    {{/each}}
  </ul>
</div>`;

const njTemplate = `
<div>
  <h1>{{ title }}</h1>
  {% if user.premium %}
    <p>Welcome, {{ user.name }} (Role: {{ user.roles[0] }})</p>
  {% endif %}
  <ul>
    {% for item in items %}
      <li>
        <strong>{{ item.name }}</strong> - {{ item.price }}
        {% if item.meta.available %}
          <span>[{{ item.meta.category }}]</span>
          <small>
            {% for tag in item.tags %} #{{ tag }}{% endfor %}
          </small>
        {% endif %}
      </li>
    {% endfor %}
  </ul>
</div>`;

const mCompiled = tEngine.compile(mutorTemplate);

const eta = new Eta({ autoEscape: false });
nunjucks.configure({ autoescape: false });

const etaRender = eta.compile(etaTemplate);
const ejsRender = ejs.compile(ejsTemplate);
const hbRender = Handlebars.compile(hbTemplate);
const njRender = nunjucks.compile(njTemplate);

console.log("\n=========================================");
console.log(" BENCHMARK.JS (FAIR)");
console.log("=========================================\n");

new Benchmark.Suite("Compilation")
  .add("Mutor.js Compile", () => {
    tEngine.compile(mutorTemplate);
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
  .on("cycle", (e: any) => console.log(String(e.target)))
  .on("complete", function (this: any) {
    console.log("Fastest:", this.filter("fastest").map("name"));
  })
  .run({ async: false });

new Benchmark.Suite("Execution")
  .add("Mutor.js Execute", () => {
    mCompiled(ctx);
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
  .on("cycle", (e: any) => console.log(String(e.target)))
  .on("complete", function (this: any) {
    console.log("Fastest:", this.filter("fastest").map("name"));
  })
  .run({ async: false });

new Benchmark.Suite("Full Pipeline")
  .add("Mutor.js Full", () => {
    tEngine.render(mutorTemplate, ctx);
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
  .on("cycle", (e: any) => console.log(String(e.target)))
  .on("complete", function (this: any) {
    console.log("Fastest:", this.filter("fastest").map("name"));
  })
  .run({ async: false });
