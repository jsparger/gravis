import node from "rollup-plugin-node-resolve";

export default {
  entry: "index.js",
  format: "umd",
  moduleName: "gravis",
  plugins: [node()],
  dest: "dist/gravis.js"
};
