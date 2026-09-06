import Image, { type ImageProps } from "next/image";

type ManagedImageProps = Omit<ImageProps, "src" | "width" | "height"> & {
  src: string;
  width?: number;
  height?: number;
};

export function ManagedImage({ src, width = 1200, height = 900, unoptimized, ...props }: ManagedImageProps) {
  const requiresDirectDelivery = /^(?:blob:|data:|https?:)/i.test(src);
  return <Image src={src} width={width} height={height} unoptimized={unoptimized ?? requiresDirectDelivery} {...props} />;
}
