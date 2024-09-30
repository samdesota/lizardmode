import { bindings, lowerCaseKeys } from "./keys";

console.log(bindings.map((binding) => JSON.stringify(binding)).join(","));
