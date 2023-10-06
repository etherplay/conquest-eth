/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */
function pause(seconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

async function test(fnc) {
  for (let i = 0; i < 10000; i++) {
    await pause(1);
    const blockNumber = await ethereum.request({method: 'eth_blockNumber', params: []});
    console.log(blockNumber);
    try {
      const result = await fnc();
      console.log(result);
    } catch (e) {
      try {
        const blockNumber = await ethereum.request({method: 'eth_blockNumber', params: []});
        console.log('blockNumber on error', blockNumber);
      } catch (e) {}
      throw e;
    }
  }
}

// this trigger `<blockNumber> could not be found` where <blockNumber> is a recent block
// also : No state available for block 0x68cd59b245e10b357a852810c85f49213dc6a1ec80e2b11ce2aa942bbc74c7ed"
function ethCall() {
  return fetch('https://rpc.gnosischain.com/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      method: 'eth_call',
      params: [
        {
          from: '0xa43af3b33ef9f9561134863e4a0d3b86587bb988',
          to: '0x8c122ded711fa63729f8958a2343679772cabfe1',
          data: '0xdd62ed3e000000000000000000000000a43af3b33ef9f9561134863e4a0d3b86587bb988000000000000000000000000cd70d4212e8e7217d015ac286d47d521fa8aed23',
        },
        'latest',
      ],
    }),
  }).then((res) => res.json());
}

// CAN HOOK INTO buildEip1193Fetcher from web3-provider
