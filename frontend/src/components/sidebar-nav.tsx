"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/create", label: "智能生成" },
  { href: "/canvas", label: "画布模式" },
  { href: "/workflow", label: "工作流模式" },
  { href: "/tasks", label: "批量任务" },
  { href: "/library", label: "图库与历史" },
  { href: "/design-system", label: "设计规范" },
  { href: "/settings", label: "系统设置" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2 w-full">
      {navItems.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href + "/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 w-full py-2 px-3 ${
              active ? "bg-[#FAFAFA] border-l-3 border-[#E42313]" : ""
            }`}
          >
            <span
              className={`font-space-grotesk text-sm ${
                active ? "font-medium text-[#E42313]" : "text-[#7A7A7A]"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

