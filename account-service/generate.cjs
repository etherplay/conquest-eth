/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');

const args = process.argv.slice(2);
const networkName = args[0];

const template = Handlebars.compile(fs.readFileSync('./templates/wrangler.toml.hbs').toString());
const environment = networkName === 'localhost' ? 'dev' : 'production';
const result = template({
  devMode: 'true', // TODOenvironment === 'dev' ? 'true' : 'false',
  networkName,
  DATA_DOG_API_KEY: process.env.DATA_DOG_API_KEY,
  environment,
});
fs.writeFileSync('./wrangler.toml', result);
