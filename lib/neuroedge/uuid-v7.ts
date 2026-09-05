import { randomBytes } from "node:crypto";

export const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Creates an RFC 9562 UUIDv7 using a 48-bit Unix millisecond timestamp. */
export function createUuidV7(unixMilliseconds = Date.now(), entropy = randomBytes(10)): string {
  if (!Number.isSafeInteger(unixMilliseconds) || unixMilliseconds < 0 || unixMilliseconds > 0xffffffffffff) {
    throw new RangeError("UUIDv7 timestamp must fit in 48 bits");
  }
  if (entropy.length < 10) throw new RangeError("UUIDv7 requires at least 10 bytes of entropy");

  const bytes = Buffer.alloc(16);
  let timestamp = unixMilliseconds;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = timestamp % 256;
    timestamp = Math.floor(timestamp / 256);
  }
  bytes[6] = 0x70 | (entropy[0]! & 0x0f);
  bytes[7] = entropy[1]!;
  bytes[8] = 0x80 | (entropy[2]! & 0x3f);
  entropy.copy(bytes, 9, 3, 10);

  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
