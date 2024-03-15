const { Signer, Provider, Contract, utils } = require('koilib');
const abi = require('./staking-abi.json')
require('dotenv').config();


const { PRIVATE_KEY, RPC_URL, BLOCK_END, BLOCK_START, BLOCK_REWARD, TOKEN_REWARD, TOKEN_DEPOSIT } = process.env;

abi.koilib_types = abi.types;


async function main() {
  // deploy bridge contract
  const provider = new Provider(RPC_URL);
  const signer = Signer.fromWif(PRIVATE_KEY);
  signer.provider = provider;

  const bridgeContract = new Contract({
    id: signer.address,
    abi,
    provider,
    signer,
  });

  const result = await bridgeContract.functions.initialize({
    tokenDeposit: TOKEN_DEPOSIT,
    tokenReward: TOKEN_REWARD,
    blockReward: BLOCK_REWARD,
    blockStart: BLOCK_START,
    blockEnd: BLOCK_END
  });

  await result.transaction.wait();
  console.log('initialize staking');
}

main()
  .catch(error => console.error(error));