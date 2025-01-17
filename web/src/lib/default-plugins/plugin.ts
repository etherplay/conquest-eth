import type {SalesState, SaleState} from './salesQuery';
import {salesQuery} from './salesQuery';
import type {QueryState} from '$lib/utils/stores/graphql';
import type {Readable, Subscriber, Unsubscriber} from 'svelte/store';
import {get, writable} from 'svelte/store';

export type State = {
  initialized: boolean;
  account?: string;
  planet?: {
    info: {
      location: {id: string};
      stats: {
        name: string;
        cap: number;
      };
    };
    state: {
      owner?: string;
      numSpaceships: number;
    };
  };
};

const value: State = {
  initialized: false,
};

const store = writable(value);

export class GameContext implements Readable<State> {
  private origin: string;
  private counter = 0;
  private stopSubscibingToSales: () => void | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private promises: {[id: number]: {resolve: (result: any) => void; reject: (error: any) => void}} = {};

  constructor(private parentWindow: Window) {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.onParentMessage.bind(this));
    }
  }

  onParentMessage(event: MessageEvent) {
    // console.log(`EVENT`, event);
    if (event.source === this.parentWindow) {
      const data = event.data;
      let decoded;
      try {
        decoded = JSON.parse(data);
      } catch (error) {
        console.error(event);
      }
      if (decoded) {
        // console.log(`plugin receiving ${decoded.type}`);
        if (decoded.type === 'init') {
          this.setOrigin(event.origin);
          event.source.postMessage(
            JSON.stringify({
              type: 'init_acknowledged',
            }),
            event.origin
          );
          store.update((v) => {
            v.initialized = true;

            return v;
          });
          if (this.stopSubscibingToSales) {
            this.stopSubscibingToSales();
          }
          this.stopSubscibingToSales = salesQuery.subscribe((salesQueryResult: QueryState<SalesState>) => {
            if (salesQueryResult.data?.sales) {
              this.send_sales(salesQueryResult.data.sales);
            }
          });
        } else if (decoded.type === 'stop') {
          if (this.stopSubscibingToSales) {
            this.stopSubscibingToSales();
          }
        } else if (decoded.type === 'show_planet') {
          // console.log(`ACCOUNT: ${decoded.account}`);
          store.update((v) => ({
            initialized: v.initialized,
            account: decoded.account,
            planet: decoded.planet,
          }));
        } else if (decoded.type === 'scan_planets') {
          // TODO for now we scan all
        } else if (decoded.type === 'reply') {
          if (decoded.id && this.promises[decoded.id]) {
            if (decoded.error || !decoded.result) {
              console.log(decoded);
              this.promises[decoded.id].reject(decoded.error || 'no result');
            } else {
              this.promises[decoded.id].resolve(decoded.result);
            }
            delete this.promises[decoded.id];
          }
        }
      }
    }
  }

  setOrigin(o: string) {
    this.origin = o;
  }

  private send(obj: any) {
    this.parentWindow.postMessage(JSON.stringify(obj), this.origin);
  }

  send_tx(tx: {to: string; data: string}): Promise<string> {
    const id = ++this.counter;
    const promise = new Promise<string>((resolve, reject) => {
      this.promises[id] = {resolve, reject};
      this.send({type: 'send_tx', id, ...tx});
    });
    return promise;
  }

  send_sales(sales: SaleState[]) {
    const reset = {
      fields: ['basic_sale'],
      planets: [],
    };
    for (const sale of sales) {
      reset.planets.push({
        id: sale.id,
        basic_sale: sale.pricePerUnit,
        // timestamp: sale.timestamp, // TODO ?
      });
    }
    this.send({
      type: 'planets_reset',
      reset,
    });
  }

  startSendFlow(data) {
    this.send({
      type: 'send_flow',
      ...data,
    });
  }

  subscribe(run: Subscriber<State>, invalidate?: any): Unsubscriber {
    return store.subscribe(run, invalidate);
  }
}

export const context = new GameContext(typeof window !== 'undefined' ? window.parent : undefined);
