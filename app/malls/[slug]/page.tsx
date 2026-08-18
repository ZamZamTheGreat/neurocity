import { MarketplaceExperience } from "../../page";

export default async function DigitalMallPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <MarketplaceExperience mallSlug={slug} />;
}
