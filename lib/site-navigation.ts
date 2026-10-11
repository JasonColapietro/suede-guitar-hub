export const primaryNavigation = [
  { href: "/learn/guitar", label: "Lessons", roots: ["/learn"] },
  { href: "/advanced", label: "Advanced", roots: ["/advanced"] },
  { href: "/practice", label: "Practice", roots: ["/practice"] },
  { href: "/tools", label: "Tools", roots: ["/tools", "/session", "/tempo", "/log", "/readiness", "/diagnose", "/breakthrough"] },
  { href: "/guides", label: "Guides", roots: ["/guides", "/resources", "/glossary"] },
] as const;

/** Match complete route segments so /practice never claims /practice-anything. */
export function currentNavigationHref(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  return primaryNavigation.find(link => link.roots.some(root => pathname === root || pathname.startsWith(`${root}/`)))?.href;
}
