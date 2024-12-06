import {InvalidMethod, UnknownRequestType} from './errors';
import type {Env, CronTrigger} from './types';
import {corsHeaders} from './utils';

const BASE_URL = 'http://127.0.0.1';

// In order for the workers runtime to find the class that implements
// our Durable Object namespace, we must export it from the root module.
export {RevealQueue} from './RevealQueue';

function handleOptions(request: Request) {
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS pre-flight request.
    return new Response(null, {
      headers: corsHeaders,
    });
  } else {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, POST, OPTIONS',
      },
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }
    try {
      const response = await handleRequest(request, env);
      return response;
    } catch (e: unknown) {
      // console.error('ERROR', e);
      const message = (e as {message: string}).message;
      if (message) {
        return new Response(message);
      } else {
        return new Response(e as string);
      }
    }
  },

  async scheduled(trigger: CronTrigger, env: Env, event: ScheduledEvent) {
    if (!env.PRIVATE_KEY) {
      console.error('no key setup');
      return;
    }
    const id = env.REVEAL_QUEUE.idFromName('A');
    const obj = env.REVEAL_QUEUE.get(id);
    if (trigger.cron === '* * * * *') {
      console.log('execute...');
      event.waitUntil(obj.fetch(`${BASE_URL}/execute`));
    } else if (trigger.cron === '*/1 * * * *') {
      console.log('checkPendingTransactions...');
      event.waitUntil(obj.fetch(`${BASE_URL}/checkPendingTransactions`));
    } else if (trigger.cron === '*/2 * * * *') {
      console.log('syncAccountBalances...');
      event.waitUntil(obj.fetch(`${BASE_URL}/syncAccountBalances`));
    }
  },
};

async function handleRequest(request: Request, env: Env): Promise<Response> {
  if (!env.PRIVATE_KEY) {
    console.error('no key setup');
    return new Response(JSON.stringify({error: 'No Key Setup'}), {status: 500});
  }

  const id = env.REVEAL_QUEUE.idFromName('A');
  const obj = env.REVEAL_QUEUE.get(id);

  const url = new URL(request.url);
  const method = request.method;
  const path = url.pathname.substr(1).split('/');
  const fnc = path[0];
  if (fnc === 'getTransactionInfo') {
    if (method !== 'GET') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'queueReveal') {
    if (method !== 'POST') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'register') {
    if (method !== 'POST') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'requestWithdrawal') {
    if (method !== 'POST') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'account') {
    if (method !== 'GET') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'getPendingTransactions') {
    if (method !== 'GET') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'getQueue') {
    // TODO remove unless admin
    if (method !== 'GET') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
    // } else if (fnc === 'deleteFromQueue') {
    //   // TODO remove unless admin
    //   if (method !== 'GET') {
    //     return InvalidMethod();
    //   }
    //   let resp = await obj.fetch(url.toString(), request);
    //   return resp;
  } else if (fnc === 'getRevealList') {
    // TODO remove unless admin
    if (method !== 'GET') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'setMaxFeePerGasSchedule') {
    if (method !== 'POST') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'adoptDefaultFeeSubmission' ){
     // TODO remove unless admin
    if (method !== 'GET') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'adoptDefaultFeeSubmissionOnReveal' ){
    // TODO remove unless admin
   if (method !== 'GET') {
     return InvalidMethod();
   }
   let resp = await obj.fetch(url.toString(), request);
   return resp;
  } else if (fnc === 'deleteAll') {
    // TODO remove unless admin
    if (method !== 'GET') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'getQueueAsSortedArray') {
    // TODO remove unless admin
    if (method !== 'GET') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'setSyncState') {
    // TODO remove unless admin
    if (method !== 'GET') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'getSyncState') {
    if (method !== 'GET') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'testChainId') {
    if (method !== 'GET') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'testBlockNumber') {
    if (method !== 'GET') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'direct') {
    const request = {
      method: 'eth_chainId',
      params: [],
      id: 1,
      jsonrpc: '2.0',
    };
    const response = await fetch(env.ETHEREUM_NODE, {
      method: 'POST',
      body: JSON.stringify(request),
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    });
    return new Response(JSON.stringify(await response.json()), {
      headers: {...corsHeaders, 'content-type': 'application/json;charset=UTF-8'},
      status: 200,
    });
  } else if (fnc === 'syncAccountBalances') {
    if (method !== 'GET') {
      return InvalidMethod();
    }
    console.log('syncAccountBalances...');
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  }
  return UnknownRequestType();
}
