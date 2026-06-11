#!/usr/bin/env node

/**
 * VoltAdvance Keep-Awake Script
 * 
 * This script pings either the Supabase REST API directly (matching the original GitHub Action)
 * or pings the Next.js Keep-Alive endpoint.
 * 
 * Usage:
 *   node scripts/keep-awake.mjs
 * 
 * Can be run locally or scheduled on a VPS via crontab:
 *   0 9 *\/3 * * /usr/bin/node /path/to/voltadvance/scripts/keep-awake.mjs >> /path/to/voltadvance/keep-awake.log 2>&1
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Try to load .env.local or .env file manually
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '../.env.local'),
    path.join(__dirname, '../.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          
          // Remove wrapping quotes if present
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
          }
          
          if (!process.env[key]) {
            process.env[key] = value.trim();
          }
        }
      });
      console.log(`Loaded environment configuration from: ${path.basename(envPath)}`);
      return;
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET;
const appUrl = process.env.APP_URL || 'http://localhost:3000';

async function pingSupabaseDirect() {
  const apiKey = serviceRoleKey || supabaseAnonKey;
  if (!supabaseUrl || !apiKey) {
    console.warn('⚠️ Supabase credentials missing. Skipping direct Supabase ping.');
    return false;
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/`;
  console.log(`Pinging Supabase API directly: ${endpoint} (using ${serviceRoleKey ? 'service_role key' : 'anon key'})`);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (response.ok) {
      console.log(`✅ Supabase Direct Ping: Success (Status ${response.status})`);
      return true;
    } else {
      console.error(`❌ Supabase Direct Ping: Failed (Status ${response.status})`);
      const text = await response.text();
      console.error(text);
      return false;
    }
  } catch (error) {
    console.error('❌ Supabase Direct Ping: Network/Connection Error', error);
    return false;
  }
}

async function pingNextApiRoute() {
  const endpoint = `${appUrl.replace(/\/$/, '')}/api/cron/keep-alive`;
  console.log(`Pinging Next.js Keep-Alive endpoint: ${endpoint}`);

  try {
    const headers = {};
    if (cronSecret) {
      headers['Authorization'] = `Bearer ${cronSecret}`;
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers
    });

    const data = await response.json().catch(() => null);

    if (response.ok) {
      console.log('✅ Next.js Cron Ping: Success');
      console.log(JSON.stringify(data, null, 2));
      return true;
    } else {
      console.error(`❌ Next.js Cron Ping: Failed (Status ${response.status})`);
      console.error(JSON.stringify(data || 'Invalid JSON response', null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Next.js Cron Ping: Network/Connection Error', error);
    return false;
  }
}

async function run() {
  console.log(`\n--- Keep-Awake Ping Run: ${new Date().toISOString()} ---`);
  
  // Try direct Supabase REST endpoint ping (primary keep-awake query)
  const directSuccess = await pingSupabaseDirect();
  
  // Also ping Next.js API route if app URL is set or running locally
  const apiSuccess = await pingNextApiRoute();

  if (directSuccess || apiSuccess) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run();
