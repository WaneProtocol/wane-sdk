<h1 align="center">wane-sdk</h1>

<p align="center">
  <a href="https://github.com/WaneProtocol/wane-sdk/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-0B0B0B?style=for-the-badge&labelColor=050505" alt="license" /></a>
  <a href="https://github.com/WaneProtocol/wane-sdk/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/WaneProtocol/wane-sdk/ci.yml?style=for-the-badge&labelColor=050505&color=4f7799" alt="ci" /></a>
  <a href="https://github.com/WaneProtocol/wane-sdk/commits/main"><img src="https://img.shields.io/github/last-commit/WaneProtocol/wane-sdk?style=for-the-badge&labelColor=050505&color=7aa874" alt="last commit" /></a>
  <a href="https://www.npmjs.com/package/wane-sdk"><img src="https://img.shields.io/badge/npm-wane--sdk-7aa874?style=for-the-badge&labelColor=050505" alt="npm" /></a>
</p>

<p align="center">
  <a href="https://github.com/WaneProtocol/wane-sdk"><img src="https://img.shields.io/badge/typescript-5.5-4f7799?style=for-the-badge&labelColor=050505" alt="typescript" /></a>
  <a href="https://github.com/WaneProtocol/wane-sdk"><img src="https://img.shields.io/badge/node-%3E%3D18-7aa874?style=for-the-badge&labelColor=050505" alt="node" /></a>
  <a href="https://wane.network"><img src="https://img.shields.io/badge/website-wane.network-d8a657?style=for-the-badge&labelColor=050505" alt="website" /></a>
  <a href="https://x.com/wanedotnetwork"><img src="https://img.shields.io/badge/follow-%40wanedotnetwork-d8a657?style=for-the-badge&labelColor=050505" alt="x" /></a>
  <a href="https://github.com/WaneProtocol/wane-sdk/issues"><img src="https://img.shields.io/github/issues/WaneProtocol/wane-sdk?style=for-the-badge&labelColor=050505&color=b8473f" alt="issues" /></a>
</p>

**wane-sdk** is the unified client an AI agent uses to share on-chain immune
memory. Before an agent signs, it reads the antibody registry (reading is
immunity). When it detects a novel threat, it mints an antibody so every other
agent is immune next time. For full enforcement it routes outflows through a
session wallet that screens each send on-chain and reverts a flagged transfer
before any value moves. One package covers Base (viem) and Solana
(`@solana/web3.js`), with the same threat taxonomy on both.
