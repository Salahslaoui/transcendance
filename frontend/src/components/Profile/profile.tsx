"use client";
import React, { useEffect, useState } from 'react'
import ProfileHeader from "./ProfileHeader";
import GameState from "./GameState";
import { GiTicTacToe, GiPingPongBat } from "react-icons/gi";
import Api from '@/helpers/axios';
import { useUser } from '@/contexts/user-provider';

interface Match {
  	id: number;
  	player1_id: number;
  	player2_id: number;
  	game_type: "ping_pong" | "tic_tac_toe";
  	result: "win" | "lose" | "draw";
	score_player1: number | null;
	score_player2: number | null;
	winner_score: number | null;
	loser_score: number | null;
  	winner_id: number | null;
  	played_at: string;
  	opponent_name: string;
  	player_name: string;
}

interface ProfileProps {
  userId?: number;
}

export default function Profile({ userId }: ProfileProps) {
    const { user } = useUser();
    const [matches, setMatches] = useState<Match[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMatches = async() => {
          setIsLoading(true);
          try {
            const targetUserId = userId ?? user?.id;
            if (targetUserId == null) {
              setIsLoading(false);
              return;
            }
            const response = await Api.get(`/game/match-history/user/${targetUserId}/matches`);
            if (response.data && response.data.details) {
              setMatches(response.data.details);
            } 
          } catch (err) {
            console.error("Error fetching match history:", err);
          } finally {
            setIsLoading(false);
          }
        }
        fetchMatches();
    }, [userId, user?.id]);
        const pingPongMatches = matches.filter((m) => m.game_type === "ping_pong");
        const ticTacToeMatches = matches.filter((m) => m.game_type === "tic_tac_toe");

        const getResultColor = (result: string) => {
          if (result === "win")
              return "text-green-400";
          if (result === "lose")
              return "text-red-400";
          return "text-blue-300";
        };
      return (
        <div className="flex flex-col w-full h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <ProfileHeader userId={userId} />
              <GameState userId={userId} />
              <div className="w-full mt-10 flex-1 flex flex-col gap-2.5 min-h-0">
            	<h2 className="text-xl font-bold text-blue-500 tracking-wide drop-shadow">
            	  Recent Matches
            	</h2>
            <div className="flex flex-wrap lg:flex-nowrap gap-2.5 w-full flex-1 min-h-0">
              <div className="flex-1 min-w-[250px] max-w-full flex flex-col">
                <div className="flex flex-col w-full h-full rounded-xl bg-[#0D0D12] border border-gray-800/30 ">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/30">
                    <GiPingPongBat className="text-red-500 text-xl" />
                    <h2 className="text-xl font-bold text-white">Ping Pong</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-none">
    			{pingPongMatches.length > 0 ? (
                  <div className="flex flex-col">
				  {pingPongMatches.map((match, index) => {
					const [first, second] = match.result === "lose" ? [match.opponent_name, match.player_name] : [match.player_name, match.opponent_name];
					const viewer = `${first} vs ${second}`;
					let scoreShown: string;
					match.result === "draw" ? scoreShown = `${match.score_player1 ?? 0}-${match.score_player2 ?? 0}` : scoreShown = `${match.winner_score}-${match.loser_score}`;
				    return (
				      <div
				        key={match.id}
				        className={`flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-800/30 transition-colors ${
                          index < pingPongMatches.length - 1 ? 'border-b border-gray-800/20' : ''
                        }`}
				      >
				        <div className="flex items-center gap-2 text-base font-medium text-white flex-1">
				            	<span>{viewer}</span>
				        </div>
				        <span className="text-sm text-gray-400 min-w-[100px]">
				          {new Date(match.played_at).toLocaleDateString()}
				        </span>
				        <span className="text-base font-semibold text-white min-w-[60px] text-center">{scoreShown}</span>
				        <span className={`text-base font-bold min-w-[60px] text-center ${getResultColor(match.result)}`}>
				          {match.result}
				        </span>
				      </div>
				    );
				  })}
                  </div>
				) : (
                  <div className="flex items-center justify-center h-full">
				    <span className="text-gray-400 text-base italic">No matches played yet</span>
                  </div>
				)}
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-[250px] max-w-full flex flex-col">
                <div className="flex flex-col w-full h-full rounded-xl bg-[#0D0D12] border border-gray-800/30 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/30">
                    <GiTicTacToe className="text-purple-500 text-xl" />
                    <h2 className="text-xl font-bold text-white">Tic Tac Toe</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-none">
                  {ticTacToeMatches.length > 0 ? (
                    <div className="flex flex-col">
                    {ticTacToeMatches.map((match, index) => {
					const [first, second] = match.result === "lose" ? [match.opponent_name, match.player_name] : [match.player_name, match.opponent_name];
					const viewer = `${first} vs ${second}`;
					return (
                    <div
                      key={match.id}
                      className={`flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-800/30 transition-colors ${
                        index < ticTacToeMatches.length - 1 ? 'border-b border-gray-800/20' : ''
                      }`}
                    >
                    <div className="flex items-center gap-2 text-base font-medium text-white flex-1">
                      <span>{viewer}</span>
                    </div>
                    <span className="text-sm text-gray-400 min-w-[100px]">
                      {new Date(match.played_at).toLocaleDateString()}
                    </span>
                    <span
                      className={`text-base font-bold min-w-[60px] text-center ${getResultColor(match.result)}`}
                    >
                      {match.result}
                    </span>
                    </div>
					)
					})}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-gray-400 text-base italic">No matches played yet</span>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      );
}

