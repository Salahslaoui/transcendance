"use client"
import { useState, useEffect, ReactHTMLElement } from "react";
import Round from "./Round"
import { Competitor } from "./Round"
import "./Tournament.css";
import { useUser } from "@/contexts/user-provider";
import { BACKEND_URL } from "@/helpers/info";
import { makeRequest } from "@/helpers/api";
import { User } from "@/helpers/types";
import WebsocketService, { WsDataIn, WsTournamentSession } from "@/services/ws";
import Modal from "../ui/modal";
import ChoosePlayer from "../ui/player-modal";
import LocalPingPong from "../Games/local-pong";
import Tournament from "./tournament";


type Bstruct = {
        Player1: string;
        Player2: string;
        ScoreP1: number;
        ScoreP2: number;
}

function TestGame({team1, team2, onWinner} : {team1: Competitor | null, team2: Competitor | null, onWinner: (winner: Competitor) => void})
{
    if (!team1 || !team2) return null;

    return <LocalPingPong players={{left: team1, right: team2}} onWinner={onWinner} />
}

function TournamentTitle() {
    return (
    <div className="p-6">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-2">
          Tournament
        </h1>
        <p className="text-lg md:text-xl font-medium text-purple-300">
          Play with Friends
        </p>
      </div>
    </div>
    );
}



export default function Tournamentfront() {
    const [open, setOpen] = useState(false);
    const {user: me, socketId} = useUser();
    const result: Bstruct = {Player1: "player1", Player2: "player2", ScoreP1: 6, ScoreP2: 2};
    const [start, setStart] = useState(false);
    const [showCountDown, setShowCountDown] = useState(false);
    const [countDown, setCountDown] = useState(3);
    const [team1, setTeam1] = useState<Competitor | null>(null);
    const [team2, setTeam2] = useState<Competitor | null>(null);
    const [onMatchWinner, setOnMatchWinner] = useState<((w: Competitor) => void) | null>(null);
    const [count, setCount] = useState(0);
    const [matchBegin, setMatchBegin] = useState(false);
    const [players, setPlayers] = useState<Competitor[]>([]);
    const [quartFinal, setQuartFinal] = useState<Competitor[]> ([]);
    const [semiFinal, setSemiFinal] = useState<Competitor[]> ([]);
    const [winner, setWinner] = useState<Competitor | null>(null);
    const [info, setInfo] = useState<User | null>(null);

    if (!me)
        return <h1>Loading</h1>;
    const isFull = players.length >= 8;

    function handleAccept(event: WsDataIn) {
        const data = event.details.wsInvitationAccept!;
        setInfo(data);
    }

    function handleTn(event: WsDataIn) {
        const data = event.details.wsTn_data;
    }

    useEffect(() => {
            WebsocketService.subscribe("TournInviteAccept", handleAccept);
            WebsocketService.subscribe("Tn_start", handleTn);
            return () =>
                {WebsocketService.unsubscribe("TournInviteAccept", handleAccept);
                WebsocketService.unsubscribe("Tn_start", handleTn);
                }
            ; }, [info]);

    useEffect(() => {
        if (!info) return;

        for (let i = 0; i < players.length; ++i)
            if (info.username === players[i].name)
                return ;
        setPlayers(prev => [
            ...prev,
            {
                name: info.username,
                avatar: `${BACKEND_URL}${info.avatar_url}`,
                Me: false,
                id: info.id,
            }
        ]);

        setInfo(null);

    }, [info]);

    useEffect(() => {
        setPlayers([
            {
                name: me.username,
                avatar: `${BACKEND_URL}${me.avatar_url}`,
                Me: true,
            }
        ]);
    }, []);

    function askWinner(team1: Competitor, team2: Competitor): Promise<Competitor> {
        return new Promise((resolve) => {
            setTeam1(team1);
            setTeam2(team2);

            let value = 3;
            setCountDown(value);
            setShowCountDown(true);
            let timer = setInterval(() => {
                value -= 1;
                setCountDown(value);
                if (value === 0)
                {
                    clearInterval(timer);
                    setShowCountDown(false);
                    setMatchBegin(true);
                }
            }, 1000);

            const callback = (winner: Competitor) => {
                resolve(winner);
                setMatchBegin(false);
            };

            setOnMatchWinner(() => callback);
        });
    }

    async function TournamentScores() {

        if (!open){
            setOpen(true);
        }
    }

    async function TournLogic({Competitors} : {Competitors: Competitor[]})
    {
        const tmp: Competitor[] = [];
        for (let i = 0; i < Competitors.length; i+= 2)
        {
            const t1 = Competitors[i];
            const t2 = Competitors[i + 1];
            const winner = await askWinner(t1, t2)
            tmp.push(winner);
            if (Competitors.length === 8)
                setQuartFinal(tmp);
            else if (Competitors.length === 4)
                setSemiFinal(tmp);
            else if (Competitors.length === 2)
                setWinner(tmp[0]);
            if (tmp.length != 1)
                TournLogic({Competitors: tmp});
        }
        setCount(count + 1);
    }

    const rounds : { id: string, competitors: Competitor[] }[] = [
        {id: "round-1", competitors: [...players,
                                      ...Array(8 - players.length).fill(0).map(() => ({
                                        name: "Waiting...",
                                        Me: false,
                                      }))]},
        {id: "round-2", competitors: [...quartFinal,
                                      ...Array(4 - quartFinal.length).fill(0).map(() => ({
                                        name: "Waiting...",
                                        Me: false,
                                      }))],},
        {id: "round-3", competitors: [...semiFinal,
                                      ...Array(2 - semiFinal.length).fill(0).map(() => ({
                                        name: "Waiting...",
                                        Me: false,
                                      }))],},
        {id: "round-4",competitors: [winner ? winner : { name: "Winner"}],},
    ]


    if (matchBegin) return <TestGame team1={team1} team2={team2} onWinner={(winner) => {
                setMatchBegin(false);
                 onMatchWinner?.(winner)}}/>;

    return (
        <>
            {TournamentTitle()}
            <div className="p-8">
                {open && (<Tournament onClose={() => setOpen(false)}/>)}
                <button onClick={async () => {
                if (!isFull)
                    await makeRequest("/game/tournament/CreateT", {method: "POST", auth: true});
                else if (isFull && !winner)
                {
                    await makeRequest("game/tournament/broadcast", {method: "POST", auth: true, data: { players } });
                    TournLogic({Competitors: rounds[count].competitors});
                }
                setStart(true)}}
                className={`px-6 py-4 rounded-xl text-white font-semibold transition-all duration-300 ${"bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"}`}>{isFull ? "Start Tournament" : "Invite Tournament Competitor"}</button>
                <button onClick={TournamentScores}
                className={`px-6 py-4 ml-10 rounded-xl text-white font-semibold transition-all duration-300 ${start ? "bg-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"}`}>Get Tournament Scores</button>
            </div>
            {start && !isFull && <Modal onClose={() => {setStart(false)}}><ChoosePlayer mode="tournament" /></Modal>}
            <div>
                <div className="flex mr-3 mt-16">
                    {rounds.map((r, i) => (
                        <Round key={r.id} id={r.id} roundIndex={i} competitors={r.competitors} roundClass={i === rounds.length - 1 ? "round-winner" : ""}/>
                    ))}
                </div>
            </div>
            {winner &&
            <div className="text-center mt-8 text-2xl font-bold text-green-600">
                🎉 Congratulations {winner.name}! You are the Tournament Champion! 🏆
            </div>}
                {showCountDown && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
                        <div className="bg-black p-6 rounded-xl shadow-xl text-center w-[300px]">
                            <h2 className="text-xl font-bold mb-4">The Match begin</h2>
                            <p className="font-semibold text-lg">{team1?.name} <span>VS</span> {team2?.name}</p>
                            <div className="text-5xl mt-6 font-bold">
                                {countDown}
                            </div>
                        </div>
                    </div>
                )}
        </>
    );
}
