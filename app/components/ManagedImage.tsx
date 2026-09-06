import Image, { type ImageProps } from "next/image";

type ManagedImageProps = Omit<ImageProps, "src" | "width" | "height"> & {
  src: string;
  width?: number;
  height?: number;
};

export function ManagedImage({ src, width = 1200, height = 900, unoptimized, ...props }: ManagedImageProps) {
  // Private media endpoints issue short-lived redirects to verified R2 objects.
  // Loading them directly lets the browser follow that redirect; the image
  // optimizer cannot reliably proxy this authenticated delivery chain.
  const requiresDirectDelivery = /^(?:blob:|data:|https?:)/i.test(src) || /^\/api\/(?:merchant\/)?(?:stores\/[^/]+\/)?(?:.*\/)?media(?:\?|$)/i.test(src);
  return <Image src={src} width={width} height={height} unoptimized={unoptimized ?? requiresDirectDelivery} {...props} />;
}
