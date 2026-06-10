const fs = require('fs');

async function run() {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const envConfig = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match) {
      envConfig[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  });

  const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    });
    const spec = await response.json();
    console.log('Exposed paths:');
    Object.keys(spec.paths).forEach(path => {
      console.log('  ', path);
    });
  } catch (err) {
    console.error('Failed to fetch:', err);
  }
}

run();
