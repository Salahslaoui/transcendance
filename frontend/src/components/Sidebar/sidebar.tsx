"use client";

import SidebarItem from "./sidebar-item"
import SidebarUser from "./siderbar-user"
import { Joystick, ChevronLeft } from "lucide-react"
import React, { useState } from "react"
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { sidebarData } from "@/helpers/utils";


export interface SidebarPages {
  Icon: LucideIcon;
  title: string;
  path: string;
  
}

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const pages: SidebarPages[] = sidebarData;

  return (
    <div
      className={`flex flex-col border-r-2 border-slate-500 transition-all duration-700 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      } h-screen bg-[#0D0D12] px-5 pb-5`}
    >
      <div className={`flex ${isCollapsed ? "justify-center" : "justify-between"} items-center gap-3 mt-4 mb-6  w-full`}>
        {!isCollapsed && (
          <div className="flex gap-1.5">
            <Joystick className="w-6 h-6 text-[#8F5AFF]" />
            <span className="text-xl font-semibold tracking-wide">
              Pong<span className="text-[#5AD1D1]">HUB</span>
            </span>
          </div>
        )}
        <div className="flex-shrink-0">
          <ChevronLeft
            onClick={() => {
              if (isDropdownOpen) {
                setIsDropdownOpen(false);
                setTimeout(() => setIsCollapsed((p) => !p), 200);
              } else {
                setIsCollapsed((p) => !p);
              }
            }}
            className={`p-2 w-8 h-8 rounded hover:bg-[#262634] transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      <div className="grid gap-0">
        {pages.map((page, index) => {
          const isActive = pathname === page.path;
          return (
            <SidebarItem
              key={index}
              selected={isActive}
              isCollapsed={isCollapsed}
              onClick={() => router.push(page.path)}
              setIsDropdownOpen={setIsDropdownOpen}
              {...page}
            />
          );
        })}
      </div>

      <div className="flex-1" />
      <SidebarUser
        isCollapsed={isCollapsed}
        isDropdownOpen={isDropdownOpen}
        setIsDropdownOpen={setIsDropdownOpen}
      />
    </div>
  );
}
