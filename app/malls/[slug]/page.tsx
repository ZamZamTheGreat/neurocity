import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { platformTenants } from "../../../db/schema";
import { MarketplaceExperience } from "../../page";

export default async function DigitalMallPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [mall] = await getDb()
    .select({ id: platformTenants.id })
    .from(platformTenants)
    .where(
      and(
        eq(platformTenants.slug, slug),
        eq(platformTenants.kind, "mall"),
        eq(platformTenants.status, "active"),
      ),
    )
    .limit(1);
  if (!mall)
    return (
      <main id="main-content" className="platform-state digital-mall-state">
        <a href="/" className="brand">
          <span>Neuro</span>
          <strong>City</strong>
        </a>
        <span className="platform-state-code">Unavailable</span>
        <h1>This digital mall is not currently open</h1>
        <p>
          It may be onboarding, temporarily suspended, or no longer part of the
          public network.
        </p>
        <a className="platform-state-action" href="/malls">
          Browse active digital malls
        </a>
      </main>
    );
  return <MarketplaceExperience mallSlug={slug} />;
}
