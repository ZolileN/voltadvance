const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple parser for .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const envConfig = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2].trim();
    // remove quotes if any
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    envConfig[key] = val;
  }
});

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

console.log('Connecting to:', supabaseUrl);

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  try {
    const { data, error } = await supabase.from('borrowers').select('*').limit(1);
    if (error) {
      console.error('Error fetching borrowers:', error);
    } else {
      console.log('Successfully connected! Borrowers sample:', data);
    }
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

run();
