/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */

// renames package.json out of the way, runs pnpm with package.json5, then restores package.json.
// intended to be run as: pnpm run dev

// this is a workaround to have package.json in play to block running via npm
// but then also kick over to the true package.json5 for pnpm to use.
// json5 offers advantages like comments

const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const cwd = process.cwd();
const pkgJson = path.join(cwd, 'package.json');
// const pkgJson5 = path.join(cwd, 'package.json5');
const pkgJsonHide = path.join(cwd, 'hide.package.json.hide');

function move(src, dest) {
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
  }
}

function restore(src, dest) {
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
  }
}

// Move package.json out of the way
move(pkgJson, pkgJsonHide);

// Run pnpm with package.json5 (non-blocking)
const args = process.argv.slice(2);
// const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const child = spawn("pnpm", args, {
  stdio: 'inherit',
  cwd,
  env: {
    ...process.env,
    // Optionally, force pnpm to use package.json5
    // Not strictly needed if pnpm is configured for JSON5
  }
});

// Restore package.json after 2 seconds
setTimeout(() => {
  restore(pkgJsonHide, pkgJson);
}, 2000);

// Exit with the same code as pnpm when it finishes
child.on('exit', code => {
  process.exit(code || 0);
});
