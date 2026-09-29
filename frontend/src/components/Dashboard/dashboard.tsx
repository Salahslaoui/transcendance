"use client";
import Friends from "./friends";
import WelcomeCard from "./welcome-card";
import MatchCard from "./match-card";
import MatchHistory from "./match-history";
import Notification from "./Notification";
import Search from "./Search";
import { User } from "@/helpers/types";
import { useEffect, useState } from "react";
import WebsocketService from "@/services/ws";
import Leaderboard from "./Leaderboard";
import { WsDataIn } from "@/services/ws";

export default function Dashboard() {
  const [friends, setFriends] = useState<Set<User>>(new Set());

  const handleFriendRequestAccepted = (event: WsDataIn) => {
    const data = event.details.friendInfo!;
    setFriends(prev => new Set([...prev, data]));
  };

  const handleFriendRemoved = (event: WsDataIn) => {
    const data = event.details.id!;
    setFriends(prev => new Set([...prev].filter(friend => friend.id !== data)));
  };

  const handleUserBlocked = (event: WsDataIn) => {
    const data = event.details.blocker!;
    setFriends(prev => new Set([...prev].filter(friend => friend.id !== data)));
  }

  useEffect(() => {
    WebsocketService.subscribe("friend_add", handleFriendRequestAccepted);
    WebsocketService.subscribe("user_unblocked", handleFriendRequestAccepted);
    WebsocketService.subscribe("friend_removed", handleFriendRemoved);
    WebsocketService.subscribe("user_blocked", handleUserBlocked);

    return () => {
      WebsocketService.unsubscribe("friend_add", handleFriendRequestAccepted);
      WebsocketService.unsubscribe("friend_removed", handleFriendRemoved);
      WebsocketService.unsubscribe("user_blocked", handleUserBlocked);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center w-full">
        <h2 className="font-bold text-2xl text-white">Dashboard</h2>
        <div className="flex items-center gap-3">
          <Search />
          <Notification setFriends={setFriends} />
        </div>
      </div>


      <div className="flex flex-col lg:flex-row gap-4 h-[40%] 2xl:h-[30%] w-full">
        <div className="flex-1 h-full">
          <WelcomeCard />
        </div>
        <div className="flex-1 h-full">
          <MatchCard setFriends={setFriends} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 w-full overflow-hidden">
        <div className="flex-1 min-w-[250px] max-w-full h-full overflow-auto">
          <Friends friends={friends} setFriends={setFriends} />
        </div>
        <div className="flex-1 min-w-[250px] max-w-full h-full overflow-auto">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}

