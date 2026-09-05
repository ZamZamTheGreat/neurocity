export type CurrentActor = Readonly<{
  actor_id: string;
  actor_type: "person" | "platform_operator";
  person_id: string;
  ownership_scope: "personal" | "organisation" | "platform";
  organisation_id: string | null;
  membership_id: string | null;
  delegated_grant_id: null;
  client_application_id: string;
  session_id: string;
  credential_id: null;
  roles: readonly string[];
  scopes: readonly string[];
  assurance_level: "aal1";
  support_access_grant_id: null;
  purpose: "identity.shadow_resolution";
  request_id: string;
  correlation_id: string;
  issued_at: string;
  expires_at: string;
}>;

export function freezeCurrentActor(actor: CurrentActor): CurrentActor {
  return Object.freeze({
    ...actor,
    roles: Object.freeze([...actor.roles]),
    scopes: Object.freeze([...actor.scopes]),
  });
}
