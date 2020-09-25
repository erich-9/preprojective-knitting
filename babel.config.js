module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        "corejs": 3,
        "debug": true,
        "targets": "> 0.001%",
        "useBuiltIns": "usage",
      }
    ]
  ]
};
