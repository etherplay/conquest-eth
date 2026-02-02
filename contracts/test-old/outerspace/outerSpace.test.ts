// import {expect} from '../chai-setup';
import {acquire} from './utils';
import {setup} from '../fixtures/outerspaceAndPlayerWithTokens';

describe('OuterSpace', function () {
  it('user can acquire virgin planet', async function () {
    const {players, spaceInfo} = await setup();
    const pointer = spaceInfo.findNextPlanet();
    await acquire(players[0], pointer.data);
  });
});
