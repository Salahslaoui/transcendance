import { SidebarPages } from "@/components/Sidebar/sidebar";
import { MatchState } from "./types";
import { LayoutDashboard, Gamepad, ChartNetwork, User, Settings, MessageCircle } from "lucide-react";


export function getPauseInfo(state: MatchState,  myDirection: "left" | "right") {
  let isSelfPaused = false;
  let text = "";

  switch (state) {
    case "init":
      text = "Match will start soon";
      break;
    case "running":
      text = "Match in progress";
      break;
    case "normal_pause_left":
      if (myDirection === "left") {
        isSelfPaused = true;
        text = "You have paused the game";
      } else
        text = "Other player has paused the game";

      break;
    case "normal_pause_right":
      if (myDirection === "right") {
        isSelfPaused = true;
        text = "You have paused the game";
      } else
        text = "Other player has paused the game";
      break;
    case "waiting_for_left":
      text = myDirection === "left" ? "Waiting for you to join" : "Waiting for the other player";
      break;
    case "waiting_for_right":
      text = myDirection === "right" ? "Waiting for you to join" : "Waiting for the other player";
      break;
    case "finished":
      text = "Match has ended";
      break;
  }

  return { text, isSelfPaused };
}



export const sidebarData: SidebarPages[] = [
    { Icon: LayoutDashboard, title: "Dashboard", path: "/dashboard" },
    { Icon: Gamepad, title: "Games", path: "/games" },
    { Icon: ChartNetwork, title: "Tournament", path: "/tournament" },
    { Icon: User, title: "Profile", path: "/profile" },
    { Icon: Settings, title: "Settings", path: "/settings" },
    { Icon: MessageCircle, title: "Chat", path: "/chat" },
  ];
