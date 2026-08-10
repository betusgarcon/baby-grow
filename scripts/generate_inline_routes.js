const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = "/Users/betus/Documents/trae_projects/baby-grow-mini";
const PROTOTYPE_ROOT = path.join(ROOT, "prototype_demo");
const ROUTES_PATH = path.join(PROTOTYPE_ROOT, "routes.js");

function readPrototypeData() {
  const code = fs.readFileSync(ROUTES_PATH, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  if (!sandbox.window.PROTOTYPE_DATA || !Array.isArray(sandbox.window.PROTOTYPE_DATA.routes)) {
    throw new Error("Failed to parse routes.js");
  }
  return sandbox.window.PROTOTYPE_DATA;
}

function writeInlineRoutes(routes) {
  const inlineHtml = {};
  routes.forEach((route) => {
    const absPath = path.resolve(PROTOTYPE_ROOT, route.src);
    inlineHtml[route.id] = fs.readFileSync(absPath, "utf8");
  });

  const outPath = path.join(PROTOTYPE_ROOT, "inline-routes.js");
  fs.writeFileSync(
    outPath,
    "window.PROTOTYPE_INLINE_HTML = " + JSON.stringify(inlineHtml) + ";\n",
    "utf8"
  );

  return Object.keys(inlineHtml).length;
}

function patchEntries() {
  const oldSnippet = '<script src="./routes.js"></script>\n  <script src="./app.js"></script>';
  const newSnippet = '<script src="./routes.js"></script>\n  <script src="./inline-routes.js"></script>\n  <script src="./app.js"></script>';
  let updated = 0;

  fs.readdirSync(PROTOTYPE_ROOT).forEach((name) => {
    if (!name.endsWith(".html")) {
      return;
    }
    const filePath = path.join(PROTOTYPE_ROOT, name);
    const html = fs.readFileSync(filePath, "utf8");
    if (html.includes(oldSnippet)) {
      fs.writeFileSync(filePath, html.replace(oldSnippet, newSnippet), "utf8");
      updated += 1;
    }
  });

  return updated;
}

function main() {
  const data = readPrototypeData();
  const routesCount = writeInlineRoutes(data.routes);
  const updatedCount = patchEntries();
  console.log(`routes=${routesCount}`);
  console.log(`updated=${updatedCount}`);
}

main();
