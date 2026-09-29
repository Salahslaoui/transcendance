"use client";

import { useState, useEffect } from "react";
import Api from "@/helpers/axios";
import { MdLeaderboard } from "react-icons/md";
import { GiTicTacToe, GiPingPongBat } from "react-icons/gi";
import { FaMedal } from "react-icons/fa";
import ProfilePicture from "../ui/profile-picture";
import { BACKEND_URL } from "@/helpers/info";
import { User } from "@/helpers/types";

interface LeaderboardPlayer {
  id: number;
  username: string;
  wins: number;
  avatar_url: string;
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'ping-pong' | 'tic-tac-toe'>('ping-pong');
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const endpoint = activeTab === 'ping-pong' ? '/game/leaderboard/ping-pong' : '/game/leaderboard/tic-tac-toe';
      const response = await Api.get(endpoint);
      setLeaderboard(response.data.data);
	  setLoading(false);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const getMedal = (index: number) => {
    if (index === 0)
		return <FaMedal className="text-yellow-500"/>;
	if (index === 1)
		return <FaMedal className="text-gray-300"/>;
	if (index === 2)
		return <FaMedal className="text-amber-600"/>;
    return `#${index + 1}`;
  };

  return (
	<div className="dashboard-card flex-col w-full h-full">
		<div className="flex items-center justify-between px-6 py-4 dashboard-border min-h-15.5">
			<MdLeaderboard/>
			<h2 className="text-x1 font-bold text-white">Leaderboard</h2>
    	</div>
      	<div className="flex justify-center gap-2 px-6 py-3 dashboard-border">
        	<button
          		onClick={() => setActiveTab('ping-pong')}
          		className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            	activeTab === 'ping-pong'
              		? 'bg-blue-500 text-white'
              		: 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
          		}`}
        	>
          		<GiPingPongBat className="inline-block mr-1 text-red-500 text-xl" /> Ping Pong
        	</button>
        	<button
          		onClick={() => setActiveTab('tic-tac-toe')}
          		className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            	activeTab === 'tic-tac-toe'
              		? 'bg-blue-500 text-white'
              		: 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
          		}`}
        	>
          		<GiTicTacToe className="inline-block mr-1 text-purple-500 text-xl" /> Tic Tac Toe
        	</button>
		</div>
    	<div className="flex-1 overflow-y-auto scrollbar-none">
        	{loading ? (
          		<div className="flex items-center justify-center h-full">
            		<p className="text-gray-400">Loading...</p>
          		</div>
        	) : (
        	<div className="flex flex-col">
            	{leaderboard.map((player, index) => (
              	<div
                	key={player.id}
                	className={`flex items-center gap-4 px-6 py-3 hover:bg-gray-800/30 transition-colors ${
                  	index < leaderboard.length - 1 ? 'border-b-2 border-gray-800' : ''
                }`}
            	>
                <div className={`text-xl font-bold min-w-[40px]`}>
                  {getMedal(index)}
                </div>
				<ProfilePicture height="40px" width="40px" img={`${BACKEND_URL}${player.avatar_url}`} />
                <div className="flex-1">
                  <p className="text-white font-medium">{player.username}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-green-400 font-bold text-lg">{player.wins}</span>
                  <span className="text-gray-400 text-sm">wins</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}