"use client";

import { Search as SearchIcon, UserPlus, Eye, X } from "lucide-react";
import { MdOutlinePending } from "react-icons/md";
import { ImBlocked } from "react-icons/im";
import { FaUserFriends } from "react-icons/fa";
import { useState, useEffect, ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useShowNotification } from "@/contexts/notification-provider";
import { BACKEND_URL } from "@/helpers/info";
import Api from "@/helpers/axios";
import Profile from "../Profile/profile";
import { narrowToastError } from "../Chat/chat-utils";
import WebsocketService from "@/services/ws";

type User = {
	id: number;
	username: string;
	avatar_url: string;
	status: "accepted" | "pending" | "rejected" | "none";
};

const ButttonClass = "w-12 h-8 flex items-center justify-center text-sm text-white rounded-lg transition-colors";

const StatusButton = ({ value, color }: { value: ReactNode; color: string }) => (
  <button disabled className={`${ButttonClass} ${color} cursor-not-allowed`}>
    {value}
  </button>
);

const statusConfig: Record<string, { icon: ReactNode; color: string }> = {
  accepted: { icon: <FaUserFriends className="w-4 h-4" />, color: "bg-yellow-500" },
  pending: { icon: <MdOutlinePending className="w-4 h-4" />, color: "bg-gray-600" },
  blocked: { icon: <ImBlocked className="w-4 h-4" />, color: "bg-red-600" },
};

export default function Search() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<User[]>([]);
	const [showResults, setShowResults] = useState(false);
	const showNotification = useShowNotification();
    const router = useRouter();
    const searchParams = useSearchParams();
	const pathname = usePathname();
	const viewingUserIdParam = searchParams.get('Profile');
	const [viewingUserId, setViewingUserId] = useState<number>();

	const viewProfile = (userId: number) => {
		const params = new URLSearchParams(searchParams.toString());
        params.set('Profile', userId.toString());
        router.push(`?${params.toString()}`);
		setShowResults(false);
	};

	useEffect(() => {
		const checkValidUserId = async () => {
			const user_id = Number(viewingUserIdParam);
			if (isNaN(user_id)){
				router.replace(pathname)
				return ;
			}
			try {
				await Api.get(`/game/match-history/user/${user_id}/profile`); // to check if the profile exists
				setViewingUserId(user_id);
			}
			catch(e){
				router.replace(pathname);
			}
		}
		if (viewingUserIdParam !== null)
			checkValidUserId();
	}, [viewingUserIdParam]);

	const closeProfile = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('Profile');
        const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
        router.push(newUrl);
		setViewingUserId(undefined);
    };

	const handleAddFriend = async (targetUserId: number, username: string) => {
		try {
			const response = await Api.post(`/relationships/friends/request`,{ targetUserId });
			if (response.data.success) {
				showNotification({
					message: `Friend request sent to ${username}`,
					type: "success"
				});
				setResults((prev) =>
    			prev.map((u) =>
    				u.id === targetUserId ? { ...u, status: "pending" } : u
    			)
  				);
			}
		} catch (error: any) {
			console.error("Friend request error:", error);
			showNotification({
				message: "Failed to send friend request",
				type: "error"
			});
		}
	};

	useEffect(() => {
    	if (!query.trim()) {
    	  setResults([]);
    	  setShowResults(false);
    	  return;
    	}
    	const timeoutId = setTimeout(async () => {
    	  try {
			const response = await Api.get(`/relationships/friends/search/${encodeURIComponent(query.trim())}`);
    	    if (response.data.success && response.data.details) {
    	      setResults(response.data.details);
    	      setShowResults(true);
    	    } else {
    	      setResults([]);
    	      setShowResults(false);
    	    }
    	  } catch (error) {
    	    console.error("Search error:", error);
    	    setResults([]);
    	    setShowResults(false);
    	  }
    	}, 500);
    	return () => clearTimeout(timeoutId);
  	}, [query]);

	return (
    	<div className="relative">
			{viewingUserId && (
			  <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
			    <div className="relative max-w-7xl mx-auto flex flex-col bg-transparent rounded-2xl overflow-hidden" style={{width: "95vw", height: "95vh"}}>
		      <button
		        onClick={closeProfile}
		        className="absolute top-5 right-5 text-gray-400 hover:text-white bg-gray-800/80 rounded-full p-2 transition z-10"
		      >
		        <X className="w-5 h-5" />
		      </button>
		      <div className="flex-1 overflow-y-auto scrollbar-none">
		        <Profile userId={viewingUserId} />
		      </div>
			    </div>
			  </div>
			)}
    	  <div className="flex gap-2">
    	    <div className="relative">
    	      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
    	      <input
    	        type="text"
    	        value={query}
    	        onChange={(e) => setQuery(e.target.value)}
    	        placeholder="Search users..."
    	        className="w-72 pl-11 pr-3 py-2 text-sm text-white bg-[#1a1a22] border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-600/60 focus:border-transparent placeholder-gray-400"
    	      />
    	    </div>
    	  </div>
    	  {showResults && (
    	    <ul className="absolute left-0 mt-2 w-72 bg-[#1a1a22] border border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50 scrollbar-thin scrollbar-thumb-cyan-500 scrollbar-track-gray-900">
    	      {results.length === 0 ? (
    	        <li className="flex items-center justify-center px-4 py-8 text-sm text-gray-400">
    	          <div className="text-center">No users found</div>
    	        </li>
    	      ) : (
    	        results.map((user: User) => {
    	          const { id, username, avatar_url, status } = user;
    	          const config = statusConfig[status];
    	          return (
    	            <li
    	              key={id}
    	              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors"
    	            >
    	              <img
    	                src={`${BACKEND_URL}${avatar_url}`}
    	                alt={username}
    	                className="w-8 h-8 rounded-full object-cover"
    	              />
    	              <span className="font-medium text-sm flex-1 text-white">
    	                {username}
    	              </span>
    	              <button
    	                onClick={() => viewProfile(id)}
    	                className={`${ButttonClass} bg-blue-600 hover:bg-blue-700`}
    	              >
    	                <Eye className="w-3 h-3" />
    	              </button>
    	              {config ? (
    	                <StatusButton value={config.icon} color={config.color} />
    	              ) : (
    	                <button
    	                  onClick={() => handleAddFriend(id, username)}
    	                  className={`${ButttonClass} bg-green-600 hover:bg-green-700`}
    	                >
    	                  <UserPlus className="w-3 h-3" />
    	                </button>
    	              )}
    	            </li>
    	          );
    	        })
    	      )}
    	    </ul>
    	  )}
    	</div>
	);
}
