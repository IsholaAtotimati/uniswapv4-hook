const { ethers } = require("hardhat");

// Polyfill provider.resolveName to avoid HardhatEthersProvider NotImplementedError
// Ethers calls provider.resolveName when resolving ENS names; Hardhat's provider
// may not implement it in some versions. We provide a minimal implementation
// that returns the input when it's already an address, or null otherwise.
try {
  if (ethers && ethers.provider) {
    ethers.provider.resolveName = ethers.provider.resolveName || (async (name) => {
      if (typeof name === "string" && /^0x[0-9a-fA-F]{40}$/.test(name)) return name;
      return null;
    });
  }
} catch (e) {
  // swallow errors during setup
}
