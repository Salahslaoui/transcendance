"use client";

import { useState, useEffect, useRef } from "react";
import { useIsAuth, useUser, useFullReset, useVsPlayer, useGameReset } from "@/contexts/user-provider";
import AuthPage from "@/components/AuthPage/auth-page";
import WebsocketService, { WsInvitationReject } from "@/services/ws";
import { BACKEND_URL, LocalStorageManager } from "@/helpers/info";
import { WsDataIn } from "@/services/ws";
import { useCurrentState } from "@/contexts/user-provider";
import { useHideAllNotifications, useShowNotification } from "@/contexts/notification-provider";
import { toast } from 'react-toastify';
import {NewMessageToastProps} from "@/components/Chat/chat-types";
import Modal from "@/components/ui/modal";
import CooldownBar from "@/components/ui/cooldown-bar";
import { useGame } from "@/contexts/game-provider";
import { makeRequest } from "@/helpers/api";
import { ReadonlyURLSearchParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCountdown } from "@/contexts/user-provider";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar/sidebar";

function NewMessageToast(props: NewMessageToastProps) {
	const { messageText, senderProfilUrl, senderName } = props;
	const truncatedText = messageText.length > 20
		? `${messageText.substring(0, 20)}...`
		: messageText;
	return (
		<div className="absolute w-full h-full new-message-toast-content flex items-center gap-3">
			<img
				src={`${BACKEND_URL}${senderProfilUrl}`}
				alt={`${senderName}'s profile`}
				className="w-10 h-10 rounded-full object-cover"
			/>

			<div>
				<div>{senderName}</div>
				<div className="text-slate-400">{truncatedText}</div>
			</div>
		</div>
	);
}

function VictoryPage({ message, onClick }: { message?: string; onClick: () => void }) {
	return (
		<div className="w-full h-full flex items-center justify-center bg-[#0D0D12] text-slate-100">
			<div className="text-center">
				<h1 className="text-5xl font-bold mb-4">Congratulations! You have won the game</h1>
				<p className="text-2xl mb-8">{message ? message : "You won the game!"}</p>
				<button
					onClick={onClick}
					className="px-6 py-3 bg-slate-700 text-slate-100 font-bold rounded hover:bg-slate-600 transition"
				>
					Play Again
				</button>
			</div>
		</div>
	);
}

export default function AppClientWrapper({ children }: { children: React.ReactNode }) {
	const { loading, setSocketId, refetchUser, socketId } = useUser();
	const { isAuth } = useIsAuth();
	const fullReset = useFullReset();
	const {countdown, setCountdown} = useCountdown();
	const hideAllNotifications = useHideAllNotifications();
	const [showAskModal, setShowAskModal] = useState(false);
	const [tInvitation, setTInvitation] = useState<{
			inviteId: number | undefined;
			fromUsername: string | undefined;
			fromId: number | undefined;} | null>(null);
	const [reject, setReject] = useState<WsInvitationReject | null>(null);
	const { matchId, setMatchId, isGameOpen, setIsGameOpen, openGame, closeGame, setMyDirection, setIsControl } = useGame();
	const {setVsPlayer} = useVsPlayer();
	const gameReset = useGameReset();

	const [winMessage, setWinMessage] = useState<string | undefined>(undefined);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const showNotification = useShowNotification();
	const router = useRouter();
	const pathname = usePathname();

	const endGame = () => {
		WebsocketService.send("end_game", {modGameInfo: {matchId}});
		setShowAskModal(false);
		if (timeoutRef.current) clearInterval(timeoutRef.current);
		timeoutRef.current = null;
		gameReset();
		setCountdown(0);
	}

	const controlGame = () => {
		WebsocketService.send("control_game", {modGameInfo: {matchId}});
		setIsControl(true);
		setShowAskModal(false);
		setIsGameOpen(true);
	}



 const handleGameAskControl = (event: WsDataIn) => {
		const data = event.details.gamePauseInfo;
		if (!data)
			throw new Error("Invalid data");
		const endAt = data.startTime + data.duration;
		timeoutRef.current = setInterval(() => {
			const remaining = endAt - Date.now();
			setCountdown(Math.max(0, Math.trunc(remaining / 1000))); // dividing by 1000 to setCountdown in seconds
			if (remaining <= 0) {
					setShowAskModal(false);
					setIsControl(false);
					setIsGameOpen(false);
					clearInterval(timeoutRef.current!);
			}
		}, 250);
		setShowAskModal(true);
	}

	const handleGamePause = (event: WsDataIn) => {

		const data = event.details.gamePauseInfo;
		if (!data)
			throw new Error("Invalid data");
		const endAt = data.startTime + data.duration;
		timeoutRef.current = setInterval(() => {
			const remaining = endAt - Date.now();
			setCountdown(Math.max(0, Math.trunc(remaining / 1000))); // dividing by 1000 to setCountdown in seconds
			if (remaining <= 0) {
				clearInterval(timeoutRef.current!);
				timeoutRef.current = null;
			}
		}, 250);
		refetchUser();
	}

	const handleGameContinue = (event: WsDataIn) => {
		if (timeoutRef.current) clearInterval(timeoutRef.current);
		timeoutRef.current = null;
		setShowAskModal(false);
		setCountdown(0);
		if (timeoutRef.current) clearInterval(timeoutRef.current);
		timeoutRef.current = null;
		refetchUser();

	}

	const handleGameStart = (event: WsDataIn) => {
		const data = event.details.gameStartInfo;
		if (!data)
			throw new Error("GameStart info not found");
		setCountdown(0);
		if (timeoutRef.current) clearInterval(timeoutRef.current);
		timeoutRef.current = null;
		refetchUser();
		hideAllNotifications();
		setIsControl(data.isControl);
		setMatchId(data.matchId);
		setMyDirection(data.myDirection);
		setVsPlayer(data.against);
		openGame(data.matchId);
		router.push("/games");
	}

	const handleGameEnd = (event: WsDataIn) => {
		const data = event.details.gameEndInfo;
		if (!data)
			throw new Error("Invalid data");
		setIsControl(false);
		closeGame();
		setVsPlayer(undefined);
		if (timeoutRef.current) clearInterval(timeoutRef.current);
		timeoutRef.current = null;
		refetchUser();
		gameReset();
		setShowAskModal(false);
		if (data.details.winner)
			setWinMessage(data.details.message);

	}

	useEffect(() => {

		if (!reject) return;

		showNotification({message: `${reject?.rejectedByUsername} has rejected you`, type: "error"});
	}, [reject]);

	useEffect(() => {
		if (!socketId) return;
		const handleInviteDelivery = (event: WsDataIn) => {
			const data = event.details.wsInvitation;
			if (!data)
				throw new Error("Invalid data");

			showNotification({
				message: `${data.sentByUsername} has invited you to a game`,
				type: "info",
				buttons: [{
					bg: "bg-[#15e461]",
					content: "Accept",
					onClick: () => {
						const acceptInvite = async () => {
							await makeRequest(`/game/invite/accept/${data.invitationId}`, {auth: true, method: "POST", data: {socketId}});
						}
						acceptInvite();

					},
					closeAfterClick: true
				},
				{
					bg: "bg-red-500",
					content: "Reject",
					onClick: () => {
						const rejectInvite = async () => {
							await makeRequest(`/game/invite/reject/${data.invitationId}`, {auth: true, method: "POST", data: {socketId}});
						}
						rejectInvite()
					},
					closeAfterClick: true
				}
					],
			});
		}
		WebsocketService.subscribe("invitation_delivery", handleInviteDelivery);
		return (() => {
			WebsocketService.unsubscribe("invitation_delivery", handleInviteDelivery);
		})
	}, [socketId, showNotification]);

	useEffect(() => {
		if (!isAuth)
			return;
		const token = LocalStorageManager.getToken();
		if (token) {
			WebsocketService.setToken(token);
			WebsocketService.connect();
		}

		const handleSocketRegister = (event: WsDataIn) => {
			const socketId = event.details.socketId;
			if (!socketId) throw new Error("socketId info not found");
			setSocketId(socketId);
		};

		const handleTournInvite = (event: WsDataIn) => {

			const invite = event.details.wsTInvitation;

			setTInvitation({inviteId: invite?.InviteId, fromUsername: invite?.sentByUsername, fromId: invite?.sentById});
		};

		const handleTournReject = (event: WsDataIn) => {
			const invite = event.details.wsInvitationReject;

			if (!invite) return;
			setReject(invite);
		}


		WebsocketService.subscribe("TournInviteSent", handleTournInvite);
		WebsocketService.subscribe("TournInviteReject", handleTournReject);
		WebsocketService.subscribe("socket_register", handleSocketRegister);
		WebsocketService.subscribe("game_continue", handleGameContinue);
		WebsocketService.subscribe("game_ask_control", handleGameAskControl);
		WebsocketService.subscribe("game_start", handleGameStart);
		WebsocketService.subscribe("game_end", handleGameEnd);
		WebsocketService.subscribe("game_pause", handleGamePause);
		return () => {
			WebsocketService.unsubscribe("socket_register", handleSocketRegister)
			WebsocketService.unsubscribe("TournInviteSent", handleTournInvite);
			WebsocketService.unsubscribe("TournInviteReject", handleTournReject);
			WebsocketService.unsubscribe("game_continue", handleGameContinue);
			WebsocketService.unsubscribe("game_ask_control", handleGameAskControl);
			WebsocketService.unsubscribe("game_start", handleGameStart);
			WebsocketService.unsubscribe("game_end", handleGameEnd);
		};
	}, [isAuth]);


	useEffect(() => {
		if (!winMessage) return;
		setTimeout(() => {
			setWinMessage(undefined);
		}, 3000);
	}, [winMessage]);

	useEffect(() => {
		if (!loading && !isAuth && pathname !== "/auth") {
			router.replace("/auth");
		}
	}, [loading, isAuth, pathname]);

	if (loading) return (
		<motion.div
			className="w-13 h-13"
			animate={{ rotate: 360 }}
			transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
		>
			<Loader2 className="w-13 h-13" />
		</motion.div>
	);

	if (!isAuth) return <>{children}</>; // Will not display protected content for /auth

	if (winMessage) return <VictoryPage message={winMessage} onClick={() => setWinMessage(undefined)} />;

	return <>
		<div className="fixed flex gap-4.5 w-full h-full z-25">
			<Sidebar />
			<div className="mt-2.5 w-full h-full">
				{tInvitation && <Modal onClose={() => setTInvitation(null)}>
		<div className="flex flex-col items-center gap-4 p-4">
			<h1 className="text-xl font-bold">
				{tInvitation.fromUsername} invited you to a Tournament
			</h1>

			<div className="flex gap-6 mt-4">
				<button
					className="px-4 py-2 bg-green-600 text-white rounded-xl"
					onClick={async () => {const response = await makeRequest("/game/tournament/action", {method: "POST", auth: true, data: { resp: "accept", inviteId: tInvitation.inviteId }});
					setTInvitation(null);}}
				>
					Accept
				</button>

				<button
					className="px-4 py-2 bg-red-600 text-white rounded-xl"
					onClick={async () => {const response = await makeRequest("/game/tournament/action", {method: "POST", auth: true, data: { resp: "reject", inviteId: tInvitation.inviteId }});
						 setTInvitation(null);}}
				>
					Reject
				</button>
			</div>
		</div>
	</Modal>}
		{showAskModal &&
			<Modal onClose={endGame}>
				<h1 className="text-2xl font-bold">Continue here?</h1>
				<span className="text-lg">We detected a disconnection from your active page, would you like to continue here?</span>
				<CooldownBar countdown={countdown} />
				<button
				className="mt-2 p-2 rounded-full border border-white bg-[#43435d] hover:bg-[#666691] hover:cursor-pointer w-fit"
				onClick={controlGame}
				>
					Continue Game
				</button>
			</Modal>
		}
				{children}
			</div>
		</div>
	</>;
}
