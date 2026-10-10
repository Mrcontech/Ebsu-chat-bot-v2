import Link from "next/link";
import { BrandTile } from "./brand-tile";

export { BrandTile };

export function Brand({ href = "/", subtitle = "Ebonyi State University" }: { href?: string; subtitle?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-[var(--radius-control)] outline-offset-4">
      <BrandTile />
      <span className="flex flex-col leading-tight">
        <span className="text-[15px] font-semibold tracking-tight text-ink">EBSU Enquiry Bot</span>
        <span className="text-xs text-ink-3">{subtitle}</span>
      </span>
    </Link>
  );
}
