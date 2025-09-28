module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      "babel-preset-expo",
      ["@babel/preset-env", { targets: { node: "current" } }], // add preset-env
    ],
    plugins: [
      "@babel/plugin-proposal-nullish-coalescing-operator",
      "@babel/plugin-proposal-optional-chaining",
      "@babel/plugin-transform-optional-chaining",
      "@babel/plugin-transform-template-literals",
      "react-native-reanimated/plugin", // must stay last
    ],
  };
};
