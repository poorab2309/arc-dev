# Arc Dev

Smart contract deployments and on-chain development work on Arc testnet.
Building with Foundry, exploring Arc's stablecoin-native infrastructure.

## Contracts

### ArchitectToken (ARCH)
- **Type:** ERC-20
- **Network:** Arc Testnet
- **Address:** 0xdaD585D90Bcf235863210F03773F5B6F6371A309
- **Tx Hash:** 0xca71d85fc09c41b68d66b3139f5b1205abc8ca00b90cb407903dcda9e6f42dcb
- **Explorer:** [View on Arcscan](https://testnet.arcscan.app/address/0xdaD585D90Bcf235863210F03773F5B6F6371A309)

###  ArchitectNFT (ARCHNFT)
- **Type:**  ERC-721
- **Address:** 0x8197844AF51c2D2dC97983fe2d6907C952272272
- **Tx Hash:** 0x88f0681b52948262258e3f2f461f8d5f336b783d04b1394993c0bef9666b9b6
- **Explorer:** [View on Arcscan](testnet.arcscan.app/address/0x8197844AF51c2D2dC97983fe2d6907C952272272)

<!-- More contracts will be added here -->

## Stack
- Foundry
- Solidity
- OpenZeppelin Contracts

## Network Details
- **Network:** Arc Testnet
- **Chain ID:** 5042002
- **RPC:** https://rpc.testnet.arc.network
- **Explorer:** https://testnet.arcscan.app

## Deployer
0x9fD3d83dd9938A47Dff92802b7b9d2EbE152D9C7

## Event Monitoring

Using Circle's Smart Contract Platform SDK to monitor on-chain events via webhooks.

### Monitors Active
- **ArchitectToken (ARCH)** — Transfer events
- **ArchitectNFT (ARCHNFT)** — Transfer events

### Stack
- @circle-fin/smart-contract-platform
- Circle Console webhooks
- webhook.site (testnet)