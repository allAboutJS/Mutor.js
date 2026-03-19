import { performance } from "node:perf_hooks";
import ejs from "ejs";
import express from "express";
import Handlebars from "handlebars";
import nunjucks from "nunjucks";
import { Executor, Lexer, Parser } from "../src"; // Mutor.js

const app = express();
const port = 3000;

// -------------------------
// Context generator
// -------------------------
function createUsers(count = 1000, tasks = 100) {
  return Array.from({ length: count }, (_, i) => ({
    name: `User_${i}`,
    active: true,
    tasks: Array.from({ length: tasks }, (_, j) => ({
      title: `Task_${j}`,
      done: j % 2 === 0,
    })),
  }));
}

// -------------------------
// Templates
// -------------------------

// Mutor.js template
const mutorTemplate = `
<div>
  {{- for user of users }}
  {{- if user['active'] }}
  <section>
    <h2>{{ user['name']['toLowerCase']() }}</h2>
    <ul>
      {{- for task of user.tasks }}
        {{ if task.done -}}
          <li>{{ task.title }}</li>
        <li>{{ task.title }}</li>
        {{- end -}}
      {{ end }}
    </ul>
  </section>
  {{ end }}
  {{- end -}}
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

// -------------------------
// Precompile all templates
// -------------------------

const mutorAST = new Parser(new Lexer(mutorTemplate).scanTokens()).parse();
// --- Mutor precompile ---
const mutorCompile = () => {
  return new Executor(mutorAST, { users: createUsers(2, 2) }).execute();
};

console.log(JSON.stringify(mutorAST, null, 2));
console.log(mutorCompile());

// --- EJS precompile ---
const ejsRender = ejs.compile(ejsTemplate);

// --- Handlebars precompile ---
const hbRender = Handlebars.compile(hbTemplate);

// --- Nunjucks precompile ---
nunjucks.configure({ autoescape: true });
const njRender = (ctx: any) => nunjucks.renderString(njTemplate, ctx);

// -------------------------
// Benchmark routes
// -------------------------

app.get("/mutor", (_, res) => {
  const ctx = { users: createUsers() };
  const start = performance.now();
  const html = new Executor(mutorAST, ctx).execute();
  const end = performance.now();
  res.set("X-Execution-Time-ms", (end - start).toFixed(3));
  res.send(html);
});

app.get("/ejs", (_, res) => {
  const ctx = { users: createUsers() };
  const start = performance.now();
  const html = ejsRender(ctx);
  const end = performance.now();
  res.set("X-Execution-Time-ms", (end - start).toFixed(3));
  res.send(html);
});

app.get("/handlebars", (_, res) => {
  const ctx = { users: createUsers() };
  const start = performance.now();
  const html = hbRender(ctx);
  const end = performance.now();
  res.set("X-Execution-Time-ms", (end - start).toFixed(3));
  res.send(html);
});

app.get("/nunjucks", (_, res) => {
  const ctx = { users: createUsers() };
  const start = performance.now();
  const html = njRender(ctx);
  const end = performance.now();
  res.set("X-Execution-Time-ms", (end - start).toFixed(3));
  res.send(html);
});

// -------------------------
app.listen(port, () => {
  console.log(
    `Precompiled benchmark server running at http://localhost:${port}`,
  );
});
