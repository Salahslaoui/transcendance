import State from "./State";
import { useEffect, useState } from "react";
import { LocalStorageManager } from '@/helpers/info';
import axios from 'axios';
import { BACKEND_URL} from '@/helpers/info';
import Api from "@/helpers/axios";
import { useUser } from "@/contexts/user-provider";

interface Stat {
    game_type: string;
    wins: number;
    losses: number;
    draws: number;
}

interface GameStateProps {
    userId?: number;
}

export default function GameState({ userId }: GameStateProps = {}) {
    const { user } = useUser();
    const [stats, setStats] = useState<Stat[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const targetUserId = userId ?? user?.id;
                if (!targetUserId) return;
                const endpoint = `/game/match-history/user/${targetUserId}/stats`;
				const response = await Api.get(endpoint);
                if (response.data && response.data.details)
                    setStats(response.data.details);
            } catch (err) {
                console.error("Error fetching match stats:", err);
            }
        };
        fetchStats();
    }, [userId, user?.id]);
    const pingPongStats = stats.find((s) => s.game_type === "ping_pong");
    const ticTacToeStats = stats.find((s) => s.game_type === "tic_tac_toe");
    const ping_pong_wins = pingPongStats?.wins || 0;
    const tic_tac_toe_wins = ticTacToeStats?.wins || 0;
    const ping_pong_losses = pingPongStats?.losses || 0;
    const tic_tac_toe_losses = ticTacToeStats?.losses || 0;
    const ping_pong_draws = pingPongStats?.draws || 0;
    const tic_tac_toe_draws = ticTacToeStats?.draws || 0;
    const ping_pong_played = ping_pong_wins + ping_pong_losses + ping_pong_draws;
    const tic_tac_toe_played = tic_tac_toe_wins + tic_tac_toe_losses + tic_tac_toe_draws;
    return (
        <>
            <div className="flex gap-5 mt-7 w-full justify-center flex-wrap">
                <State matchData="Matches Played" pingpong={ping_pong_played} tictactoe={tic_tac_toe_played} />
                <State matchData="Match Wins" pingpong={ping_pong_wins} tictactoe={tic_tac_toe_wins} />
                <State matchData="Match Loses" pingpong={ping_pong_losses} tictactoe={tic_tac_toe_losses} />
                <State matchData="Match Draws" pingpong={ping_pong_draws} tictactoe={tic_tac_toe_draws} />
            </div>
        </>
    )
}
