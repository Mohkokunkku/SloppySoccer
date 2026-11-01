import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
export default defineConfig({
  testDir:'./tests/browser',fullyParallel:false,workers:1,timeout:45_000,
  use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1440,height:960},headless:true,trace:'retain-on-failure',launchOptions:{args:['--enable-unsafe-swiftshader']}},
  webServer:{command:'node dist-server/server/index.js',url:'http://127.0.0.1:4173/api/health',reuseExistingServer:false,timeout:20_000,
    env:{PORT:'4173',HOST:'127.0.0.1',STATIC_DIR:resolve('dist'),DATA_DIR:resolve('.local-server/e2e-data')}},
});
