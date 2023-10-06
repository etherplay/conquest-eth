import type {Fleet} from '$lib/space/fleets';
import {BaseStore} from '$lib/utils/stores/base';

class FleetSelectionStore extends BaseStore<Fleet> {
  constructor() {
    super(undefined);
  }

  select(fleet: Fleet): void {
    this.set(fleet);
  }

  unselect(): void {
    this.set(undefined);
  }
}

const fleetselection = new FleetSelectionStore();

export default fleetselection;

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).fleetselection = fleetselection;
}
