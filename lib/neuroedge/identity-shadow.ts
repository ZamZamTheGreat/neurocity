import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { getDb } from "../../db";
import {
  coreClientApplications,
  coreLegacyIdentityMappings,
  coreMemberships,
  coreOrganisations,
  corePeople,
  merchants,
  sessions,
} from "../../db/schema";
import { freezeCurrentActor, type CurrentActor } from "./current-actor";
import { createUuidV7 } from "./uuid-v7";

export const NEUROCITY_CLIENT_APPLICATION_ID = "01991a2b-3c4d-7e63-8a90-1234567890ab";
export const NEUROCITY_CLIENT_KEY = "neurocity-web";
const USER_SOURCE = "neurocity.users";
const MERCHANT_SOURCE = "neurocity.merchants";
const MERCHANT_MEMBERSHIP_SOURCE = "neurocity.merchant_memberships";

export type LegacyMerchantContext = Readonly<{
  id: number;
  merchantId: number;
  role: string;
}>;

export type LegacySessionContext = Readonly<{
  sessionId: number;
  coreActorSessionId: string | null;
  expiresAt: Date;
  user: Readonly<{
    userId: string;
    displayName: string;
    platformRole: string;
  }>;
}>;

const roleScopes = (role: string) => {
  if (role === "owner") return ["merchant.read", "merchant.write", "membership.manage"];
  if (role === "manager") return ["merchant.read", "merchant.write"];
  return ["merchant.read"];
};

export async function resolveShadowCurrentActor(
  session: LegacySessionContext,
  merchantContext?: LegacyMerchantContext,
  now = new Date(),
): Promise<CurrentActor> {
  const db = getDb();
  return db.transaction(async (tx) => {
    // Serialize first-time provisioning for one source account. This makes the
    // mapping reversible and prevents duplicate people under concurrent requests.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${USER_SOURCE}:${session.user.userId}`}))`);
    const coreActorSessionId = session.coreActorSessionId ?? createUuidV7();
    if (!session.coreActorSessionId) {
      await tx.update(sessions).set({ coreActorSessionId }).where(eq(sessions.id, session.sessionId));
    }
    await tx.insert(coreClientApplications).values({
      id: NEUROCITY_CLIENT_APPLICATION_ID,
      key: NEUROCITY_CLIENT_KEY,
      name: "NeuroCity Web",
      applicationType: "first_party_product",
      allowedScopes: ["profile.read", "merchant.read", "merchant.write", "membership.manage"],
    }).onConflictDoNothing();
    const [clientApplication] = await tx.select({ id: coreClientApplications.id }).from(coreClientApplications).where(and(
      eq(coreClientApplications.id, NEUROCITY_CLIENT_APPLICATION_ID),
      eq(coreClientApplications.key, NEUROCITY_CLIENT_KEY),
      eq(coreClientApplications.status, "active"),
    )).limit(1);
    if (!clientApplication) throw new Error("NeuroCity Core client application is missing, mismatched, or inactive");

    const [personMapping] = await tx.select({ subjectId: coreLegacyIdentityMappings.canonicalSubjectId })
      .from(coreLegacyIdentityMappings)
      .where(and(
        eq(coreLegacyIdentityMappings.clientApplicationId, NEUROCITY_CLIENT_APPLICATION_ID),
        eq(coreLegacyIdentityMappings.legacySource, USER_SOURCE),
        eq(coreLegacyIdentityMappings.legacyId, session.user.userId),
        eq(coreLegacyIdentityMappings.canonicalSubjectType, "person"),
        eq(coreLegacyIdentityMappings.linkStatus, "active"),
      )).limit(1);

    const personId = personMapping?.subjectId ?? createUuidV7();
    if (!personMapping) {
      await tx.insert(corePeople).values({ id: personId, displayName: session.user.displayName });
      await tx.insert(coreLegacyIdentityMappings).values({
        id: createUuidV7(),
        clientApplicationId: NEUROCITY_CLIENT_APPLICATION_ID,
        legacySource: USER_SOURCE,
        legacyId: session.user.userId,
        canonicalSubjectType: "person",
        canonicalSubjectId: personId,
        linkMethod: "migration_exact",
        evidenceReferences: [`authenticated_session:${session.sessionId}`],
      });
    } else {
      const [activePerson] = await tx.select({ id: corePeople.id }).from(corePeople).where(and(
        eq(corePeople.id, personId), eq(corePeople.status, "active"),
      )).limit(1);
      if (!activePerson) throw new Error("Canonical person mapping is stale or inactive");
    }

    let organisationId: string | null = null;
    let membershipId: string | null = null;
    let roles = [session.user.platformRole];
    let scopes = ["profile.read"];
    let ownershipScope: CurrentActor["ownership_scope"] = session.user.platformRole === "administrator" ? "platform" : "personal";

    if (merchantContext) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${MERCHANT_SOURCE}:${merchantContext.merchantId}`}))`);
      const [merchant] = await tx.select({ name: merchants.name }).from(merchants).where(eq(merchants.id, merchantContext.merchantId)).limit(1);
      if (!merchant) throw new Error("Cannot resolve Core organisation for an unknown merchant");

      const [organisationMapping] = await tx.select({ subjectId: coreLegacyIdentityMappings.canonicalSubjectId })
        .from(coreLegacyIdentityMappings)
        .where(and(
          eq(coreLegacyIdentityMappings.clientApplicationId, NEUROCITY_CLIENT_APPLICATION_ID),
          eq(coreLegacyIdentityMappings.legacySource, MERCHANT_SOURCE),
          eq(coreLegacyIdentityMappings.legacyId, String(merchantContext.merchantId)),
          eq(coreLegacyIdentityMappings.canonicalSubjectType, "organisation"),
          eq(coreLegacyIdentityMappings.linkStatus, "active"),
        )).limit(1);
      organisationId = organisationMapping?.subjectId ?? createUuidV7();
      if (!organisationMapping) {
        await tx.insert(coreOrganisations).values({ id: organisationId, legalName: merchant.name, tradingName: merchant.name });
        await tx.insert(coreLegacyIdentityMappings).values({
          id: createUuidV7(), clientApplicationId: NEUROCITY_CLIENT_APPLICATION_ID,
          legacySource: MERCHANT_SOURCE, legacyId: String(merchantContext.merchantId),
          canonicalSubjectType: "organisation", canonicalSubjectId: organisationId,
          linkMethod: "migration_exact", evidenceReferences: [`merchant:${merchantContext.merchantId}`],
        });
      } else {
        const [activeOrganisation] = await tx.select({ id: coreOrganisations.id }).from(coreOrganisations).where(and(
          eq(coreOrganisations.id, organisationId), eq(coreOrganisations.status, "active"),
        )).limit(1);
        if (!activeOrganisation) throw new Error("Canonical organisation mapping is stale or inactive");
      }

      const [membershipMapping] = await tx.select({ subjectId: coreLegacyIdentityMappings.canonicalSubjectId })
        .from(coreLegacyIdentityMappings)
        .where(and(
          eq(coreLegacyIdentityMappings.clientApplicationId, NEUROCITY_CLIENT_APPLICATION_ID),
          eq(coreLegacyIdentityMappings.legacySource, MERCHANT_MEMBERSHIP_SOURCE),
          eq(coreLegacyIdentityMappings.legacyId, String(merchantContext.id)),
          eq(coreLegacyIdentityMappings.canonicalSubjectType, "membership"),
          eq(coreLegacyIdentityMappings.linkStatus, "active"),
        )).limit(1);
      membershipId = membershipMapping?.subjectId ?? createUuidV7();
      if (!membershipMapping) {
        await tx.insert(coreMemberships).values({
          id: membershipId, personId, organisationId,
          roleKeys: [`merchant.${merchantContext.role}`],
          clientApplicationIds: [NEUROCITY_CLIENT_APPLICATION_ID],
        });
        await tx.insert(coreLegacyIdentityMappings).values({
          id: createUuidV7(), clientApplicationId: NEUROCITY_CLIENT_APPLICATION_ID,
          legacySource: MERCHANT_MEMBERSHIP_SOURCE, legacyId: String(merchantContext.id),
          canonicalSubjectType: "membership", canonicalSubjectId: membershipId,
          linkMethod: "migration_exact", evidenceReferences: [`merchant_membership:${merchantContext.id}`],
        });
      } else {
        const [activeMembership] = await tx.select({ id: coreMemberships.id }).from(coreMemberships).where(and(
          eq(coreMemberships.id, membershipId), eq(coreMemberships.personId, personId),
          eq(coreMemberships.organisationId, organisationId), eq(coreMemberships.status, "active"),
          or(isNull(coreMemberships.validUntil), gt(coreMemberships.validUntil, now)),
        )).limit(1);
        if (!activeMembership) throw new Error("Canonical membership is missing, inactive, expired, or belongs to another tenant");
      }
      roles = [`merchant.${merchantContext.role}`];
      scopes = roleScopes(merchantContext.role);
      ownershipScope = "organisation";
    }

    const actorExpiry = new Date(Math.min(session.expiresAt.getTime(), now.getTime() + 5 * 60_000));
    return freezeCurrentActor({
      actor_id: personId,
      actor_type: session.user.platformRole === "administrator" ? "platform_operator" : "person",
      person_id: personId,
      ownership_scope: ownershipScope,
      organisation_id: organisationId,
      membership_id: membershipId,
      delegated_grant_id: null,
      client_application_id: NEUROCITY_CLIENT_APPLICATION_ID,
      session_id: coreActorSessionId,
      credential_id: null,
      roles,
      scopes,
      assurance_level: "aal1",
      support_access_grant_id: null,
      purpose: "identity.shadow_resolution",
      request_id: createUuidV7(),
      correlation_id: createUuidV7(),
      issued_at: now.toISOString(),
      expires_at: actorExpiry.toISOString(),
    });
  });
}

export const identityShadowEnabled = () => process.env.NEUROEDGE_IDENTITY_SHADOW_ENABLED === "true";
