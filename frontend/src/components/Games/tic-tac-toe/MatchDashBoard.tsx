import { Circle, Crown, Loader2, RotateCcw, ThumbsDown, Undo, X } from "lucide-react";
import { MatchDashBoardProps, PlayerCardProps } from "./types";
import { leaveLobby } from "./TicTacToe";
import { buildStyles, CircularProgressbarWithChildren } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useEffect, useState } from "react";
import { BACKEND_URL } from "@/helpers/info";
import next from "next";

const PlayersNotReady = () => {
	return (
		<div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full">
		  <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />
		  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
			Waiting for Opponent
		  </span>
		</div>
	);
  }

const PlayerCard = (props: PlayerCardProps) => {
	const {player, isActive, isWinner} = props;
	const isX = player.role === 'X';
	const colorClass = isX ? 'text-cyan-500' : 'text-purple-400';
	const bgClass = isX ? 'bg-cyan-500/10' : 'bg-purple-500/10';
	const borderClass = isX ? 'border-cyan-500' : 'border-purple-500';

	return (
		<div className={` border relative flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-300 ${
			isActive
				? `${bgClass} ${borderClass}`
				: 'bg-slate-800/30 border-slate-700'
		} ${isWinner ? 'ring-2 ring-yellow-500 bg-yellow-300/20' : ''}`}>
			{isWinner && <Crown className="text-yellow-600 w-10 h-10 absolute right-0 -top-9 transform rotate-12"/>}
			{isActive && (
				<span className="absolute top-2 right-2 flex h-3 w-3">
					<span className={`animate-ping absolute h-full w-full rounded-full opacity-75 ${isX ? 'bg-cyan-400' : 'bg-purple-400'}`}></span>
					<span className={`relative rounded-full h-3 w-3 ${isX ? 'bg-cyan-500' : 'bg-purple-500'}`}></span>
				</span>
			)}

			<div className={`text-4xl font-black mb-2 ${colorClass}`}>
				{player.role === 'X' ? (<X className='w-9 h-9'/>) : (<Circle/>)}
			</div>
			<div className="text-slate-300 font-medium text-sm mb-1 truncate max-w-[90px] mx-auto">
				{player.username}
			</div>
		</div>
	);
};

interface RoleTimerProps {
	duration: number;
	avatar_url: string;
	nextPlayer: "X" | "O" | null;
}

const RoleTimer = (props: RoleTimerProps) => {
	const { duration, avatar_url, nextPlayer } = props;
	const [secondsLeft, setSecondsLeft] = useState(duration);

	useEffect(() => {
		if (nextPlayer === null)
			return ;
		setSecondsLeft(duration);
		const interval = setInterval(() => {
			setSecondsLeft((prev) => {
				if (prev <= 1) {
					clearInterval(interval);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(interval);
	}, [duration, nextPlayer]);

	const percentage = (secondsLeft / duration) * 100;

	return (
		<div className="w-24 h-24 mb-5 mx-auto">
			<CircularProgressbarWithChildren
				value={percentage}
				styles={buildStyles({
					pathColor: `${nextPlayer === "O" ? '#9306d4' : '#06b6d4' }`,
					trailColor: '#334155',
				})}
			>
				<div className="w-[84%] h-[84%] rounded-full overflow-hidden border-2 border-slate-700">
					<img
						className="w-full h-full object-cover"
						src={avatar_url}
						alt="Player"
					/>
				</div>
			</CircularProgressbarWithChildren>
		</div>
	);
};

export const MatchDashBoard = (props: MatchDashBoardProps) => {
	const {players, winner, setPlayers, nextPlayer, setNextPlayer, resetGame, setGameMode, setRemoteMode } = props;

	if (players['X'] === null || players['O'] === null) return <PlayersNotReady/>


	return (
		<div className="flex flex-col items-center justify-center gap-4">
			<div className="w-30 h-30 mb-5 ">
				{
					nextPlayer && <RoleTimer duration={14.5} avatar_url={`${BACKEND_URL}${players[nextPlayer!]!.avatar_url}`} nextPlayer={nextPlayer}/>
				}
			</div>
		  <div className="bg-slate-800 h-fit mb-7 border border-slate-800 rounded-2xl p-6">
			<h2 className="text-xl font-bold text-white mb-10 flex items-center gap-2">
			  <span className="w-1 h-6 bg-yellow-500 rounded-full"></span>
			  Match Status
			</h2>

			<div className="flex gap-4 mb-8">
			  <PlayerCard
				player={players['X']}
				isActive={!winner && nextPlayer === "X"}
				isWinner={winner === 'X'}
			  />
			  <div className="flex flex-col items-center justify-center text-slate-600 font-bold">VS</div>
			  <PlayerCard
				player={players['O']}
				isActive={!winner && nextPlayer === "O"}
				isWinner={winner === 'O'}
			  />
			</div>

			<div className="space-y-3">
			  {winner ? (
				<div className={`p-4 rounded-xl text-center border${
				  winner === 'Draw'
					? 'bg-slate-800 border-slate-700 text-slate-300'
					: winner === 'X'
					  ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-400'
					  : 'bg-purple-900/20 border-purple-500/30 text-purple-400'
				}`}>
				  <p className="text-sm font-medium mb-1">GAME OVER</p>
				  <p className="text-xl font-black truncate max-w-[250px] mx-auto">
					{winner === 'Draw' ? 'It\'s a Draw!' : `Winner: ${players[winner]!.username}`}
				  </p>
				</div>
			  ) : (
				<div className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-center">
				  <p className="text-slate-400 text-sm">Current Turn</p>
				  <p className={`text-xl font-bold truncate max-w-[150px] m-auto mt-1 ${nextPlayer === 'X' ? 'text-cyan-400' : 'text-purple-400'}`}>
					{next !== null ? players[nextPlayer!]!.username : "Next Player"}
				  </p>
				</div>
			  )}
			{
				winner ? (
					<button
						onClick={async () => {resetGame(); setRemoteMode(null); setGameMode(null); setPlayers({"X": null, "O": null})}}
						className="w-full py-3 px-4 bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 mt-4"
					>
						<Undo size={18} />
						Go to menu
					</button>
				) : (
					<button
						onClick={async () => {await leaveLobby(); resetGame(); setRemoteMode(null); setGameMode(null); setPlayers({"X": null, "O": null}); setNextPlayer(null);}}
						className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 mt-4"
					>
						<ThumbsDown size={18} />
						Give up
					</button>
				)
			}
			</div>
		  </div>
		</div>
	);
}
