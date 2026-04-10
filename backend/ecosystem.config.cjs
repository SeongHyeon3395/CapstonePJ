module.exports = {
  apps: [
    {
      name: 'spectrum-backend',
      script: 'dist/app.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 20,
      restart_delay: 3000,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
