"use client";

import { Home, ClipboardList, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/programs", label: "Programs", icon: ClipboardList },
  { href: "/profile", label: "Profile", icon: User },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <div className="flex border-t border-border bg-card py-2.5 pb-3.5">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-1 ${
              isActive ? "text-ink" : "text-slate"
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
            <span className={`text-[11px] ${isActive ? "font-bold" : "font-normal"}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
