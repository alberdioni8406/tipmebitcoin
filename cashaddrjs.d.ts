declare module "cashaddrjs" {
  interface Decoded {
    prefix: string;
    type: string;
    hash: Uint8Array;
  }

  function encode(prefix: string, type: string, hash: Uint8Array): string;
  function decode(address: string): Decoded;

  class ValidationError extends Error {}

  const cashaddr: {
    encode: typeof encode;
    decode: typeof decode;
    ValidationError: typeof ValidationError;
  };

  export = cashaddr;
}
