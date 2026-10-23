import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir:'./e2e',
  workers:1,
  timeout:180000,
  expect:{timeout:15000},
  use:{baseURL:'http://127.0.0.1:4175',channel:process.platform==='win32'?'msedge':undefined,viewport:{width:1280,height:900},screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4175 --strictPort',url:'http://127.0.0.1:4175',reuseExistingServer:false},
})
