"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Buildings,
  AddressBook,
  CreditCard,
  Percent,
  Upload,
  Sparkle,
} from "@phosphor-icons/react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; weight?: "regular" | "bold" | "fill" | "duotone" }>;
}

interface SettingsSidebarNavProps {
  workspaceSlug: string;
}

const navItems: NavItem[] = [
  { label: "Allmänt", href: "", icon: Buildings },
  { label: "Kontakt", href: "/contact", icon: AddressBook },
  { label: "Betalning", href: "/payment", icon: CreditCard },
  { label: "Moms & skatt", href: "/tax", icon: Percent },
  { label: "Import", href: "/import", icon: Upload },
  { label: "Regler", href: "/rules", icon: Sparkle },
];

export function SettingsSidebarNav({ workspaceSlug }: SettingsSidebarNavProps) {
  const pathname = usePathname();
  const basePath = `/${workspaceSlug}/settings`;

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const fullHref = `${basePath}${item.href}`;
        const isActive =
          item.href === ""
            ? pathname === basePath
            : pathname === fullHref || pathname.startsWith(`${fullHref}/`);

        return (
          <Link
            key={item.href}
            href={fullHref}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            )}
          >
            <item.icon
              className="size-5 shrink-0"
              weight={isActive ? "fill" : "regular"}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
