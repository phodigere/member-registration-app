'use strict';

module.exports = {
  apps: [
    {
      name: 'member-registration-app',
      script: 'src/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '300M',
      watch: false,
      time: true,
      env: { NODE_ENV: 'production', PORT: 3000 },
    },
  ],
};