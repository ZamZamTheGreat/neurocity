import ApplyPage from "../../../apply/page";

export default async function MallMerchantApplicationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ApplyPage mallSlug={slug} />;
}
