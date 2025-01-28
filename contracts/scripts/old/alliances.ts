import 'dotenv/config';
import {deployments} from 'hardhat';
import {TheGraph} from './utils/thegraph';
const theGraph = new TheGraph(`https://api.thegraph.com/subgraphs/name/${process.env.SUBGRAPH_NAME}`);

type Alliance = {
  id: string;
  members: {
    owner: {id: string; introducer: {id: string}};
  }[];
};

const queryString = `
query {
  alliances {
    id
    members {owner{id introducer{id}}}
  }
}
`;

async function main() {
  const claims: {
    key: string;
    amount: number;
    address: string;
    url: string;
    username: string;
  }[] = JSON.parse(await deployments.readDotFile('.claimKeys.beta.json'));

  const introducerMap: {[id: string]: string} = {};
  for (const claim of claims) {
    if (claim.username) {
      introducerMap[claim.address.toLowerCase()] = claim.username;
    }
  }

  const alliances = await theGraph.query<Alliance>(queryString, {field: 'alliances'});
  const allianceWithNames = alliances.map((v) => {
    return {
      id: v.id,
      members: v.members.map((m) => {
        return introducerMap[m.owner.introducer?.id] || m.owner.id;
      }),
    };
  });

  await deployments.saveDotFile('.alliances.json', JSON.stringify(allianceWithNames, null, 2));
}

main();
