import { cn } from '@/lib/utils';
import Image from 'next/image';

/** Raster brand mark — size via className (default size-6). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/image.png"
      alt=""
      width={400}
      height={400}
      className={cn('size-6 shrink-0', className)}
      aria-hidden
    />
  );
}

/**
 * Locale-swapped wordmark — Hindi users see सीमांकन, English users see Simankan.
 * It is not a transliteration shown to both.
 */
export function BrandLockup({
  wordmark,
  tagline,
  className,
}: {
  wordmark: string;
  tagline?: string;
  className?: string;
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <BrandMark className="size-10" />
      <span className="flex flex-col leading-none">
        <span className="font-semibold text-base text-foreground">
          {wordmark}
        </span>
        {tagline ? (
          <span className="text-micro text-muted-foreground">{tagline}</span>
        ) : null}
      </span>
    </span>
  );
}
