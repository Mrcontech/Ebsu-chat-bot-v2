import { ChatsCircleIcon } from "@phosphor-icons/react/dist/ssr";

/** The app mark: one icon in the accent tile. Safe in server and client components. */
export function BrandTile({ size = 36 }: { size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-[11px] bg-accent-strong text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      aria-hidden
    >
      <ChatsCircleIcon size={Math.round(size * 0.58)} weight="fill" />
    </span>
  );
}
