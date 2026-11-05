// A passcode is kept only as a salted hash. A TV app's page isn't a secure context, so crypto.subtle may be
// missing, and this is a plain SHA-256 of ASCII text instead.
export const PASSCODE_LENGTH = 4;

const firstPrimes = (count: number) => {
  const primes: number[] = [];
  for (let candidate = 2; primes.length < count; candidate += 1) {
    if (primes.every((prime) => candidate % prime !== 0)) {
      primes.push(candidate);
    }
  }
  return primes;
};
const fractionBits = (value: number) => ((value - Math.floor(value)) * 2 ** 32) | 0;
const PRIMES = firstPrimes(64);
const ROUND_CONSTANTS = PRIMES.map((prime) => fractionBits(Math.cbrt(prime)));
const INITIAL_HASH = PRIMES.slice(0, 8).map((prime) => fractionBits(Math.sqrt(prime)));
const rotate = (value: number, bits: number) => (value >>> bits) | (value << (32 - bits));

const padded = (text: string) => {
  const bytes = Array.from(text, (character) => character.charCodeAt(0) & 0xff);
  const bits = bytes.length * 8;
  const zeros = (64 - ((bytes.length + 9) % 64)) % 64;
  return [
    ...bytes,
    0x80,
    ...new Array<number>(zeros + 4).fill(0),
    (bits >>> 24) & 0xff,
    (bits >>> 16) & 0xff,
    (bits >>> 8) & 0xff,
    bits & 0xff,
  ];
};

export const sha256 = (text: string) => {
  const message = padded(text);
  const hash = [...INITIAL_HASH];
  for (let offset = 0; offset < message.length; offset += 64) {
    const words = new Array<number>(64).fill(0);
    for (let i = 0; i < 16; i += 1) {
      const at = offset + i * 4;
      words[i] = (message[at] << 24) | (message[at + 1] << 16) | (message[at + 2] << 8) | message[at + 3];
    }
    for (let i = 16; i < 64; i += 1) {
      const low = rotate(words[i - 15], 7) ^ rotate(words[i - 15], 18) ^ (words[i - 15] >>> 3);
      const high = rotate(words[i - 2], 17) ^ rotate(words[i - 2], 19) ^ (words[i - 2] >>> 10);
      words[i] = (words[i - 16] + low + words[i - 7] + high) | 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let i = 0; i < 64; i += 1) {
      const sumE = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
      const choice = (e & f) ^ (~e & g);
      const first = (h + sumE + choice + ROUND_CONSTANTS[i] + words[i]) | 0;
      const sumA = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const second = (sumA + majority) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + first) | 0;
      d = c;
      c = b;
      b = a;
      a = (first + second) | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((value, i) => {
      hash[i] = (hash[i] + value) | 0;
    });
  }
  return hash.map((value) => (value >>> 0).toString(16).padStart(8, "0")).join("");
};

const secureByte = () => crypto.getRandomValues(new Uint8Array(1))[0];

export const createPasscode = (code: string, randomByte = secureByte) => {
  const passcodeSalt = Array.from({ length: 16 }, () => randomByte().toString(16).padStart(2, "0")).join("");
  return { passcodeSalt, passcodeHash: sha256(passcodeSalt + code) };
};

export const matchesPasscode = (code: string, salt: string, hash: string) => sha256(salt + code) === hash;
