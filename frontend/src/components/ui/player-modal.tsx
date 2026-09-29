import ProfilePicture from "./profile-picture";
import { useEffect, useState } from "react";
import { User } from "@/helpers/types";
import { makeRequest } from "@/helpers/api";
import { BACKEND_URL } from "@/helpers/info";
import { UserPlus, X, Send, Search } from "lucide-react";
import { useShowNotification } from "@/contexts/notification-provider";
import Modal from "../ui/modal";
import { useUser } from "@/contexts/user-provider";
export interface Player {
    id: number;
    username:string;
    profilePicture: string;
}


function InviteFriend({friend}: {friend: User}) {
    const showNotification = useShowNotification();
    const {socketId} = useUser();

    const inviteFriend = async () => {
        if (friend.is_online && friend.game_state === "idle") {
        const response = await makeRequest("/game/invite/send", {auth: true, method: "POST", data: {
            invitedId: friend.id,
            mode: "1v1",
            socketId,
            dontNarrowError: true,
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
    <div className="flex items-center justify-between rounded-2xl bg-[#43435d] p-3 w-full">
        <div className="flex gap-4.5 items-center">
            <ProfilePicture height="40px" width="40px" img={`${BACKEND_URL}${friend.avatar_url}`}/>
            <h1>{friend.username}</h1>
        </div>
        <button
        className="rounded-xl p-2 bg-[#5c5c7f] hover:bg-[#7474a5] hover:cursor-pointer" 
        onClick={inviteFriend}
        >
            <Send />
        </button>
    </div>)
}

function InviteTournament({friend} : {friend: User}) {
    const shownotification = useShowNotification();

    const invitedFriend = async () => {
        if (friend.is_online && friend.game_state === "idle") {
            const response = await makeRequest("/game/tournament/test", { method: "POST", auth: true, data: { invitedId: friend.id }});
            if (response.success)
            {
                shownotification({
                    message: "Tournament invitate sent successfully",
                    type: "success",
                });
            }
            else
            {
                shownotification({
                    message: response.error || "Error sending invitation",
                    type: "error",
                });
            }
        }
        else
        {
            shownotification({
                message: `${friend.username} is currently ${friend.is_online ? "in a game" : "offline"}`,
                type: "error",
            });
        }
    }
    return (
            <div className="flex items-center justify-between rounded-2xl bg-[#43435d] p-3 w-full">
        <div className="flex gap-4.5 items-center">
            <ProfilePicture height="40px" width="40px" img={`${BACKEND_URL}${friend.avatar_url}`}/>
            <h1>{friend.username}</h1>
        </div>
        <button
        className="rounded-xl p-2 bg-[#5c5c7f] hover:bg-[#7474a5] hover:cursor-pointer" 
        onClick={invitedFriend}
        >
            <Send />
        </button>
    </div>
    );
}

export default function ChoosePlayer({mode}: {mode: string}) {
    const [friends, setFriends] = useState<Set<User>>(new Set());
    useEffect(() => {
        const fetchFriends = async () => {
        const response = await makeRequest("/relationships/friends/list?invitable=true", {auth: true});
        if (!response.success || !response.details || !response.details.friends)
            return;
        setFriends(new Set(response.details.friends));
        }
        fetchFriends();
        return () => {
        }
     }, []);
    

    
    return (
        <div className="flex flex-col items-center gap-1.5">
            <h1 className="text-xl font-bold pb-3">Choose a friend</h1>
            <div className="flex justify-around w-[90%]">
                <input
                    className="rounded-2xl border-2 border-bold border-white w-[80%] p-2 focus:outline-none"
                    placeholder="Search for a friend..."
                />
                <div className=" rounded-2xl p-2 justify-center bg-[#46466b] hover:bg-[#8c8cbd] hover:cursor-pointer">
                    <Search height={30}/>
                </div>
            </div>
            <div className="flex flex-col items-center max-h-100 px-2  gap-1.5 w-full pt-2 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500 scrollbar-track-gray-900">
            {friends.size > 0 ?
                Array.from(friends).map(friend =>
                mode === "1v1" ?
                <InviteFriend key={friend.id} friend={friend}/> :
                <InviteTournament key={friend.id} friend={friend}/>
                
                )
                    :
                <h1>You currently have no friends. Loser</h1>
            }
            </div>
        </div>
    )

}