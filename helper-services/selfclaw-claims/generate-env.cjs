const fs = require('fs');
const args = process.argv.slice(2);

// ---------------------------------------------------
// from env file but we wrap in double quote the strings
// ---------------------------------------------------
// const { parse, stringify } = require('envfile')
/** Parse an envfile string. */
function parse(src) {
  const result = {};
  const lines = src.toString().split('\n');
  for (const line of lines) {
    const match = line.match(/^([^=:#]+?)[=:](.*)/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/['"]+/g, '');
      result[key] = value;
    }
  }
  return result;
}
/** Turn an object into an envfile string. */
function stringify(obj) {
  let result = '';
  for (const [key, value] of Object.entries(obj)) {
    if (key) {
      const line = `${key}="${String(value)}"`;
      result += line + '\n';
    }
  }
  return result;
}
// ---------------------------------------------------

if (args[0]) {
  const contractInfos = JSON.parse(fs.readFileSync(args[0], 'utf-8'));
  const parsedDevVars = parse(fs.readFileSync('.env.default', 'utf-8'));
  const parsedLocalDevVars = parse(fs.readFileSync('.env.default.local', 'utf-8'));
  console.log('parsedLocalDevVars', parsedLocalDevVars);
  console.log('parsedDevVars', parsedDevVars);

  const env = {
    ...parsedDevVars,
    ...parsedLocalDevVars,
  };

  if (contractInfos.contracts.FreePlayToken?.address) {
    env.TOKEN_ADDRESS = contractInfos.contracts.FreePlayToken.address;
  }

  // Write to .env for scripts (like claim.ts)
  fs.writeFileSync('.env', stringify(env));

  // Write to .dev.vars for wrangler local development
  // Wrangler uses .dev.vars for local secrets/env vars
  fs.writeFileSync('.dev.vars', stringify(env));
}
