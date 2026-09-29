import { useState, useEffect, use } from "react";
import { User as UserIcon, UserPen, ChevronDown, Settings, LogOut } from "lucide-react";
import SidebarMenuItem from "../ui/sidebar-menu-item";
import testImg from "@/assets/test-img.jpeg";
import ProfilePicture from "../ui/profile-picture";
import { Dispatch, SetStateAction } from "react";
import { microtask } from "framer-motion";
import { BACKEND_URL } from "@/helpers/info";
import { LocalStorageManager } from "@/helpers/info";
import axios from "axios";
import WebsocketService from "@/services/ws";
import { useIsAuth, useUser } from "@/contexts/user-provider";

interface SidebarUserProps {
  isCollapsed: boolean;
  isDropdownOpen: boolean;
  setIsDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
}



export default function SidebarUser({isCollapsed, isDropdownOpen, setIsDropdownOpen}: SidebarUserProps) {
  const [loading, setLoading] = useState(true);
  const {setUser} = useUser();
  let {user} = useUser();
  const {setIsAuth} = useIsAuth();

  async function handleLogout() {
    WebsocketService.reset();
    try {
      await axios.post(`${BACKEND_URL}/auth/logout`, {}, {
        withCredentials: true
      });
    } catch (error) {
      console.error("Backend logout failed:", error);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(undefined);
    setIsAuth(false);
  }

  useEffect(() => {
    if (user) {
      setLoading(false);
    }
  }, [user]);

 if (loading)
    return <h1>Loading</h1>

  return (
    <div className={`flex items-center gap-2 p-2  rounded-lg ${!isCollapsed ? "bg-[#1a1a22]" : "" } `}>

      {!isCollapsed &&
        <div className="flex gap-2 flex-1">
            <ProfilePicture img={`${BACKEND_URL}${user!.avatar_url}`} height="40px" width="40px" />
          <div className="grid">
            <span className="text-xs font-medium text-white whitespace-nowrap">{user!.username}</span>
            <span className="text-[10px] text-gray-400">{user!.game_state === "idle" ? "Idle" : "In game"}</span>
          </div>
        </div>
      }

      <div className="relative">
        <div
          className="hover:bg-[#515164] border border-transparent rounded-lg p-1 cursor-pointer"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
        >
          <ChevronDown
            className={`w-6 h-6 text-gray-400 transition-transform duration-200 ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
          />
        </div>

        <div
          className={`flex flex-col items-start
            absolute left-12 bottom-0 w-48 pt-3 pb-3 px-4 rounded-3xl bg-[#1a1a22] z-50
            transition-all duration-200 ease-out
            transform ${isDropdownOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}
            shadow-lg
          `}
        >
          <SidebarMenuItem Icon={LogOut} label="Logout" onClick={handleLogout} />
        </div>
      </div>
    </div>
  );
}
