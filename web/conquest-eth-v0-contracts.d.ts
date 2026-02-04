// TODO remove this file, fix tsconfig and import directly from conquest-eth-v0-contracts
declare module 'conquest-eth-v0-contracts' {
  // Re-export all types and classes from the actual type definitions
  export type {
    PlanetInfo,
    PlanetState,
    PlanetLocation,
    TxStatus,
    Statistics,
  } from './node_modules/conquest-eth-v0-contracts/dist/js/types';
  export type {
    LocationPointer,
    StrictLocationPointer,
  } from './node_modules/conquest-eth-v0-contracts/dist/js/util/location';
  export type {Outcome} from './node_modules/conquest-eth-v0-contracts/dist/js/model/SpaceInfo';

  export {SpaceInfo} from './node_modules/conquest-eth-v0-contracts/dist/js/model/SpaceInfo';
  export {
    locationToXY,
    xyToLocation,
    nextInSpiral,
    coordFromLocation,
    coordFromXY,
    coordFromXYObject,
  } from './node_modules/conquest-eth-v0-contracts/dist/js/util/location';
}
