import node from "rollup-plugin-node-resolve";

export default {
  entry: "test/visualization.js",
  format: "iife",
  moduleName: "test",
  plugins: [node()],
  dest: "test.js"
};
