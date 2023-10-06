// import {expect} from 'chai';
import {
  countArrival,
  days,
  DEFAULT_MAX_UPKEEP,
  DEFAULT_PRODUCTION_PER_HOUR,
  DEFAULT_UPKEEP_DURATION_IN_SECONDS,
  FakePlanet,
  receiveSpaceships,
} from '../src/model/upkeep';
import {peek, send} from '../src/model/upkeep';

const defaultConfig = {
  stats: {
    production: DEFAULT_PRODUCTION_PER_HOUR,
    maxUpkeep: DEFAULT_MAX_UPKEEP,
  },
  world: {
    externalUpKeepDuration: DEFAULT_UPKEEP_DURATION_IN_SECONDS,
    externalUpkeepDownRate: DEFAULT_PRODUCTION_PER_HOUR / 10 / 3600,
  },
};

function defaultPlanet(config = defaultConfig): FakePlanet {
  const planet: FakePlanet = {
    stats: {
      production: config.stats.production,
      maxUpkeep: config.stats.maxUpkeep,
    },
    world: {
      externalUpKeepDuration: config.world.externalUpKeepDuration,
      externalUpkeepDownRate: config.world.externalUpkeepDownRate,
    },
    externalUpkeep: 0,
    externalUpkeepDuration: 0,
    lastUpdate: 0,
    numSpaceships: 0,
  };
  return planet;
}

describe('simple peek', () => {
  describe('upkeep, peek everyday', () => {
    it('works', () => {
      const planet = defaultPlanet();
      peek(planet, days(1));
      peek(planet, days(1));
      peek(planet, days(1));
      peek(planet, days(1));
      peek(planet, days(1));
      peek(planet, days(1));
      peek(planet, days(1));
      peek(planet, days(1));
      peek(planet, days(1));
      peek(planet, days(1));
    });
  });
  describe('upkeep, peek at larger interval', () => {
    it('works', () => {
      const planet = defaultPlanet();
      peek(planet, days(1));
      peek(planet, days(2));
      peek(planet, days(3));
      peek(planet, days(4));
    });
  });
});

describe('peek and send', () => {
  describe('upkeep, peek everyday', () => {
    it('works', () => {
      const planet = defaultPlanet();
      peek(planet, days(2));
      send(planet, days(1), 259200);
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
    });
    it('works', () => {
      const planet = defaultPlanet({
        stats: defaultConfig.stats,
        world: {externalUpKeepDuration: days(3), externalUpkeepDownRate: defaultConfig.world.externalUpkeepDownRate},
      });
      peek(planet, days(2));
      send(planet, days(1), 259200);
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
    });

    it('works with multi send', () => {
      const planet = defaultPlanet({
        stats: defaultConfig.stats,
        world: {externalUpKeepDuration: days(3), externalUpkeepDownRate: defaultConfig.world.externalUpkeepDownRate},
      });
      peek(planet, days(2));
      send(planet, days(1), 259200 / 2);
      send(planet, days(0), 259200 / 2);
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
    });
    it('works with multi send', () => {
      const planet = defaultPlanet({
        stats: defaultConfig.stats,
        world: {externalUpKeepDuration: days(3), externalUpkeepDownRate: defaultConfig.world.externalUpkeepDownRate},
      });
      peek(planet, days(2));
      send(planet, days(1), 259200 / 2);
      send(planet, days(0), 259200 / 2);
      peek(planet, days(0.5));
      peek(planet, days(0));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
    });
    it('works with multi send', () => {
      const planet = defaultPlanet({
        stats: defaultConfig.stats,
        world: {externalUpKeepDuration: days(3), externalUpkeepDownRate: defaultConfig.world.externalUpkeepDownRate},
      });
      peek(planet, days(1));
      peek(planet, days(1));
      peek(planet, days(1));
      send(planet, days(0), 259200);
      peek(planet, days(0.5));
      peek(planet, days(0));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
    });
    it('works with multi send', () => {
      const planet = defaultPlanet({
        stats: defaultConfig.stats,
        world: {externalUpKeepDuration: days(3), externalUpkeepDownRate: defaultConfig.world.externalUpkeepDownRate},
      });
      peek(planet, days(1));
      peek(planet, days(1));
      peek(planet, days(1));
      send(planet, days(0), 259200 / 2);
      send(planet, days(0), 259200 / 2);
      peek(planet, days(0.5));
      peek(planet, days(0));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));

      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
    });
    it.only('works with multi send', () => {
      const planet = defaultPlanet({
        stats: defaultConfig.stats,
        world: {externalUpKeepDuration: days(3), externalUpkeepDownRate: defaultConfig.world.externalUpkeepDownRate},
      });
      peek(planet, days(1));
      peek(planet, days(1));
      peek(planet, days(1));
      send(planet, days(0), 259200 / 2);
      send(planet, days(0), 259200 / 2);
      peek(planet, days(0.5));
      peek(planet, days(0));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      send(planet, days(0), 52200);
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
    });
    it.only('works with multi send', () => {
      const planet = defaultPlanet({
        stats: defaultConfig.stats,
        world: {externalUpKeepDuration: days(3), externalUpkeepDownRate: defaultConfig.world.externalUpkeepDownRate},
      });
      peek(planet, days(1));
      peek(planet, days(1));
      peek(planet, days(1));
      send(planet, days(0), 259200 / 2);
      send(planet, days(0), 259200 / 2);
      peek(planet, days(0.5));
      peek(planet, days(0));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      send(planet, days(0), 52200);
      const startTime = planet.lastUpdate;
      peek(planet, days(0.5));
      send(planet, days(0), 34140);
      // const startTime2 = planet.lastUpdate;
      peek(planet, days(0.5));
      countArrival(planet, days(0), 52200, startTime);
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
    });

    it.only('works with multi send', () => {
      const planet = defaultPlanet({
        stats: defaultConfig.stats,
        world: {externalUpKeepDuration: days(3), externalUpkeepDownRate: defaultConfig.world.externalUpkeepDownRate},
      });
      peek(planet, days(1));
      peek(planet, days(1));
      peek(planet, days(1));
      send(planet, days(0), 259200 / 2);
      send(planet, days(0), 259200 / 2);
      peek(planet, days(0.5));
      peek(planet, days(0));
      receiveSpaceships(planet, days(0), 1000000);
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      send(planet, days(0), 52200);
      const startTime = planet.lastUpdate;
      peek(planet, days(0.5));
      send(planet, days(0), 34140);
      // const startTime2 = planet.lastUpdate;
      peek(planet, days(0.5));
      countArrival(planet, days(0), 52200, startTime);
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
      peek(planet, days(0.5));
    });
  });
});
