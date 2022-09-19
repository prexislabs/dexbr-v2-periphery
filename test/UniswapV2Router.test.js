const { expect } = require("chai");
const hre = require("hardhat");
const { Contract } = require("ethers");
const UniswapV2Factory = require("../node_modules/dexbr-v2-core/build/UniswapV2Factory.json");
const IUniswapV2Pair = require("../node_modules/dexbr-v2-core/build/IUniswapV2Pair.json");
const { ethers } = require("hardhat");

const ownerPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

const getApprovalDigest = async (
  token,
  approve,
  nonce,
  deadline
) => {
  return hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        await token.DOMAIN_SEPARATOR(),
        hre.ethers.utils.keccak256(
          hre.ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            ["0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9", approve.owner, approve.spender, approve.value, nonce, deadline]
          )
        )
      ]
    )
  )
}

describe("Uniswap V2", function () {

  before(async function () {

    [this.owner, ...this.addrs] = await hre.ethers.getSigners();

    this.provider = hre.ethers.provider;
    this.signer = this.provider.getSigner();
    
    const account = await this.signer.getAddress();
    console.log('account', account);

    this.overrides = {
      gasLimit: 9999999
    }

    this.MINIMUM_LIQUIDITY = 10**3

    // deploy factory V2
    const factoryV2CF = new hre.ethers.ContractFactory(UniswapV2Factory.abi, UniswapV2Factory.bytecode, this.signer);
    this.factoryV2 = await factoryV2CF.deploy(this.owner.address);
    console.log("Factory V2 Address: ", this.factoryV2.address);
    console.log("factory INIT_CODE_PAIR_HASH: ", await this.factoryV2.INIT_CODE_PAIR_HASH())

    // deploy tokens
    const WETH9CF = await hre.ethers.getContractFactory("WETH9")
    this.WETH = await WETH9CF.deploy()

    const WETHPartnerCF = await hre.ethers.getContractFactory("ERC20");
    this.WETHPartner = await WETHPartnerCF.deploy(hre.ethers.utils.parseUnits("1000"));
    console.log("WETHPartner Address: ", this.WETHPartner.address)
    
    // Create tokens init
    const tokenACF = await hre.ethers.getContractFactory("ERC20");
    this.tokenA = await tokenACF.deploy(hre.ethers.utils.parseUnits("1000"));
    console.log("TokenA Address: ", this.tokenA.address)

    const tokenBCF = await hre.ethers.getContractFactory("ERC20");
    this.tokenB = await tokenBCF.deploy(hre.ethers.utils.parseUnits("1000"));
    console.log("TokenB Address: ", this.tokenB.address)


    const tokenCCF = await hre.ethers.getContractFactory("ERC20");
    this.tokenC = await tokenCCF.deploy(hre.ethers.utils.parseUnits("1000"));
    console.log("TokenC Address: ", this.tokenC.address)

    const tokenDCF = await hre.ethers.getContractFactory("ERC20");
    this.tokenD = await tokenDCF.deploy(hre.ethers.utils.parseUnits("1000"));
    console.log("TokenD Address: ", this.tokenD.address)


    // deploy routers
    const RouterOne = await hre.ethers.getContractFactory("UniswapV2Router01");
    this.routerOne = await RouterOne.deploy(this.factoryV2.address, this.WETH.address);
    console.log("RouterOne address: ", this.routerOne.address); 

    const RouterTwo = await hre.ethers.getContractFactory("UniswapV2Router02");
    this.routerTwo = await RouterTwo.deploy(this.factoryV2.address, this.WETH.address);
    console.log("RouterTwo address: ", this.routerTwo.address);

    // initialize V2
    const createPairResult = await this.factoryV2.createPair(this.tokenA.address, this.tokenB.address)
    await createPairResult.wait()
    const pairAddress = await this.factoryV2.getPair(this.tokenA.address, this.tokenB.address)
    this.pair = new Contract(pairAddress, JSON.stringify(IUniswapV2Pair.abi), this.provider).connect(this.signer)
    console.log("Pair Address: ", this.pair.address)
  
    const token0Address = await this.pair.token0()
    this.token0 = this.tokenA.address === token0Address ? this.tokenA : this.tokenB
    this.token1 = this.tokenA.address === token0Address ? this.tokenB : this.tokenA
  
    const wethCreatePairResult = await this.factoryV2.createPair(this.WETH.address, this.WETHPartner.address)
    await wethCreatePairResult.wait()
    const WETHPairAddress = await this.factoryV2.getPair(this.WETH.address, this.WETHPartner.address)
    this.WETHPair = new Contract(WETHPairAddress, JSON.stringify(IUniswapV2Pair.abi), this.provider).connect(this.signer)
    console.log("WETH Pair Address: ", this.WETHPair.address)
  })

  it("Should add liquidity", async function () {
    await this.token0.approve(this.routerTwo.address, hre.ethers.constants.MaxUint256)
    await this.token1.approve(this.routerTwo.address, hre.ethers.constants.MaxUint256)

    const token0BeforeLiquidity = await this.token0.balanceOf(this.owner.address)
    const token1BeforeLiquidity = await this.token1.balanceOf(this.owner.address)
    
    const amount0 = hre.ethers.utils.parseEther("10")
    const amount1 = hre.ethers.utils.parseEther("10")
    
    await this.routerTwo.addLiquidity(
      this.token0.address,
      this.token1.address,
      amount0,
      amount1,
      0,
      0,
      this.owner.address,
      hre.ethers.constants.MaxUint256,
    )

    expect(BigInt(await this.token0.balanceOf(this.owner.address))).to.eq(
      BigInt(token0BeforeLiquidity) - BigInt(amount0)
    )
    expect(BigInt(await this.token1.balanceOf(this.owner.address))).to.eq(
      BigInt(token1BeforeLiquidity) - BigInt(amount1)
    )

    const reserves = await this.pair.getReserves()
    expect(reserves.reserve0).to.eq(BigInt(amount0))
    expect(reserves.reserve1).to.eq(BigInt(amount1))

  })

  it("Should add liquidity for not pair tokens", async function () {
    await this.tokenC.approve(this.routerTwo.address, hre.ethers.constants.MaxUint256)
    await this.tokenD.approve(this.routerTwo.address, hre.ethers.constants.MaxUint256)

    const tokenCBeforeLiquidity = await this.tokenC.balanceOf(this.owner.address)
    const tokenDBeforeLiquidity = await this.tokenD.balanceOf(this.owner.address)
    
    await this.routerTwo.addLiquidity(
      this.tokenC.address,
      this.tokenD.address,
      10000,
      10000,
      0,
      0,
      this.owner.address,
      hre.ethers.constants.MaxUint256,
    )

    expect(BigInt(await this.tokenC.balanceOf(this.owner.address))).to.eq(
      BigInt(tokenCBeforeLiquidity) - BigInt(10000)
    )
    expect(BigInt(await this.tokenD.balanceOf(this.owner.address))).to.eq(
      BigInt(tokenDBeforeLiquidity) - BigInt(10000)
    )

    const pairAddress = await this.factoryV2.getPair(this.tokenC.address, this.tokenD.address)
    const newPair = new Contract(pairAddress, JSON.stringify(IUniswapV2Pair.abi), this.provider).connect(this.signer)

    const reserves = await newPair.getReserves()
    expect(reserves.reserve0).to.eq(BigInt(10000))
    expect(reserves.reserve1).to.eq(BigInt(10000))
  })


  it("Add liquidity for existing pair liquidity", async function () {
    await this.routerTwo.addLiquidity(
      this.tokenC.address,
      this.tokenD.address,
      100,
      100,
      0,
      0,
      this.owner.address,
      hre.ethers.constants.MaxUint256,
    )

    const pairAddress = await this.factoryV2.getPair(this.tokenC.address, this.tokenD.address)
    const pairContract = new Contract(pairAddress, JSON.stringify(IUniswapV2Pair.abi), this.provider).connect(this.signer)
    const [reserve0, reserve1] = await pairContract.getReserves()
    expect(reserve0).to.eq(BigInt(10100))
    expect(reserve1).to.eq(BigInt(10100))
  })

  it("Don't should add liquidity: INSUFFICIENT_B_AMOUNT", async function () {
    await expect(this.routerTwo.addLiquidity(
      this.tokenC.address,
      this.tokenD.address,
      100,
      100,
      0,
      101,
      this.owner.address,
      hre.ethers.constants.MaxUint256,
    )).to.be.revertedWith("UniswapV2Router: INSUFFICIENT_B_AMOUNT")
  })

  it("Don't should add liquidity: INSUFFICIENT_A_AMOUNT", async function () {
    await expect(this.routerTwo.addLiquidity(
      this.tokenC.address,
      this.tokenD.address,
      100,
      99,
      101,
      0,
      this.owner.address,
      hre.ethers.constants.MaxUint256,
    )).to.be.revertedWith("UniswapV2Router: INSUFFICIENT_A_AMOUNT")
  })

  it("Should add liquidity, optimal amount tokenD > tokenD desired", async function () {
    const pairAddress = await this.factoryV2.getPair(this.tokenC.address, this.tokenD.address)
    const pairContract = new Contract(pairAddress, JSON.stringify(IUniswapV2Pair.abi), this.provider).connect(this.signer)
    const [reserveC, reserveD] = await pairContract.getReserves()

    await this.routerTwo.addLiquidity(
      this.tokenC.address,
      this.tokenD.address,
      100,
      99,
      98,
      0,
      this.owner.address,
      hre.ethers.constants.MaxUint256,
    )

    const [newReserveC, newReserveD] = await pairContract.getReserves()
    expect(BigInt(newReserveC)).to.eq(BigInt(reserveC) + BigInt(99))
    expect(BigInt(newReserveD)).to.eq(BigInt(reserveD) + BigInt(99))
  })

  it("Must add liquidity token with ETH", async function () {
    
    const valueSend = hre.ethers.utils.parseEther("10")

    await this.routerTwo.connect(this.owner).addLiquidityETH(
      this.tokenA.address,
      valueSend,
      0,
      0,
      this.owner.address,
      hre.ethers.constants.MaxUint256,
      {value: valueSend}
    )

    const pairAddress = await this.factoryV2.getPair(this.tokenA.address, this.WETH.address)
    const pairContract = new Contract(pairAddress, JSON.stringify(IUniswapV2Pair.abi), this.provider).connect(this.signer)
    const [reserveA, reserveWETH] = await pairContract.getReserves()

    expect(reserveA).to.eq(valueSend)
    expect(BigInt(reserveWETH)).to.eq(BigInt(valueSend))
  })

  it("Must add liquidity token with ETH using min amount", async function () {
    
    const pairAddress = await this.factoryV2.getPair(this.tokenA.address, this.WETH.address)
    const pairContract = new Contract(pairAddress, JSON.stringify(IUniswapV2Pair.abi), this.provider).connect(this.signer)
    const [reserveA, reserveWETH] = await pairContract.getReserves()
    
    const minEth = hre.ethers.utils.parseEther("1")
    
    await this.routerTwo.connect(this.owner).addLiquidityETH(
      this.tokenA.address,
      hre.ethers.utils.parseEther("1"),
      0,
      minEth,
      this.owner.address,
      hre.ethers.constants.MaxUint256,
      {value: hre.ethers.utils.parseEther("2")}
    )

    const [newReserveA, newReserveWETH] = await pairContract.getReserves()
    expect(BigInt(newReserveA)).to.eq(BigInt(reserveA)+BigInt(hre.ethers.utils.parseEther("1")))
    expect(BigInt(newReserveWETH)).to.eq(BigInt(reserveWETH)+BigInt(minEth))
  })


  it("Should remove liquidity", async function () {

    await this.pair.approve(this.routerTwo.address, hre.ethers.constants.MaxUint256)

    const expectedLiquidity = hre.ethers.utils.parseEther("2")

    const result = await this.routerTwo.removeLiquidity(
      this.token0.address,
      this.token1.address,
      BigInt(expectedLiquidity) - BigInt(10**3),
      0,
      0,
      this.owner.address,
      hre.ethers.constants.MaxUint256,
      this.overrides
    )

  })

  it("Should remove  ETH liquidity", async function () {

    const pairAddress = await this.factoryV2.getPair(this.tokenA.address, this.WETH.address)
    const pairContract = new Contract(pairAddress, JSON.stringify(IUniswapV2Pair.abi), this.provider).connect(this.signer)
    const [newReserveA, newReserveWETH] = await pairContract.getReserves()

    await pairContract.approve(this.routerTwo.address, hre.ethers.constants.MaxUint256)
    await pairContract.approve(this.tokenA.address, hre.ethers.constants.MaxUint256)
    
    await this.tokenA.approve(this.routerTwo.address, hre.ethers.constants.MaxUint256)
    await this.tokenA.approve(pairContract.address, hre.ethers.constants.MaxUint256)
    
    await this.WETH.approve(this.routerTwo.address, hre.ethers.constants.MaxUint256)
    await this.WETH.approve(pairContract.address, hre.ethers.constants.MaxUint256)
    

    const expectedLiquidity = hre.ethers.utils.parseEther("2")

    const result = await this.routerTwo.removeLiquidityETH(
      this.tokenA.address,
      BigInt(expectedLiquidity) - BigInt(10**3),
      0,
      0,
      this.owner.address,
      hre.ethers.constants.MaxUint256,
      this.overrides
    )
  })

  it("Should remove ETH using removeLiquidityWithPermit", async function (){
    const pairAddress = await this.factoryV2.getPair(this.token0.address, this.token1.address)
    const pairContract = new Contract(pairAddress, JSON.stringify(IUniswapV2Pair.abi), this.provider).connect(this.signer)
    const expectedLiquidity = hre.ethers.utils.parseEther("1")
    const nonce = await pairContract.nonces(this.owner.address)
    
    const digest = await getApprovalDigest(
      pairContract,
      { owner: this.owner.address, spender: this.routerTwo.address, value: expectedLiquidity},
      nonce,
      hre.ethers.constants.MaxUint256
    )

    const signingKeys = (new ethers.utils.SigningKey(ownerPrivateKey)).signDigest(digest)
    
    const result = await this.routerTwo.removeLiquidityWithPermit(
      this.token0.address,
      this.token1.address,
      expectedLiquidity,
      0,
      0,
      this.owner.address,
      hre.ethers.constants.MaxUint256,
      false,
      signingKeys.v, 
      signingKeys.r, 
      signingKeys.s,
      this.overrides
    )
  })
})