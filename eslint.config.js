import { configure } from "@dlevs/eslint-config";

export default [
  {
    ignores: ["dist/**"],
  },
  ...configure(),
];
