import {BaseStore} from '$lib/utils/stores/base';
import {locationToXY} from 'conquest-eth-common';

export type Selection = {
  x: number;
  y: number;
};

class SelectionStore extends BaseStore<Selection> {
  constructor() {
    super(undefined);
  }

  select(x: number, y: number): void {
    this.set({x, y});
  }

  selectViaId(id: string): void {
    this.set(locationToXY(id));
  }

  unselect(): void {
    this.set(undefined);
  }
}

export default new SelectionStore();
