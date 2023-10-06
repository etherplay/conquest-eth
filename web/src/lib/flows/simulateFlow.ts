import {spaceInfo} from '$lib/space/spaceInfo';
import {BaseStoreWithData} from '$lib/utils/stores/base';
import type {PlanetInfo} from 'conquest-eth-common';

export type VirtualFleetSimulation = {
  from: PlanetInfo;
  to: PlanetInfo;
};

type Data = {
  to: {x: number; y: number};
  from: {x: number; y: number};
};

export type SimulateFlow = {
  type: 'SEND';
  step: 'IDLE' | 'PICK_DESTINATION' | 'SIMULATE';
  pastStep: 'IDLE' | 'PICK_DESTINATION' | 'SIMULATE';
  data?: Data;
  error?: {message?: string};
};

export function virtualFleetSimulationTo(simulateFlowData: Data, pos: {x: number; y: number}): VirtualFleetSimulation {
  return {
    from: spaceInfo.getPlanetInfo(simulateFlowData.from.x, simulateFlowData.from.y),
    // owner: '0x0000000000000000000000000000000000000000', // TODO
    to: spaceInfo.getPlanetInfo(pos.x, pos.y),
  };
}

class SimulateFlowStore extends BaseStoreWithData<SimulateFlow, Data> {
  constructor() {
    super({
      type: 'SEND',
      step: 'IDLE',
      pastStep: 'IDLE',
    });
  }

  async simulateFrom(from: {x: number; y: number}): Promise<void> {
    this.setData({from}, {step: 'PICK_DESTINATION', pastStep: 'PICK_DESTINATION'});
  }

  async simulate(to: {x: number; y: number}) {
    this.setData({to}, {step: 'SIMULATE'});
  }

  async cancel(): Promise<void> {
    this._reset();
  }

  async back(): Promise<void> {
    if (this.$store.pastStep === 'PICK_DESTINATION') {
      this.setData({to: undefined});
    }
    this.setPartial({step: this.$store.pastStep});
  }

  async acknownledgeSuccess(): Promise<void> {
    this._reset();
  }

  async acknownledgeError(): Promise<void> {
    this.setPartial({error: undefined});
  }

  private _reset() {
    this.setPartial({step: 'IDLE', data: undefined});
  }
}

export default new SimulateFlowStore();
