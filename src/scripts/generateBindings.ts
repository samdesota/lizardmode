import { bindings } from "./keys";

console.log(
  bindings
    .map((binding) =>
      JSON.stringify({
        key: binding.key,
        command: binding.command,
        when: "editorTextFocus && lizardmode.capture",
      }),
    )
    .join(","),
);
