import ProfilePicture from "../ui/profile-picture";
import Level from "./Level";
import { LocalStorageManager } from '@/helpers/info';
import { BACKEND_URL } from '@/helpers/info';
import { useState, useEffect } from "react";
import Api from '@/helpers/axios';
import { useUser } from "@/contexts/user-provider";
import { User } from "@/helpers/types";

interface ProfileHeaderProps {
    userId?: number;
}

export default function ProfileHeader({ userId }: ProfileHeaderProps = {}) {
  const {user} = useUser();
    if (!user)
        throw new Error("No user");
    const [userInfo, setUserInfo] = useState<User>(user);
    useEffect(() => {
        if (userId) {
            const fetchUserInfo = async () => {
                try {
                    const response = await Api.get(`/game/match-history/user/${userId}/profile`);
                    if (response.data && response.data.details) {
                        setUserInfo({
                            id: response.data.details.id,
                            username: response.data.details.username,
                            avatar_url: response.data.details.avatar_url,
                            game_state: response.data.details.game_state || "idle",
                            is_online: response.data.details.is_online || false
                        });
                    }
                } catch (err) {
                    console.error("Error fetching user info:", err);
                }
            };
            fetchUserInfo();
        }
    }, [userId]);
    return (
      <>
        <div className="w-full pt-5 pb-5 px-7 backdrop-blur-xl border border-gray-800 rounded-xl shadow-xl hover:bg-gray-800/30 transition-colors  transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              <ProfilePicture
                height="64px"
                width="64px"
                img={`${BACKEND_URL}${userInfo.avatar_url}`}
              />
			  
              <div className="ml-5 flex flex-col justify-center flex-1 max-w-md">
                <h1 className="text-xl font-bold text-white mb-1 drop-shadow">{userInfo.username}</h1>
                <span className="block text-blue-200 text-sm font-mono mb-2">@{userInfo.username}</span>
                <Level userId={userId} />
              </div>
            </div>
          </div>
        </div>
      </>
    )
}