import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    ignores: [".next/**", "node_modules/**", "out/**", "dist/**"],
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/set-state-in-effect": "off"
    }
  }
];

export default eslintConfig;
