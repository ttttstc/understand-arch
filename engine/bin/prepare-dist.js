#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const coreDist = path.resolve(__dirname, "..", "dist", "core");
fs.mkdirSync(coreDist, { recursive: true });
fs.writeFileSync(path.join(coreDist, "package.json"), `${JSON.stringify({ type: "module" }, null, 2)}\n`);

