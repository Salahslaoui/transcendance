"use client";

import { MatchState, PlayerGameState, User } from "@/helpers/types"
import {createContext, Dispatch, ReactNode, SetStateAction, useContext, useState, useEffect} from "react"
import { makeRequest } from "@/helpers/api";
import { useGame } from "./game-provider";
import WebsocketService from "@/services/ws";

export type CurrentState = {
  matchState: MatchState | null;
  myScore: number;
  vsPlayerScore: number;
  remainingPause?: number;
}


export type UserContextType = {
    user?: User;
    setUser: Dispatch<SetStateAction<User | undefined>>;
    isAuth: boolean;
    setIsAuth: Dispatch<SetStateAction<boolean>>;
    vsPlayer?: User;
    setVsPlayer: Dispatch<SetStateAction<User | undefined>>;
    socketId?: number;
    setSocketId: Dispatch<SetStateAction<number | undefined>>;
    currentState: CurrentState | null;
    setCurrentState: Dispatch<SetStateAction<CurrentState| null>>;
    refetchUser: () => Promise<void>; 
    loading: boolean;
    countdown: number;
    setCountdown: Dispatch<SetStateAction<number>>;
    isMatchMaking: boolean;
    setisMatchMaking: Dispatch<SetStateAction<boolean>>;
    fullReset: () => void;
    gameReset: () => void;
}    




const UserContext = createContext<UserContextType | undefined>(undefined);


export default function UserProvider ({ children }: { children: ReactNode })  {
  const [user, setUser] = useState<User | undefined>();
  const [isAuth, setIsAuth] = useState(false);
  const [currentState, setCurrentState] = useState<CurrentState | null>(null);
  const [vsPlayer, setVsPlayer] = useState<User | undefined>();
  const [socketId, setSocketId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [isMatchMaking, setisMatchMaking] = useState(false);
  const {setMatchId, setIsGameOpen, setIsControl, setMyDirection} = useGame();

  const fullReset = () => {
    setMatchId(-1);
    setIsGameOpen(false);
    setIsControl(false);
    setMyDirection("left");
    setUser(undefined);
    setIsAuth(false);
    setVsPlayer(undefined);
    setSocketId(undefined);
    WebsocketService.reset();
  }

  const gameReset = () => {
    setMatchId(-1);
    setIsGameOpen(false);
    setIsControl(false);
    setMyDirection("left");
    setCurrentState(null);
    setVsPlayer(undefined);
  }

  const fetchMe = async () => {
    const response = await makeRequest("/user/info/me", { method: "GET", auth: true, dontNarrowError: true });
    if (response.success) {
      setLoading(false);
      setUser(response.details!.user);
      setIsAuth(true);
      if (response.details!.state) {
        const state = response.details!.state;
        setMatchId(state.matchId);        
        setVsPlayer(state.vsPlayer);
        let curr: CurrentState = {matchState: state.matchState, myScore: state.myScore, vsPlayerScore: state.vsPlayerScore};
        if (state.additionalInfo?.remainingPause) {
          setCountdown(Math.trunc(state.additionalInfo.remainingPause / 1000));
          curr = {...curr, remainingPause: state.additionalInfo.remainingPause};
        }
        setCurrentState(curr);
        setMyDirection(state.myDirection);
      }
      if (response.details!.isMatchMaking) {
        setisMatchMaking(true);
      }
    } else {
      setLoading(false);
      setUser(undefined);
      setIsAuth(false);
      return;
    }

  };


  useEffect(() => {
    fetchMe();
    
    // Listen for storage changes (logout from other tabs/windows)
    const handleStorageChange = () => {
      if (!localStorage.getItem('token')) {
        setUser(undefined);
        setIsAuth(false);
      } else {
        // Token exists, refetch user data
        fetchMe();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);


  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        isAuth,
        setIsAuth,
        vsPlayer,
        setVsPlayer,
        socketId,
        setSocketId,
        currentState,
        setCurrentState,
        refetchUser: fetchMe,
        loading,
        countdown,
        setCountdown,
        isMatchMaking,
        setisMatchMaking,
        fullReset,
        gameReset
      }}
    >
      {children}
    </UserContext.Provider>
  );
};


export function useUser() {
    const context = useContext(UserContext);
    if (!context)
        throw new Error("getContext must be used within UserContext");

    return {
        user: context.user,
        setUser: context.setUser,
        refetchUser: context.refetchUser,
        socketId: context.socketId,
        setSocketId: context.setSocketId,
        loading: context.loading,

    }
}


export function useCurrentState() {
    const context = useContext(UserContext);
    if (!context)
        throw new Error("getContext must be used within UserContext");
    return {
      currentState: context.currentState,
      setCurrentState: context.setCurrentState
    }
}

export function useVsPlayer() {
    const context = useContext(UserContext);
    if (!context)
        throw new Error("getContext must be used within UserContext");

    return {
        vsPlayer: context.vsPlayer,
        setVsPlayer: context.setVsPlayer,
    }
}


export function useIsAuth() {
    const context = useContext(UserContext);
    if (!context)
        throw new Error("getContext must be used within UserContext");
    return {
      isAuth: context.isAuth,
      setIsAuth: context.setIsAuth
    }
}

export function useFullReset() {
    const context = useContext(UserContext);
    if (!context)
        throw new Error("getContext must be used within UserContext");
    return context.fullReset;
}

export function useGameReset() {
    const context = useContext(UserContext);
    if (!context)
        throw new Error("getContext must be used within UserContext");
    return context.gameReset;
}


export function useCountdown() {
    const context = useContext(UserContext);
    if (!context)
        throw new Error("getContext must be used within UserContext");
    return {countdown: context.countdown, setCountdown: context.setCountdown}; 
}

export function useMatchMaking() {
    const context = useContext(UserContext);
    if (!context)
      throw new Error("getContext must be used within UserContext");
    return {isMatchMaking: context.isMatchMaking, setIsMatchMaking: context.setisMatchMaking} 
}