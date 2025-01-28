import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {TheGraph} from '../utils/thegraph';
export async function getTHEGRAPH(hre: HardhatRuntimeEnvironment) {
  const chainId = await hre.getChainId();
  let chainName = 'unknown';
  if (chainId == '100') {
    chainName = 'gnosis';
  }

  let url: string;
  if (chainId === '3337') {
    url = `http://127.0.0.1:8000/subgraphs/name/conquest-eth/conquest-eth`;
  } else {
    url = `https://subgraphs.etherplay.io/${chainName}/subgraphs/name/${process.env.SUBGRAPH_NAME}`;
  }

  return new TheGraph(url);
}
