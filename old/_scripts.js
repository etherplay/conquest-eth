#!/usr/bin/env node
'use strict';
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const {spawn, exec} = require('child_process');
const fs = require('fs');

const commandlineArgs = process.argv.slice(2);

function wait(numSeconds) {
  return new Promise(resolve => {
    setTimeout(resolve, numSeconds * 1000);
  });
}

function getCurrentBranch() {
  return new Promise((resolve, reject) => {
    if (process.env.VERCEL_GIT_COMMIT_REF) {
      return resolve(process.env.VERCEL_GIT_COMMIT_REF);
    }
    try {
      exec('git rev-parse --abbrev-ref HEAD', (error, stdout, stderr) => {
        if (error !== null) {
          reject('git error: ' + error + stderr);
        } else {
          resolve(stdout.toString().trim());
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function getNetworkName() {
  let networkName = process.env.NETWORK_NAME;
  if (!networkName) {
    console.log(`no NETWORK_NAME specified`);
    try {
      let branch = await getCurrentBranch();
      console.log(`branch: ${branch}`);
      if (branch.indexOf('/') !== -1) {
        const components = branch.split('/');
        branch = components[0];
      } else if (branch.indexOf('_') !== -1) {
        const components = branch.split('_');
        branch = components[0];
      }
      if (fs.existsSync(`contracts/deployments/${branch}`)) {
        networkName = branch;
      }
      console.log(`networkName: ${networkName}`);
    } catch (e) {
      console.error(e);
    }
  }
  // console.log(`networkName: ${networkName}`);
  return networkName;
}

function parseArgs(rawArgs, numFixedArgs, expectedOptions) {
  const fixedArgs = [];
  const options = {};
  const extra = [];
  const alreadyCounted = {};
  for (let i = 0; i < rawArgs.length; i++) {
    const rawArg = rawArgs[i];
    if (rawArg.startsWith('--')) {
      const optionName = rawArg.slice(2);
      const optionDetected = expectedOptions[optionName];
      if (!alreadyCounted[optionName] && optionDetected) {
        alreadyCounted[optionName] = true;
        if (optionDetected === 'boolean') {
          options[optionName] = true;
        } else {
          i++;
          options[optionName] = rawArgs[i];
        }
      } else {
        if (fixedArgs.length < numFixedArgs) {
          throw new Error(`expected ${numFixedArgs} fixed args, got only ${fixedArgs.length}`);
        } else {
          extra.push(rawArg);
        }
      }
    } else {
      if (fixedArgs.length < numFixedArgs) {
        fixedArgs.push(rawArg);
      } else {
        for (const opt of Object.keys(expectedOptions)) {
          alreadyCounted[opt] = true;
        }
        extra.push(rawArg);
      }
    }
  }
  return {options, extra, fixedArgs};
}

function execute(command) {
  return new Promise((resolve, reject) => {
    const onExit = error => {
      if (error) {
        return reject(error);
      }
      resolve();
    };
    spawn(command.split(' ')[0], command.split(' ').slice(1), {
      stdio: 'inherit',
      shell: true
    }).on('exit', onExit);
  });
}

function getEnv(network) {
  let env = 'dotenv -e .env -e contracts/.env -- ';
  if (network && network !== 'localhost') {
    if (fs.existsSync(`.env.web.${network}`) || fs.existsSync(`.env.${network}`)) {
      env = `dotenv `;
      if (fs.existsSync(`.env.${network}`)) {
        env += ` -e .env.${network}`;
      }

      if (fs.existsSync(`.env.web.${network}`)) {
        env += ` -e .env.web.${network}`;
      }

      env += ` -e .env -e contracts/.env -- `;
    }
  }
  // console.log({ENV: env});
  return env;
}

async function performAction(rawArgs) {
  const firstArg = rawArgs[0];
  const args = rawArgs.slice(1);
  // console.log({firstArg, args});
  if (firstArg == 'contracts:dev') {
    const {fixedArgs, extra, options} = parseArgs(args, 0, {reset: 'boolean'});
    if (options.reset) {
      await execute('rimraf agent-service/src/contracts.json');
      await execute('rimraf contracts/deployments/localhost && rimraf web/src/lib/contracts.json');
    }
    await execute(
      `dotenv -e .env -e contracts/.env -- npm --prefix contracts run dev -- --export ../web/src/lib/contracts.json`
    );
  } else if (firstArg == 'contracts:node') {
    await execute(`dotenv -e .env -e contracts/.env -- npm --prefix contracts run dev:node -- --no-deploy`);
  } else if (firstArg == 'contracts:local:dev') {
    const {fixedArgs, extra, options} = parseArgs(args, 0, {reset: 'boolean'});
    if (options.reset) {
      await execute('rimraf agent-service/src/contracts.json');
      await execute('rimraf contracts/deployments/localhost && rimraf web/src/lib/contracts.json');
    }
    console.log(`waiting on local node...`);
    await execute(`wait-on tcp:127.0.0.1:8545`);

    await performAction([`contracts:execute`, 'localhost', 'contracts/scripts/fundingFromCoinbase.ts']);
    await wait(1); // slight delay to ensure ethereum node is actually ready
    await execute(
      `dotenv -e .env -e contracts/.env -- npm --prefix contracts run local:dev -- --export ../web/src/lib/contracts.json`
    );
  } else if (firstArg === 'contracts:deploy') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || 'localhost';
    const env = getEnv(network);
    await execute(
      `${env}npm --prefix contracts run deploy ${network} -- --export ../web/src/lib/contracts.json ${extra.join(' ')}`
    );
  } else if (firstArg === 'contracts:void:deploy') {
    await execute(`dotenv -e .env -e contracts/.env -- npm --prefix contracts run void:deploy`);
  } else if (firstArg === 'contracts:fork:deploy') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || 'localhost';
    const env = getEnv(network);
    await execute(`${env}npm --prefix contracts run fork:deploy ${network} -- ${extra.join(' ')}`);
  } else if (firstArg === 'contracts:fork:dev') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || 'localhost';
    const env = getEnv(network);
    await execute(`${env}npm --prefix contracts run fork:dev ${network} -- ${extra.join(' ')}`);
  } else if (firstArg === 'contracts:fork:node') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || 'localhost';
    const env = getEnv(network);
    await execute(`${env}npm --prefix contracts run fork:node ${network} -- ${extra.join(' ')}`);
  } else if (firstArg === 'contracts:export') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0];
    if (!network) {
      console.error(`need to specify the network as first argument`);
      return;
    }
    const env = getEnv(network);
    await execute(`${env}npm --prefix contracts run export ${network} -- ../web/src/lib/contracts.json`);
  } else if (firstArg === 'contracts:metadata') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0];
    if (!network) {
      console.error(`need to specify the network as first argument`);
      return;
    }
    const env = getEnv(network);
    await execute(`${env}npm --prefix contracts run metadata ${network}`);
  } else if (firstArg === 'contracts:metadata') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0];
    if (!network) {
      console.error(`need to specify the network as first argument`);
      return;
    }
    const env = getEnv(network);
    await execute(`${env}npm --prefix contracts run metadata ${network}`);
  } else if (firstArg === 'contracts:seed') {
    const {fixedArgs, extra, options} = parseArgs(args, 1, {waitContracts: 'boolean'});
    const network = fixedArgs[0] || 'localhost';
    const env = getEnv(network);
    if (options.waitContracts) {
      console.log(`waiting for web/src/lib/contracts.json...`);
      await execute(`wait-on web/src/lib/contracts.json`);
    }
    await execute(`${env}npm --prefix contracts run execute ${network} scripts/seed.ts ${extra.join(' ')}`);
  } else if (firstArg === 'contracts:execute') {
    const {fixedArgs, extra, options} = parseArgs(args, 1, {waitContracts: 'boolean'});
    const network = fixedArgs[0] || 'localhost';
    const env = getEnv(network);
    if (options.waitContracts) {
      console.log(`waiting for web/src/lib/contracts.json...`);
      await execute(`wait-on web/src/lib/contracts.json`);
    }
    await execute(`${env}npm --prefix contracts run execute ${network} ${extra.join(' ')}`);
  } else if (firstArg === 'contracts:fork:execute') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || 'localhost';
    const env = getEnv(network);
    await execute(`${env}npm --prefix contracts run fork:execute ${network} ${extra.join(' ')}`);
  } else if (firstArg === 'contracts:etherscan-verify') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0];
    if (!network) {
      console.error(`need to specify the network as first argument`);
      return;
    }
    const env = getEnv(network);
    await execute(
      `${env}npm --prefix contracts run hardhat -- --network ${network} etherscan-verify  ${extra.join(' ')}`
    );
  } else if (firstArg === 'contracts:sourcify') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0];
    if (!network) {
      console.error(`need to specify the network as first argument`);
      return;
    }
    const env = getEnv(network);
    await execute(`${env}npm --prefix contracts run hardhat -- --network ${network} sourcify  ${extra.join(' ')}`);
  } else if (firstArg === 'tenderly:push') {
    const {fixedArgs} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || 'localhost';
    const env = getEnv(network);
    await execute(`${env}npm --prefix contracts run tenderly:push ${network}`);
  } else if (firstArg === 'subgraph:build') {
    await execute(`dotenv -- npm --prefix subgraph run generate ../contracts/deployments/localhost mainnet`);
    await execute(`dotenv -- npm --prefix subgraph run codegen`);
    await execute(`dotenv -- npm --prefix subgraph run build`);
  } else if (firstArg === 'subgraph:dev') {
    await execute(`dotenv -- npm --prefix subgraph run setup`);
    await execute(`wait-on web/src/lib/contracts.json`);
    await execute(`dotenv -- npm --prefix subgraph run dev ../contracts/deployments/localhost mainnet`);
  } else if (firstArg === 'subgraph:deploy') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || 'localhost';
    const env = getEnv(network);
    let deployCommand = 'deploy';
    if (network && network !== 'localhost') {
      deployCommand = 'hosted:deploy';
    }
    await execute(`wait-on web/src/lib/contracts.json`);
    await execute(`${env}npm --prefix subgraph run ${deployCommand} ../contracts/deployments/${network}`);
  } else if (firstArg === 'subgraph:etherplay') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0];
    console.log({network});
    const env = getEnv(network);
    if (network === 'localhost') {
      throw new Error(`can't be on localhost`);
    }
    await execute(`wait-on web/src/lib/contracts.json`);
    await execute(`${env}npm --prefix subgraph run etherplay:deploy ../contracts/deployments/${network}`);
  } else if (firstArg === 'subgraph:alchemy') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0];
    const env = getEnv(network);
    if (network === 'localhost') {
      throw new Error(`can't be on localhost`);
    }
    await execute(`wait-on web/src/lib/contracts.json`);
    await execute(`${env}npm --prefix subgraph run alchemy:deploy ../contracts/deployments/${network}`);
  } else if (firstArg === 'agent-service:dev') {
    console.log(`waiting for web/src/lib/contracts.json...`);
    await execute(`wait-on web/src/lib/contracts.json`);
    const {fixedArgs} = parseArgs(args, 1);
    const network = fixedArgs[0] || 'localhost';
    const env = getEnv(network);
    await execute(`${env}npm --prefix agent-service run dev ../contracts/deployments/localhost`);
  } else if (firstArg === 'agent-service:build') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || (await getNetworkName()) || 'localhost';
    const env = getEnv(network);
    await execute(`${env}npm --prefix agent-service run build ../contracts/deployments/${network}`);
  } else if (firstArg === 'agent-service:deploy') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0];
    if (!network) {
      console.error(`need to specify the network as first argument`);
      return;
    }
    const env = getEnv(network);
    // await performAction(['agent-service:build', network]);
    await execute(`${env}npm --prefix agent-service run deploy ../contracts/deployments/${network}`);
  } else if (firstArg === 'account-service:dev') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || (await getNetworkName()) || 'localhost';
    const env = getEnv(network);
    await execute(`${env}npm --prefix account-service run dev ${network}`);
  } else if (firstArg === 'account-service:build') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || (await getNetworkName()) || 'localhost';
    const env = getEnv(network);
    await execute(`${env}npm --prefix account-service run build ${network}`);
  } else if (firstArg === 'account-service:deploy') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || (await getNetworkName()) || 'localhost';
    const env = getEnv(network);
    await execute(`${env}npm --prefix account-service run deploy ${network}`);
  } else if (firstArg === 'web:dev') {
    const {fixedArgs, options, extra} = parseArgs(args, 1, {
      skipContracts: 'boolean',
      waitContracts: 'boolean',
      inspect: 'boolean'
    });
    const network = fixedArgs[0] || 'localhost';
    if (!options.skipContracts) {
      await performAction(['contracts:export', network]);
    }
    if (options.waitContracts) {
      await execute(`wait-on web/src/lib/contracts.json`);
    }
    const env = getEnv(network);
    if (options.inspect) {
      await execute(`${env}npm --prefix web run dev:inspect -- ${extra.join(' ')}`);
    } else {
      await execute(`${env}npm --prefix web run dev -- ${extra.join(' ')}`);
    }
  } else if (firstArg === 'web:build') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || (await getNetworkName()) || 'localhost';
    const env = getEnv(network);
    await execute(`${env}npm --prefix web run prepare`);
    await performAction(['contracts:export', network || 'localhost']);
    await execute(`${env}npm run common:build`);
    await execute(`${env}npm --prefix web run build`);
  } else if (firstArg === 'web:build:generic') {
    require('dotenv').config({path: '.env.web.generic'});
    process.env.MODE = 'dev';
    await execute(`npm --prefix contracts run void:deploy -- --export ../web/src/lib/contracts.json`);
    await execute(`npm --prefix web run prepare`);
    await execute(`npm run common:build`);
    await execute(`npm --prefix web run build`);
  } else if (firstArg === 'web:serve') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0];
    const env = getEnv(network);
    await execute(`${env}npm --prefix web run serve`);
  } else if (firstArg === 'web:build:serve') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || 'localhost';
    await performAction(['web:build', network || 'localhost']);
    await performAction(['web:serve', network || 'localhost']);
  } else if (firstArg === 'web:deploy') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0];
    if (!network) {
      console.error(`need to specify the network as first argument`);
      return;
    }
    const env = getEnv(network);
    await performAction(['web:build', network]);
    await execute(`${env}npm --prefix web run deploy`);
  } else if (firstArg === 'deploy') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || (await getNetworkName());
    if (!network) {
      console.error(`need to specify the network as first argument (or via env: NETWORK_NAME)`);
      return;
    }
    await performAction(['contracts:deploy', network]);
    await performAction(['subgraph:deploy', network]);
    await performAction(['agent-service:deploy', network]);
    await performAction(['account-service:deploy', network]);
    await performAction(['web:deploy', network]);
  } else if (firstArg === 'deploy:noweb') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || (await getNetworkName());
    if (!network) {
      console.error(`need to specify the network as first argument (or via env: NETWORK_NAME)`);
      return;
    }
    await performAction(['contracts:deploy', network]);
    await performAction(['subgraph:deploy', network]);
    await performAction(['agent-service:deploy', network]);
    await performAction(['account-service:deploy', network]);
  } else if (firstArg === 'stop') {
    await execute(`docker compose down -v --remove-orphans`);
  } else if (firstArg === 'externals') {
    await execute(`docker compose down -v --remove-orphans`);
    await execute(`docker compose up`);
  } else if (firstArg === 'externals:geth') {
    await execute(`docker compose down -v --remove-orphans`);
    await execute(`docker compose -f docker-compose.yml -f docker-compose.geth.yml up`);
  } else if (firstArg === 'dev') {
    const {extra} = parseArgs(args, 0, {});
    execute(`newsh "npm run common:dev"`);
    execute(`newsh "npm run web:dev localhost -- --skipContracts --waitContracts ${extra.join(' ')}"`);
    execute(`newsh "npm run agent-service:dev"`);
    execute(`newsh "npm run account-service:dev"`);
    execute(`newsh "npm run contracts:node"`);
    execute(`newsh "npm run contracts:local:dev -- --reset"`);
    execute(`newsh "npm run subgraph:dev"`);
    await performAction(['common:build']);
    await performAction(['contracts:seed', 'localhost', '--waitContracts']);
  } else if (firstArg === 'start') {
    const {extra} = parseArgs(args, 0, {});
    await execute(`docker compose down -v --remove-orphans`); // required else we run in race conditions
    execute(`newsh "npm run externals"`);
    execute(`newsh "npm run common:dev"`);
    execute(`newsh "npm run web:dev localhost -- --skipContracts --waitContracts ${extra.join(' ')}"`);
    execute(`newsh "npm run agent-service:dev"`);
    execute(`newsh "npm run account-service:dev"`);
    execute(`newsh "npm run contracts:node"`);
    execute(`newsh "npm run contracts:local:dev -- --reset"`);
    execute(`newsh "npm run subgraph:dev"`);
    await performAction(['common:build']);
    await performAction(['contracts:seed', 'localhost', '--waitContracts']);
  } else if (firstArg === 'start:nonode') {
    const {extra} = parseArgs(args, 0, {});
    await execute(`docker compose down -v --remove-orphans`); // required else we run in race conditions
    execute(`newsh "npm run externals"`);
    execute(`newsh "npm run common:dev"`);
    execute(`newsh "npm run web:dev localhost -- --skipContracts --waitContracts ${extra.join(' ')}"`);
    execute(`newsh "npm run agent-service:dev"`);
    execute(`newsh "npm run account-service:dev"`);
    execute(`newsh "npm run subgraph:dev"`);
    await performAction(['common:build']);
    await performAction(['contracts:seed', 'localhost', '--waitContracts']);
  } else if (firstArg === 'start:nonode') {
    const {extra} = parseArgs(args, 0, {});
    await execute(`docker compose down -v --remove-orphans`); // required else we run in race conditions
    execute(`newsh "npm run externals"`);
    execute(`newsh "npm run common:dev"`);
    execute(`newsh "npm run web:dev localhost -- --skipContracts --waitContracts ${extra.join(' ')}"`);
    execute(`newsh "npm run agent-service:dev"`);
    execute(`newsh "npm run account-service:dev"`);
    execute(`newsh "npm run subgraph:dev"`);
    await performAction(['common:build']);
    await performAction(['contracts:seed', 'localhost', '--waitContracts']);
  } else if (firstArg === 'start:geth') {
    const {extra} = parseArgs(args, 0, {});
    await execute(`docker compose down -v --remove-orphans`); // required else we run in race conditions
    execute(`newsh "npm run externals:geth"`);
    execute(`newsh "npm run common:dev"`);
    execute(`newsh "npm run web:dev localhost -- --skipContracts --waitContracts ${extra.join(' ')}"`);
    execute(`newsh "npm run agent-service:dev"`);
    execute(`newsh "npm run account-service:dev"`);
    execute(`newsh "npm run contracts:local:dev -- --reset"`);
    execute(`newsh "npm run subgraph:dev"`);
    await performAction(['common:build']);
    await performAction(['contracts:seed', 'localhost', '--waitContracts']);
  }
}

performAction(commandlineArgs);
