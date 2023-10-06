// import {ProviderWrapper} from 'hardhat/internal/core/providers/wrapper';
import {BackwardsCompatibilityProviderAdapter} from 'hardhat/internal/core/providers/backwards-compatibility';
import {EIP1193Provider, RequestArguments} from 'hardhat/types';
import {parse as parseTransaction, Transaction} from '@ethersproject/transactions';
import {EthereumProvider, HardhatRuntimeEnvironment} from 'hardhat/types';
import {extendEnvironment} from 'hardhat/config';
import {lazyObject} from 'hardhat/plugins';
import {EventEmitter} from 'events';
import {InvalidInputError} from 'hardhat/internal/core/providers/errors';

// IMPORTANT NOTE: This class is type-checked against the currently installed
// version of @types/node (10.x atm), and manually checked to be compatible with
// Node.js up to 14.3.0 (the latest release atm). There's a test that ensures
// that we are exporting all the EventEmitter's members, but it can't check the
// actual types of those members if they are functions.
//
// If a new version of Node.js adds new members to EventEmitter or overloads
// existing ones this class has to be updated, even if it still type-checks.
// This is a serious limitation ot DefinitelyTyped when the original, un-typed,
// library can change because of the user having a different version.
export class EventEmitterWrapper implements EventEmitter {
  constructor(private readonly _wrapped: EventEmitter) {}

  public addListener(event: string | symbol, listener: (...args: any[]) => void): this {
    this._wrapped.addListener(event, listener);
    return this;
  }

  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    this._wrapped.on(event, listener);
    return this;
  }

  public once(event: string | symbol, listener: (...args: any[]) => void): this {
    this._wrapped.once(event, listener);
    return this;
  }

  public prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
    this._wrapped.prependListener(event, listener);
    return this;
  }

  public prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
    this._wrapped.prependOnceListener(event, listener);
    return this;
  }

  public removeListener(event: string | symbol, listener: (...args: any[]) => void): this {
    this._wrapped.removeListener(event, listener);
    return this;
  }

  public off(event: string | symbol, listener: (...args: any[]) => void): this {
    this._wrapped.off(event, listener);
    return this;
  }

  public removeAllListeners(event?: string | symbol | undefined): this {
    this._wrapped.removeAllListeners(event);
    return this;
  }

  public setMaxListeners(n: number): this {
    this._wrapped.setMaxListeners(n);
    return this;
  }

  public getMaxListeners(): number {
    return this._wrapped.getMaxListeners();
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  public listeners(event: string | symbol): Function[] {
    return this._wrapped.listeners(event);
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  public rawListeners(event: string | symbol): Function[] {
    return this._wrapped.rawListeners(event);
  }

  public emit(event: string | symbol, ...args: any[]): boolean {
    return this._wrapped.emit(event, ...args);
  }

  public eventNames(): Array<string | symbol> {
    return this._wrapped.eventNames();
  }

  public listenerCount(type: string | symbol): number {
    return this._wrapped.listenerCount(type);
  }
}

export abstract class ProviderWrapper extends EventEmitterWrapper implements EIP1193Provider {
  constructor(protected readonly _wrappedProvider: EIP1193Provider) {
    super(_wrappedProvider);
  }

  public abstract request(args: RequestArguments): Promise<unknown>;

  protected _getParams<ParamsT extends any[] = any[]>(args: RequestArguments): ParamsT | [] {
    const params = args.params;

    if (params === undefined) {
      return [];
    }

    if (!Array.isArray(params)) {
      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw new InvalidInputError("Hardhat Network doesn't support JSON-RPC params sent as an object");
    }

    return params as ParamsT;
  }
}

export class ExtendedProvider extends ProviderWrapper {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private txsToIgnore: {[txRawData: string]: any} = {};

  constructor(provider: EIP1193Provider) {
    super(provider);
  }

  public async request(args: RequestArguments): Promise<unknown> {
    if (args.method == 'hardhat_ignoreTransaction') {
      const params = this._getParams(args);
      if (!this.txsToIgnore[params[0]]) {
        console.log('ignoring ', params[0]);
        this.txsToIgnore[params[0]] = true;
        await this._wrappedProvider.request({
          method: 'hardhat_dropTransaction',
          params,
        });
      }
      return {success: true};
    } else if (args.method == 'eth_sendRawTransaction') {
      const params = this._getParams(args);
      const tx: Transaction = parseTransaction(params[0]);
      if (!tx.hash) {
        console.log(`cannot decode tx with hash`, tx);
      } else {
        const pastResponse = this.txsToIgnore[tx.hash];
        if (pastResponse) {
          return pastResponse;
        }
      }
    }

    return this._wrappedProvider.request(args);
  }
}

extendEnvironment((hre: HardhatRuntimeEnvironment) => {
  // hre.network.provider = lazyObject(() => {
  //   const provider = new ExtendedProvider(hre.network.provider);
  //   return new BackwardsCompatibilityProviderAdapter(provider);
  // });

  const provider = new ExtendedProvider(hre.network.provider);
  hre.network.provider = new BackwardsCompatibilityProviderAdapter(provider);
});

// import {subtask} from 'hardhat/config';
// import {TASK_NODE_SERVER_CREATED} from 'hardhat/builtin-tasks/task-names';
// import {EthereumProvider} from 'hardhat/types';
// import {JsonRpcServer} from 'hardhat/types';
// import {
//   parse as parseTransaction,
//   Transaction,
// } from '@ethersproject/transactions';

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// const txsToIgnore: {[txRawData: string]: any} = {};

// subtask(TASK_NODE_SERVER_CREATED).setAction(
//   async ({
//     provider,
//   }: {
//     hostname: string;
//     port: number;
//     provider: EthereumProvider;
//     server: JsonRpcServer;
//   }) => {
//     let providerSend: any | undefined;
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     let actualProvider = provider as {_wrapped?: any; _send?: any};
//     while (actualProvider._wrapped) {
//       actualProvider = actualProvider._wrapped;
//     }
//     if (actualProvider._send) {
//       providerSend = actualProvider._send.bind(actualProvider);
//       console.log(actualProvider);
//     } else {
//       console.log(`cannot find _send`);
//       return;
//     }

//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     (provider as any)._send = async (method: string, params: any[] = []) => {
//       if (method == 'hardhat_ignoreTransaction') {
//         if (!txsToIgnore[params[0]]) {
//           console.log('ignoring ', params[0]);
//           txsToIgnore[params[0]] = true;
//           await providerSend('hardhat_dropTransaction', params);
//         }
//         return {success: true};
//       } else if (method == 'eth_sendRawTransaction') {
//         const tx: Transaction = parseTransaction(params[0]);
//         if (!tx.hash) {
//           console.log(`cannot decode tx with hash`, tx);
//         } else {
//           const pastResponse = txsToIgnore[tx.hash];
//           if (pastResponse) {
//             return pastResponse;
//           }
//         }
//       }

//       return providerSend(method, params);
//     };
//   }
// );

// import {EthereumProvider, HardhatRuntimeEnvironment} from 'hardhat/types';
// import {extendEnvironment} from 'hardhat/config';
// import {lazyObject} from 'hardhat/plugins';
// import {
//   parse as parseTransaction,
//   Transaction,
// } from '@ethersproject/transactions';

// class ProviderExtended extends ethers.providers.JsonRpcProvider {
//   private readonly _hardhatProvider: EthereumProvider;

//   constructor(hardhatProvider: EthereumProvider) {
//     super();
//     this._hardhatProvider = hardhatProvider;
//   }

//   public async send(method: string, params: any): Promise<any> {
//     const result = await this._hardhatProvider.send(method, params);

//     // We replicate ethers' behavior.
//     this.emit("debug", {
//       action: "send",
//       request: {
//         id: 42,
//         jsonrpc: "2.0",
//         method,
//         params,
//       },
//       response: result,
//       provider: this,
//     });

//     return result;
//   }

//   public toJSON() {
//     return "<WrappedHardhatProvider>";
//   }
// }

// extendEnvironment((hre: HardhatRuntimeEnvironment) => {
//   hre.ethers = lazyObject(() => {
//     const { createProviderProxy } =
//       require("./provider-proxy") as typeof ProviderProxyT;

//     const { ethers } = require("ethers") as typeof EthersT;

//     const providerProxy = createProviderProxy(hre.network.provider);

//     return {
//       ...ethers,

//       // The provider wrapper should be removed once this is released
//       // https://github.com/nomiclabs/hardhat/pull/608
//       provider: providerProxy,

//       getSigner: (address: string) => getSigner(hre, address),
//       getSigners: () => getSigners(hre),
//       // We cast to any here as we hit a limitation of Function#bind and
//       // overloads. See: https://github.com/microsoft/TypeScript/issues/28582
//       getContractFactory: getContractFactory.bind(null, hre) as any,
//       getContractAt: getContractAt.bind(null, hre),
//     };
//   });
// });
