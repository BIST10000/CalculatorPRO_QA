import { defineConfig } from '@playwright/test';
const production = process.env.LAB_PREVIEW === '1';
const url = production ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173';
export default defineConfig({
  testDir:'./e2e', workers:1, timeout:30000,
  use:{baseURL:url,headless:true,viewport:{width:1440,height:1000},launchOptions:{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}},
  webServer:{command:production?'npm.cmd run preview -- --port 4173 --strictPort':'npm.cmd run dev -- --port 5173 --strictPort',url,reuseExistingServer:true},
});
