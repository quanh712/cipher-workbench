import type { DesGateway } from "../features/des/services/desGateway";
import type { RsaGateway } from "../features/rsa/services/rsaGateway";
import type { DiffieHellmanGateway } from "../features/diffieHellman/services/diffieHellmanGateway";

// Keep response validation and HTTP adapters off the initial Caesar bundle.
// Imports run inside the existing controller error/abort handling, so a failed
// download follows the same recovery path as a failed request.
export const deferredRsaApi: RsaGateway = {
  async generateKey(...args) {
    return (await import("../features/rsa/services/rsaApi")).rsaApi.generateKey(...args);
  },
  async transform(...args) {
    return (await import("../features/rsa/services/rsaApi")).rsaApi.transform(...args);
  },
  async signature(...args) {
    return (await import("../features/rsa/services/rsaApi")).rsaApi.signature(...args);
  },
  async encryptFile(...args) {
    return (await import("../features/rsa/services/rsaApi")).rsaApi.encryptFile!(...args);
  },
  async standardSignature(...args) {
    return (await import("../features/rsa/services/rsaApi")).rsaApi.standardSignature!(...args);
  },
};

export const deferredDesApi: DesGateway = {
  kind: "api",
  async process(...args) {
    return (await import("../features/des/services/desApi")).desApi.process(...args);
  },
  async download(...args) {
    return (await import("../features/des/services/desApi")).desApi.download!(...args);
  },
};

export const deferredDiffieHellmanApi: DiffieHellmanGateway = {
  async exchange(...args) {
    return (
      await import("../features/diffieHellman/services/diffieHellmanApi")
    ).diffieHellmanApi.exchange(...args);
  },
  async generatePrivateValues(...args) {
    return (
      await import("../features/diffieHellman/services/diffieHellmanApi")
    ).diffieHellmanApi.generatePrivateValues(...args);
  },
};
