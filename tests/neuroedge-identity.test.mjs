import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { freezeCurrentActor } from "../.identity-test-dist/current-actor.js";
import { createUuidV7, UUID_V7_PATTERN } from "../.identity-test-dist/uuid-v7.js";

test("UUIDv7 has the canonical version, variant, and source timestamp", () => {
  const timestamp = Date.UTC(2026, 8, 4, 10, 5, 0);
  const id = createUuidV7(timestamp, Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
  assert.match(id, UUID_V7_PATTERN);
  assert.equal(Number.parseInt(id.replaceAll("-", "").slice(0, 12), 16), timestamp);
  assert.equal(id[14], "7");
  assert.match(id[19], /[89ab]/);
});

test("CurrentActor is immutable, including roles and scopes", () => {
  const actor = freezeCurrentActor({
    actor_id: "01991a2b-3c4d-7e60-8a90-1234567890ab",
    actor_type: "person",
    person_id: "01991a2b-3c4d-7e60-8a90-1234567890ab",
    ownership_scope: "organisation",
    organisation_id: "01991a2b-3c4d-7e61-8a90-1234567890ab",
    membership_id: "01991a2b-3c4d-7e62-8a90-1234567890ab",
    delegated_grant_id: null,
    client_application_id: "01991a2b-3c4d-7e63-8a90-1234567890ab",
    session_id: "01991a2b-3c4d-7e64-8a90-1234567890ab",
    credential_id: null,
    roles: ["merchant.owner"],
    scopes: ["merchant.read"],
    assurance_level: "aal1",
    support_access_grant_id: null,
    purpose: "identity.shadow_resolution",
    request_id: "01991a2b-3c4d-7e65-8a90-1234567890ab",
    correlation_id: "01991a2b-3c4d-7e66-8a90-1234567890ab",
    issued_at: "2026-09-04T10:05:00.000Z",
    expires_at: "2026-09-04T10:10:00.000Z",
  });
  assert.equal(Object.isFrozen(actor), true);
  assert.equal(Object.isFrozen(actor.roles), true);
  assert.equal(Object.isFrozen(actor.scopes), true);
  assert.throws(() => actor.roles.push("merchant.write"), TypeError);
});

test("identity migration is additive and contains every Phase A table", async () => {
  const sql = await readFile(new URL("../drizzle-postgres/0021_flimsy_phantom_reporter.sql", import.meta.url), "utf8");
  for (const table of ["core_people", "core_organisations", "core_memberships", "core_client_applications", "core_legacy_identity_mappings"]) {
    assert.match(sql, new RegExp(`CREATE TABLE "${table}"`));
  }
  assert.match(sql, /ALTER TABLE "sessions" ADD COLUMN "core_actor_session_id" uuid/);
  assert.doesNotMatch(sql, /\bDROP\s+(?:TABLE|COLUMN)\b/i);
  assert.doesNotMatch(sql, /ALTER TABLE "users"/i);
});
