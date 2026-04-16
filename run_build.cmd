@echo off

pnpm install
pnpm run build

cd "./dist/caddy"
run_caddy
