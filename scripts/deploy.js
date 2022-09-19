const hre = require("hardhat");
const UniswapV2Factory = require("../node_modules/dexbr-v2-core/build/UniswapV2Factory.json");

async function main() {
  const provider = hre.ethers.provider;
  const signer = provider.getSigner();

  const account = await signer.getAddress();
  console.log('FeeToSetter: ', account);
  
  // WETH token
  const externalAddressWETH = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";

  // deploy factory V2
  const factoryV2CF = new hre.ethers.ContractFactory(UniswapV2Factory.abi, UniswapV2Factory.bytecode, signer);
  const factoryV2 = await factoryV2CF.deploy(account);
  console.log("Factory V2 Address: ", factoryV2.address);
  console.log("Factory V2 INIT_CODE_PAIR_HASH: ", await factoryV2.INIT_CODE_PAIR_HASH())

  // Set account to receive fee
  await factoryV2.setFeeTo(account);

  // Router dpeloy
  const RouterTwo = await hre.ethers.getContractFactory("UniswapV2Router02");
  const routerTwo = await RouterTwo.deploy(factoryV2.address, externalAddressWETH);
  console.log("RouterTwo address: ", routerTwo.address);

  // initialize V2
  console.log("Optional pair boot")

  // Create Pair tokenA to tokenB
  // Create tokenA
  const tokenACF = await hre.ethers.getContractFactory("ERC20");
  const tokenA = await tokenACF.deploy(hre.ethers.utils.parseUnits("1000"));
  console.log("TokenA Address: ", tokenA.address);

  // Create tokenB
  const tokenBCF = await hre.ethers.getContractFactory("ERC20");
  const tokenB = await tokenBCF.deploy(hre.ethers.utils.parseUnits("1000"));
  console.log("TokenB Address: ", tokenB.address);

  const createPairResult = await factoryV2.createPair(tokenA.address, tokenB.address);
  await createPairResult.wait();
  const pairAddress = await factoryV2.getPair(tokenA.address, tokenB.address);
  console.log("Pair tokenA to tokenB contract Address: ", pairAddress)

  // Create Pair WETHPartner to WETH
  // Creatre token partner
  const WETHPartnerCF = await hre.ethers.getContractFactory("ERC20");
  const WETHPartner = await WETHPartnerCF.deploy(hre.ethers.utils.parseUnits("1000"));
  console.log("WETHPartner Address: ", WETHPartner.address);

  const wethCreatePairResult = await factoryV2.createPair(externalAddressWETH, WETHPartner.address);
  await wethCreatePairResult.wait();
  const WETHPairAddress = await factoryV2.getPair(externalAddressWETH, WETHPartner.address);
  console.log("WETH Pair ETHPartner to WETH Address: ", WETHPairAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});