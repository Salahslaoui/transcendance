"use client";
import { Archive, Octagon } from "lucide-react"
import SidebarCard from "../ui/sidebar-card"
import type {SidebarPages} from "./sidebar"
import { Dispatch, SetStateAction } from "react";
import { useGame } from "@/contexts/game-provider";

interface SidebarProps extends SidebarPages {
    selected: boolean;
    isCollapsed: boolean;
    setIsDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onClick: () => void;
    
}

export default function SidebarItem({ Icon, title, selected, isCollapsed, onClick, setIsDropdownOpen}: SidebarProps) {
    const {setIsGameOpen} = useGame();
    const handleClick = (e: React.MouseEvent) => {
        setIsDropdownOpen(false);
        setIsGameOpen(false);
        onClick();
    };
    
    return(
        <div 
            className={`flex w-full  mx-auto ${isCollapsed ? "justify-center": ""} items-center gap-3 mt-4 p-3 border border-transparent rounded-lg cursor-pointer transition-colors
            ${selected ? "bg-[#43435d]" : "hover:bg-[#262634] border-gray-400"}`}
            onClick={handleClick}
        >
            <Icon className="w-5 h-5" />
            {!isCollapsed && <span>{title}</span>}
        </div>
    )
}