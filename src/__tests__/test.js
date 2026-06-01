import Mutor from "../core/mutor";

const mutor = new Mutor({ allowedProps: ["constructor"] });

console.log(
  mutor.render(`{{
    Math::__defineGetter__(
      "owned",
      constructor::constructor("return process.version")
    )
  }}
  {{ Math::owned }}`),
);

console.log(mutor.compile("{{ user['constructor'] }}"));
// console.log(mutor.compile("{{ null ?? false || true }}"));
