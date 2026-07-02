// PM2 process file for a NestJS + Next.js Turborepo monorepo.
// Place at the repo root. Both apps bind to 127.0.0.1 only — Caddy is the public
// entry point (see Caddyfile). Run as the non-root 'deploy' user.
//
// Make each app's package.json "start" script bind the right host/port:
//   apps/api/package.json -> "start": "node dist/main.js"   (Nest reads PORT/HOST from env)
//   apps/web/package.json -> "start": "next start -p 3000 -H 127.0.0.1"
//
// Use "pnpm" instead of "npm" below if it's a pnpm repo (recon tells you).

module.exports = {
  apps: [
    {
      name: 'api',                 // NestJS
      cwd: './apps/api',
      script: 'npm',               // or 'pnpm'
      args: 'start',
      exec_mode: 'fork',
      instances: 1,
      env: { NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '4000' },
      max_memory_restart: '512M',  // friendly to a 4 GB box
      out_file: '../../logs/api.out.log',
      error_file: '../../logs/api.err.log',
      time: true,
    },
    {
      name: 'web',                 // Next.js
      cwd: './apps/web',
      script: 'npm',               // or 'pnpm'
      args: 'start',
      exec_mode: 'fork',
      instances: 1,
      env: { NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: '3000' },
      max_memory_restart: '512M',
      out_file: '../../logs/web.out.log',
      error_file: '../../logs/web.err.log',
      time: true,
    },
  ],
};
