import React from "react";

type SidebarMenuItemProps = {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  onClick?: () => void;
};

export default function SidebarMenuItem({ Icon, label, onClick }: SidebarMenuItemProps) {
  return (
    <div
      className="flex items-center gap-2 py-2 w-full cursor-pointer hover:bg-[#2a2a38] rounded-md px-2"
      onClick={onClick}
      role="button"
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm text-white">{label}</span>
    </div>
  );
}
