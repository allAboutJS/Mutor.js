import Benchmark from "benchmark";
import ejs from "ejs";
import { Eta } from "eta";
import Handlebars from "handlebars";
import nunjucks from "nunjucks";
import Mutor from "../../dist/index";

const mutor = new Mutor();
const eta = new Eta();

function runBenchmark(
  title: string,
  ctx: any,
  mutorTemplate: string,
  etaTemplate: string,
  ejsTemplate: string,
  hbTemplate: string,
  njTemplate: string,
) {
  const mCompiled = mutor.compile(mutorTemplate);

  const etaRender = eta.compile(etaTemplate);
  const ejsRender = ejs.compile(ejsTemplate);
  const hbRender = Handlebars.compile(hbTemplate);
  const njRender = nunjucks.compile(njTemplate);

  console.log("\n=========================================");
  console.log(` ${title}`);
  console.log("=========================================\n");

  new Benchmark.Suite(`${title} Compilation`)
    .add("Mutor.js Compile", () => {
      mutor.compile(mutorTemplate);
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

  console.log();

  new Benchmark.Suite(`${title} Execution`)
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

  console.log();

  new Benchmark.Suite(`${title} Full Pipeline`)
    .add("Mutor.js Full", () => {
      mutor.render(mutorTemplate, ctx);
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

  console.log();
}

const tinyCtx = {
  user: {
    profile: {
      name: "Onah Victor",
    },
  },
};

const tinyMutor = `
<h1>Hello {{ user.profile.name }}</h1>
`;

const tinyEta = `
<h1>Hello <%= it.user.profile.name %></h1>
`;

const tinyEJS = `
<h1>Hello <%= user.profile.name %></h1>
`;

const tinyHB = `
<h1>Hello {{user.profile.name}}</h1>
`;

const tinyNJ = `
<h1>Hello {{ user.profile.name }}</h1>
`;

const mediumCtx = {
  user: {
    profile: {
      name: "Onah Victor",
    },
  },

  friends: Array.from({ length: 100 }, (_, i) => ({
    name: `Friend ${i}`,
    online: i % 2 === 0,
  })),
};

const mediumMutor = `
<h1>Hello {{ user.profile.name }}</h1>

<section>
{{ if friends.length }}
{{ for friend of friends }}
<div>
  <h3>{{ friend.name }}</h3>

  {{ if friend.online }}
  <span>Online</span>
  {{ else }}
  <span>Offline</span>
  {{ endif }}
</div>
{{ endfor }}
{{ else }}
<p>No friends</p>
{{ endif }}
</section>
`;

const mediumEta = `
<h1>Hello <%= it.user.profile.name %></h1>

<section>
<% if (it.friends.length) { %>
<% for (const friend of it.friends) { %>
<div>
  <h3><%= friend.name %></h3>

  <% if (friend.online) { %>
  <span>Online</span>
  <% } else { %>
  <span>Offline</span>
  <% } %>

</div>
<% } %>
<% } else { %>
<p>No friends</p>
<% } %>
</section>
`;

const mediumEJS = `
<h1>Hello <%= user.profile.name %></h1>

<section>
<% if (friends.length) { %>
<% for (const friend of friends) { %>
<div>
  <h3><%= friend.name %></h3>

  <% if (friend.online) { %>
  <span>Online</span>
  <% } else { %>
  <span>Offline</span>
  <% } %>

</div>
<% } %>
<% } else { %>
<p>No friends</p>
<% } %>
</section>
`;

const mediumHB = `
<h1>Hello {{user.profile.name}}</h1>

<section>
{{#if friends.length}}
{{#each friends}}
<div>
  <h3>{{name}}</h3>

  {{#if online}}
  <span>Online</span>
  {{else}}
  <span>Offline</span>
  {{/if}}

</div>
{{/each}}
{{else}}
<p>No friends</p>
{{/if}}
</section>
`;

const mediumNJ = `
<h1>Hello {{ user.profile.name }}</h1>

<section>
{% if friends.length %}
{% for friend in friends %}
<div>
  <h3>{{ friend.name }}</h3>

  {% if friend.online %}
  <span>Online</span>
  {% else %}
  <span>Offline</span>
  {% endif %}

</div>
{% endfor %}
{% else %}
<p>No friends</p>
{% endif %}
</section>
`;

const largeCtx = {
  user: {
    profile: {
      name: "Onah Victor",
    },
  },

  posts: Array.from({ length: 50 }, (_, i) => ({
    title: `Post ${i}`,
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    tags: ["javascript", "typescript", "nodejs"],
    comments: Array.from({ length: 10 }, (_, j) => ({
      author: `User ${j}`,
      body: "Nice article!",
    })),
  })),
};

const largeMutor = `
<header>
  <h1>Hello {{ user.profile.name }}</h1>
</header>

<main>
{{ for post of posts }}
<article>
  <h2>{{ post.title }}</h2>
  <p>{{ post.body }}</p>

  {{ if post.tags.length }}
  <div>
    {{ for tag of post.tags }}
    <span>{{ tag }}</span>
    {{ endfor }}
  </div>
  {{ endif }}

  <section>
    {{ for comment of post.comments }}
    <div>
      <strong>{{ comment.author }}</strong>
      <p>{{ comment.body }}</p>
    </div>
    {{ endfor }}
  </section>
</article>
{{ endfor }}
</main>
`;

const largeEta = `
<header>
  <h1>Hello <%= it.user.profile.name %></h1>
</header>

<main>
<% for (const post of it.posts) { %>
<article>
  <h2><%= post.title %></h2>
  <p><%= post.body %></p>

  <% if (post.tags.length) { %>
  <div>
    <% for (const tag of post.tags) { %>
    <span><%= tag %></span>
    <% } %>
  </div>
  <% } %>

  <section>
    <% for (const comment of post.comments) { %>
    <div>
      <strong><%= comment.author %></strong>
      <p><%= comment.body %></p>
    </div>
    <% } %>
  </section>
</article>
<% } %>
</main>
`;

const largeEJS = `
<header>
  <h1>Hello <%= user.profile.name %></h1>
</header>

<main>
<% for (const post of posts) { %>
<article>
  <h2><%= post.title %></h2>
  <p><%= post.body %></p>

  <% if (post.tags.length) { %>
  <div>
    <% for (const tag of post.tags) { %>
    <span><%= tag %></span>
    <% } %>
  </div>
  <% } %>

  <section>
    <% for (const comment of post.comments) { %>
    <div>
      <strong><%= comment.author %></strong>
      <p><%= comment.body %></p>
    </div>
    <% } %>
  </section>
</article>
<% } %>
</main>
`;

const largeHB = `
<header>
  <h1>Hello {{user.profile.name}}</h1>
</header>

<main>
{{#each posts}}
<article>
  <h2>{{title}}</h2>
  <p>{{body}}</p>

  {{#if tags.length}}
  <div>
    {{#each tags}}
    <span>{{this}}</span>
    {{/each}}
  </div>
  {{/if}}

  <section>
    {{#each comments}}
    <div>
      <strong>{{author}}</strong>
      <p>{{body}}</p>
    </div>
    {{/each}}
  </section>
</article>
{{/each}}
</main>
`;

const largeNJ = `
<header>
  <h1>Hello {{ user.profile.name }}</h1>
</header>

<main>
{% for post in posts %}
<article>
  <h2>{{ post.title }}</h2>
  <p>{{ post.body }}</p>

  {% if post.tags.length %}
  <div>
    {% for tag in post.tags %}
    <span>{{ tag }}</span>
    {% endfor %}
  </div>
  {% endif %}

  <section>
    {% for comment in post.comments %}
    <div>
      <strong>{{ comment.author }}</strong>
      <p>{{ comment.body }}</p>
    </div>
    {% endfor %}
  </section>
</article>
{% endfor %}
</main>
`;

const stressCtx = {
  user: {
    profile: {
      name: "Onah Victor",
    },
  },

  posts: Array.from({ length: 1000 }, (_, i) => ({
    title: `Post ${i}`,
    body: "Lorem ipsum dolor sit amet.",

    tags: Array.from({ length: 20 }, (_, j) => `Tag ${j}`),

    comments: Array.from({ length: 50 }, (_, j) => ({
      author: `User ${j}`,
      body: "Nice article!",
    })),
  })),
};

runBenchmark(
  "TINY BENCHMARK",
  tinyCtx,
  tinyMutor,
  tinyEta,
  tinyEJS,
  tinyHB,
  tinyNJ,
);

runBenchmark(
  "MEDIUM BENCHMARK",
  mediumCtx,
  mediumMutor,
  mediumEta,
  mediumEJS,
  mediumHB,
  mediumNJ,
);

runBenchmark(
  "LARGE BENCHMARK",
  largeCtx,
  largeMutor,
  largeEta,
  largeEJS,
  largeHB,
  largeNJ,
);

runBenchmark(
  "STRESS BENCHMARK",
  stressCtx,
  largeMutor,
  largeEta,
  largeEJS,
  largeHB,
  largeNJ,
);
