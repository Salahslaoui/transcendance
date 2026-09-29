
"use client";

import { Send, Eye, MoreVertical, UserMinus, Ban, Trash2 } from "lucide-react";
import ProfilePicture from "../ui/profile-picture";
import WebsocketService from "@/services/ws";
import { useShowNotification } from "@/contexts/notification-provider";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { makeRequest } from "@/helpers/api";
import { User, FriendsProps } from "@/helpers/types";
import { BACKEND_URL } from "@/helpers/info";
import { WsDataIn } from "@/services/ws";
import { FaUserFriends } from "react-icons/fa";
import Api from "@/helpers/axios";
import { useGame } from "@/contexts/game-provider";
import { useUser } from "@/contexts/user-provider";


const FriendUser = ({friend, onRemoveFriend}: {friend: User, onRemoveFriend: (friendId: number) => void}) => {
  const showNotification = useShowNotification();
  const [showDropdown, setShowDropdown] = useState(false);
  const {socketId} = useUser();

  const handleRemoveFriend = async () => {
    try {
		const response = await Api.delete(`/relationships/friends/remove/${friend.id}`);
      	if (response.data.success) {
      	  showNotification({
      	    message: `Removed ${friend.username} from friends`,
      	    type: "success",
      	  });
      	  onRemoveFriend(friend.id);
      	} else {
      	  showNotification({
      	    message: "Failed to remove friend",
      	    type: "error",
      	  });
      	}
    } catch (error) {
      console.error("Error removing friend:", error);
      showNotification({
        message: "Failed to remove friend",
        type: "error",
      });
    }
    setShowDropdown(false);
  };

  const handleBlockFriend = async () => {
    try {
		const response = await Api.post(`/relationships/friends/block/${friend.id}`, {});
      if (response.data.success) {
        showNotification({
          message: `Blocked ${friend.username}`,
          type: "success",
        });
        onRemoveFriend(friend.id);
      } else {
        showNotification({
          message: "Failed to block friend",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error blocking friend:", error);
      showNotification({
        message: "Failed to block friend",
        type: "error",
      });
    }
    setShowDropdown(false);
  };

  const inviteFriend = async () => {
    if (friend.is_online && friend.game_state === "idle") {
      const response = await makeRequest("/game/invite/send", {auth: true, method: "POST", dontNarrowError: true, data: {
        invitedId: friend.id,
        mode: "1v1",
        socketId,
      }});
      if (response.success) {
        showNotification({
          message: "Game invite sent successfully 🎉",
          type: "success",
        });
      } else {
        showNotification({
          message: response.error || "Error sending invitation",
          type: "error",
        })
      }
    } else {
      showNotification({
        message: `${friend.username} is currently ${friend.is_online ? "in a game" : "offline"} 🎮`,
        type: "error",
      });
    }
  }

  return (
    <div className="relative flex items-center gap-4 px-6 py-3 hover:bg-gray-800/30 transition-colors">
        <ProfilePicture img={`${BACKEND_URL}${friend.avatar_url}`} height="40px" width="40px" showOnline={friend.is_online}/>
        <div className="flex-1">
          <p className="text-white font-medium">{friend.username}</p>
        </div>
        <button
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors
            ${
              friend.is_online && friend.game_state === "idle"
                ? "bg-[#22c55e] hover:bg-[#16a34a] cursor-pointer"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          onClick={inviteFriend}
        >
          <Send className="w-5 h-5 text-white" />
        </button>
        <button className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0c48a9ce] hover:bg-[#3b83f6ce] cursor-pointer transition-colors">
            <Eye className="w-5 h-5"/>
        </button>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-600 hover:bg-gray-500 cursor-pointer transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-white" />
          </button>
          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 top-14 bg-[#0D0D12] border border-gray-600 rounded-xl shadow-2xl w-48 z-50">
                <ul className="p-2">
                  <li>
                    <button
                      onClick={handleRemoveFriend}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left text-white hover:bg-[#1a1a22] rounded-lg transition-colors"
                    >
                      <UserMinus className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">Remove Friend</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleBlockFriend}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left text-white hover:bg-[#1a1a22] rounded-lg transition-colors"
                    >
                      <Ban className="w-4 h-4 text-red-500" />
                      <span className="text-sm">Block User</span>
                    </button>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
    </div>
    );
}

export default function Friends({friends, setFriends}: FriendsProps) {
  const [error, setError] = useState<string | null>(null);

  const handleRemoveFriend = (friendId: number) => {
    setFriends(prev => {
      const newSet = new Set(prev);
      for (let friend of newSet) {
        if (friend.id === friendId) {
          newSet.delete(friend);
          break;
        }
      }
      return newSet;
    });
  };

  const handleFriendDisconnect = (event: WsDataIn) => {
    const id = event.details.id;
    if (!id)
      throw new Error("No id");
    setFriends(prev => {
      const newSet = new Set(prev);
      for (let friend of newSet) {
        if (friend.id === id) {
          friend.is_online = false;
          return newSet;
        }
      }
      return prev;
    });
  }

  const handleFriendConnect = (event: WsDataIn) => {
    const id = event.details.id;
    if (!id)
      throw new Error("No id");
    setFriends(prev => {
      const newSet = new Set(prev);
      for (let friend of newSet) {
        if (friend.id === id) {
          friend.is_online = true;
          return newSet;
        }
      }
      return prev;
    });
  }

  useEffect(() => {
    WebsocketService.subscribe("friend_connect", handleFriendConnect);
    WebsocketService.subscribe("friend_disconnect", handleFriendDisconnect);
    const fetchFriends = async () => {
      const response = await makeRequest("/relationships/friends/list", {auth: true});
      if (!response.success || !response.details || !response.details.friends) {
        setError(response.error!);
        return;
      }
      setFriends(new Set(response.details.friends));
    }
    fetchFriends();
    return () => {
      WebsocketService.unsubscribe("friend_connect", handleFriendConnect);
      WebsocketService.unsubscribe("friend_disconnect", handleFriendDisconnect);
    }
  }, []);

  return (
    <div className="dashboard-card flex-col w-full h-full">
    <div className="flex items-center justify-between px-6 py-4 dashboard-border min-h-15.5">
      <FaUserFriends />
        <h2 className="text-xl font-bold text-white">Friends</h2>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {friends.size > 0 ? (
          <div className="flex flex-col">
            {Array.from(friends).map((friend, index) => (
              <div
                key={friend.id}
                className={index < friends.size - 1 ? 'border-b-2 border-gray-800' : ''}
              >
                <FriendUser friend={friend} onRemoveFriend={handleRemoveFriend} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">You currently have no friends. Loser</p>
          </div>
        )}
      </div>
    </div>
  );
}
