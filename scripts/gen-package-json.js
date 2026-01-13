import fs from "node:fs";
import JSON5 from "json5";

const json5 = fs.readFileSync("package.json5", "utf8");
const data = JSON5.parse(json5);

// Read Node version
const nodeVersion = fs.readFileSync(".node-version", "utf8").trim();

// Read pnpm version from .npmrc
const npmrc = fs.readFileSync(".npmrc", "utf8");
const match = npmrc.match(/package-manager=pnpm@([\d.]+)/);
const pnpmVersion = match ? match[1] : null;

// Inject Volta block
data.volta = {
  node: nodeVersion,
  pnpm: pnpmVersion
};

fs.writeFileSync("package.json", JSON.stringify(data, null, 2));
console.log("Generated package.json from package.json5");