import crypto from "crypto";

export type FairInput = {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  cursor?: number;
};

export type SeedPair = {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  revealedAt?: string;
};

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hmacHex({ serverSeed, clientSeed, nonce, cursor = 0 }: FairInput) {
  return crypto
    .createHmac("sha256", serverSeed)
    .update(`${clientSeed}:${nonce}:${cursor}`)
    .digest("hex");
}

export function rollFloat(input: FairInput) {
  const hex = hmacHex(input).slice(0, 13);
  return parseInt(hex, 16) / 0x10000000000000;
}

export function rollInt(input: FairInput, maxExclusive: number) {
  return Math.floor(rollFloat(input) * maxExclusive);
}

export function sampleWithoutReplacement(input: FairInput, range: number, count: number) {
  const values = Array.from({ length: range }, (_, index) => index);
  const picks: number[] = [];

  for (let cursor = 0; cursor < count; cursor += 1) {
    const index = rollInt({ ...input, cursor }, values.length);
    picks.push(values.splice(index, 1)[0]);
  }

  return picks;
}

export function createSeedPair(clientSeed = "bet-ranch-client") {
  const serverSeed = crypto.randomBytes(32).toString("hex");
  return {
    serverSeed,
    serverSeedHash: sha256(serverSeed),
    clientSeed,
    nonce: 0,
  } satisfies SeedPair;
}

export function verifyServerSeed(serverSeed: string, publishedHash: string) {
  return sha256(serverSeed) === publishedHash;
}
