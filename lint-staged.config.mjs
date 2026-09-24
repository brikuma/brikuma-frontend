const config = {
  "*.{ts,tsx,js,mjs,cjs}": ["prettier --check", "eslint --max-warnings 0"],
  "*.{md,json,css,yml,yaml}": "prettier --check",
};

export default config;
