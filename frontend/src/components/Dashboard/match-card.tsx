"use client";


import { Gamepad2, Play, Settings, Bot, Loader2, X, ArrowLeft } from "lucide-react";
import React, { Dispatch, SetStateAction, useEffect, useState, useRef } from "react";
import { BACKEND_URL } from "@/helpers/info";
import { makeRequest } from "@/helpers/api";
import { motion } from "framer-motion";
import { useCountdown, useCurrentState, useMatchMaking, useUser, useVsPlayer } from "@/contexts/user-provider";
import { useGame } from "@/contexts/game-provider";
import ProfilePicture from "../ui/profile-picture";
import { MatchState, User } from "@/helpers/types";
import WebsocketService, { WsDataIn } from "@/services/ws";
import ProgressBar from "@ramonak/react-progress-bar";
import { useRouter } from "next/navigation";

type ActionType = "find" | "leave";
type UserState = "idle" | "in_queue" | "in_game";

const typeMap: Record<
  ActionType,
  {
    label: string;
    Icon: React.ReactElement;
    bgColor: string;
    onClick: (() => Promise<boolean>);
  }
> = {
  find: {
    label: "Find Match",
    Icon: <Play className="w-5 h-5" />,
    bgColor: "bg-[#3b82f6] hover:bg-[#3b83f6ce]",
    onClick: async () => {
      const response = await makeRequest("/game/match/find-match", { auth: true, method: "POST" });
      return response.success;
    }
  },
  leave: {
    label: "Cancel",
    Icon: <X className="w-5 h-5" />,
    bgColor: "bg-red-500 hover:bg-red-600",
    onClick: async () => {
      await makeRequest("/game/match/cancel-matchmaking", {auth: true, method: "DELETE"});
      return true;
    }
  }
};

function ActionButton({ type, toggleMatchState }: { type: ActionType, toggleMatchState: () => void }) {
  const { label, Icon, bgColor, onClick } = typeMap[type];

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 min-h-[40px] h-[45px] w-full hover:cursor-pointer ${bgColor}`}
      onClick={async () => {
        if (await onClick()) {
          toggleMatchState();
        }
        
      }
    }
    >
      {Icon}
      <span className="font-semibold">{label}</span>
    </div>
  );
}



function VsCard({ vsPlayer }: { vsPlayer: User }) {
  const {countdown} = useCountdown();
  const { user, loading, refetchUser } = useUser();
  const { currentState} = useCurrentState();
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleStateChange = (event: WsDataIn) => {
    refetchUser();
  }

  useEffect(() => {
    WebsocketService.subscribe("game_start", handleStateChange);
    WebsocketService.subscribe("game_pause", handleStateChange);
    WebsocketService.subscribe("game_continue", handleStateChange);
    

    return () => {
    WebsocketService.unsubscribe("game_start", handleStateChange);
    WebsocketService.unsubscribe("game_pause", handleStateChange);
    WebsocketService.unsubscribe("game_continue", handleStateChange);
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [currentState?.remainingPause]);

  if (loading || !currentState) return <h1>Loading...</h1>;
  return (
    <div className="flex flex-col items-center gap-3.5 w-[80%]">
      {(currentState!.matchState == "normal_pause_left" ||  currentState!.matchState! == "normal_pause_right" || currentState!.matchState! == "waiting_for_left" || currentState!.matchState == "waiting_for_right") ?
      <h2 className="text-lg font-bold text-gray-100 tracking-wide">Game is currently <span className="text-yellow-400">paused</span></h2> :
      <h2 className="text-lg font-bold text-gray-100 tracking-wide">
        You are currently <span className="text-green-400">in game</span>
      </h2>
      }


      <div className="flex items-center justify-between w-full">
        <div>
          <ProfilePicture
            img={`${BACKEND_URL}${user!.avatar_url}`}
            height="50px"
            width="50px"
          />
          <h1 className="text-center">You</h1>
        </div>
      <span className="animate-pulse text-3xl text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">
        VS
      </span>

        <div>
          <ProfilePicture
            img={`${BACKEND_URL}${vsPlayer.avatar_url}`}
            height="50px"
            width="50px"
          />
          <h1 className="text-center">{vsPlayer.username}</h1>
        </div>
      </div>
      {countdown !== null && countdown > 0 && (
        <div className="w-full text-center">
          <h1 className="text-yellow-400 font-semibold mb-1">
            Pause: {countdown}s
          </h1>
          <ProgressBar
            completed={(countdown / 10) * 100}
            maxCompleted={100}
            bgColor="#facc15"
            baseBgColor="#1f2937"
            height="10px"
            isLabelVisible={false}
            transitionDuration="0.25s"
          />
        </div>
    )}

    </div>
  );
}

export default function MatchCard({setFriends}: {setFriends: Dispatch<SetStateAction<Set<User>>>}) {
  const { matchId, closeGame } = useGame();
  const router = useRouter();

  const {refetchUser} = useUser();
  const {isMatchMaking, setIsMatchMaking} = useMatchMaking();
  const [userState, setUserState] = useState<UserState>(isMatchMaking ? "in_queue" : "idle");
  const {vsPlayer, setVsPlayer} = useVsPlayer();
  const {setIsGameOpen, isControl} = useGame();



  const endGame = () => {
    WebsocketService.send("end_game", {modGameInfo: {matchId}});
    closeGame();
    setUserState("idle");
    setFriends(prev => {
      const newSet = new Set(prev);
      for (let friend of newSet) {
        if (friend.id === vsPlayer!.id) {
          friend.game_state = "idle";
          break;
        }
      }
      return newSet;
    });    
    setVsPlayer(undefined);
    refetchUser();
  }

  const backToGame = () => {
    setIsGameOpen(true);
    router.push("/games");
  }

  const toggleMatchState = () => {
    switch (userState) {
      case "idle":
        setUserState("in_queue");
        break;
      case "in_queue":
        setUserState("idle");
        break;
    }
  }

  const handleMatchmakingStart = () => {
    setUserState(prev => {
      if (prev == "idle")
          return "in_queue";
      return prev;
    })
  }

  const handleMatchmakingEnd = () => {
    setUserState(prev => {
      if (prev == "in_queue")
          return "idle";
      return prev;
    })
  }

  useEffect(() => {
      WebsocketService.subscribe("matchmaking_start", handleMatchmakingStart);
      WebsocketService.subscribe("matchmaking_end", handleMatchmakingEnd);
      return () => {
        WebsocketService.unsubscribe("matchmaking_start", handleMatchmakingStart);
        WebsocketService.unsubscribe("matchmaking_end", handleMatchmakingEnd);
      } 
  }, []);

  const backDiv = isControl ? "bg-green-500 hover:bg-green-600" : "bg-yellow-500 hover:bg-yellow-600";
  return (
    <div className="dashboard-card  w-full h-full rounded-4xl bg-[#0D0D12]">
          <div className="flex flex-col items-center py-4 gap-2.5 md:flex-row w-full h-full">
            <div className="flex flex-col items-center justify-center w-[60%] h-full rounded-2xl">
              {
                vsPlayer ? 
                  <VsCard vsPlayer={vsPlayer}/>
                :
                (userState === "idle" ? 
                  <>
                    <Gamepad2 className="w-13 h-13" />
                    <span className="text-center text-slate-400 text-balance mt-2">Match activity will show here</span>
                  </>
                : (
                  <>
                    <motion.div
                      className="w-13 h-13"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    >
                      <Loader2 className="w-13 h-13" />
                    </motion.div>
                    <span className="text-center text-slate-400 text-balance mt-2">
                      Looking for a match...
                    </span>
                  </>
                )
                )
              }
            </div>
            {matchId != -1 ? 
            <div className="flex flex-col gap-2.5 w-[30%] h-20 max-w-[250px]">
              <div 
              className={`flex justify-center w-full h-full items-center gap-2 rounded-lg px-3 py-2 hover:cursor-pointer ${backDiv}`}
              onClick={backToGame}
              >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-semibold">{isControl ? "Back to game" : "Spectate game"}</span>
              </div>
              {isControl &&
                <div 
                className="flex justify-center w-full h-full items-center gap-2 rounded-lg px-3 py-2 hover:cursor-pointer bg-red-500 hover:bg-red-600"
                onClick={endGame}
                >
                    <X className="w-5 h-5" />
                    <span className="font-semibold">Quit Game</span>
                </div>
              }
            </div>
            :
            <div className="flex flex-col gap-1.5 justify-center w-[30%] max-w-[250px]">
              {userState === "idle" ? 
                <ActionButton type="find" toggleMatchState={toggleMatchState}/>
                  :
                <ActionButton type="leave" toggleMatchState={toggleMatchState}/>
              }
            </div>
          }
          </div>

    </div>
  );
}
