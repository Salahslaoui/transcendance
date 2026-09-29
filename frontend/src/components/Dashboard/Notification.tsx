"use client";
import { useState , useEffect} from "react";
import { Dispatch, SetStateAction } from "react";
import { Bell, Check, X, User as UserIcon } from "lucide-react";
import { BACKEND_URL } from "@/helpers/info";
import { useShowNotification } from "@/contexts/notification-provider";
import WebsocketService from "@/services/ws";
import { WsDataIn } from "@/services/ws";
import { User } from "@/helpers/types";
import Api from "@/helpers/axios";

type Notification = {
	id: number;
	username: string;
	avatar_url: string;
};

export default function Notification({setFriends}: {setFriends: Dispatch<SetStateAction<Set<User>>>}) {
	const [isOpen, setIsOpen] = useState(false);
	const [results, setResults] = useState<Notification[]>([]);
	const showNotification = useShowNotification();

	const handleNewFriendRequest = (event: WsDataIn) => {
		const data = event.details.friendRequest;
		if (!data)
			throw new Error("GameStart info not found");
		setResults(prev => [...prev, data]);
	}

	useEffect(() => {
		WebsocketService.subscribe("friend_request", handleNewFriendRequest);
		const fetchNotifications = async () => {
			try {
				const response = await Api.get(`/relationships/friends/requests`);
				if (response.data.success && response.data.details.requests) {
					setResults(response.data.details.requests);
				}
			} catch (error) {
				console.error("Error fetching notifications:", error);
			}
		};
		fetchNotifications();
		return () => {
			WebsocketService.unsubscribe("friend_request", handleNewFriendRequest);
		}
	}, []);

	const handleRequest = async(requestId: number, username: string, accept: string) =>  {
		if (accept === "accept") {
			try {
				const response = await Api.post(`/relationships/friends/accept/${requestId}`)
				if (response.data.success) {
					const friend = response.data.details.friend;
					setResults(prev => prev.filter(req => req.id !== requestId));
					setFriends(prev => new Set([...prev, friend]));
					showNotification({
						message: `Accepted friend request from ${username}`,
						type: "success"
					});
				}
			} catch (error) {
				console.error("Error accepting friend request:", error);
				showNotification({
					message: "Failed to accept friend request",
					type: "error"
			});
		}}
		else if (accept === "reject") {
			try {
				const response = await Api.post(`/relationships/friends/reject/${requestId}`);
				if (response.data.success) {
					setResults(prev => prev.filter(req => req.id !== requestId));
					showNotification({
						message: `Rejected friend request from ${username}`,
						type: "success"
					});
				}
			} catch (error) {
				console.error("Error rejecting friend request:", error);
				showNotification({
					message: "Failed to reject friend request",
					type: "error"
				});
			}}
	};

	return (
		<div className="relative">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#1a1a22] border border-gray-600 hover:bg-[#252530] transition-colors"
			>
				<Bell className="w-5 h-5 text-gray-300" />
				{results.length > 0 && (
					<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold"></span>
				 )}
			</button>
			{isOpen && (
				<>
					<div
						className="fixed inset-0 z-40"
						onClick={() => setIsOpen(false)}
					/>
					<div className="absolute right-0 top-12 bg-[#0D0D12] border border-gray-600 rounded-xl shadow-2xl w-80 z-50 max-h-96 overflow-hidden">
						<div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500 scrollbar-track-gray-900">
							{results.length === 0 ? (
								<div className="flex flex-col items-center justify-center p-8 text-center">
									<UserIcon className="w-12 h-12 text-gray-500 mb-3" />
									<p className="text-gray-400 text-sm">No new friend requests</p>
								</div>
							) : (
								<ul className="p-2">
									{results.map((req) => (
										<li
											key={req.id}
											className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#1a1a22] transition-colors mb-2 last:mb-0"
										>
											<div className="relative">
												<img
													src={`${BACKEND_URL}${req.avatar_url}`}
													alt={req.username}
													className="w-12 h-12 rounded-full object-cover border-2 border-gray-600"
												/>
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-white font-medium text-sm truncate"> {req.username}</p>
												<p className="text-gray-400 text-xs">wants to be your friend</p>
											</div>
											<div className="flex gap-2">
												<button
													onClick={() => handleRequest(req.id, req.username, "accept")}
													className="flex items-center justify-center w-8 h-8 bg-green-600 rounded-lg hover:bg-green-700 transition-colors group"
													title="Accept"
												>
													<Check className="w-4 h-4 text-white" />
												</button>
												<button
													onClick={() => handleRequest(req.id, req.username, "reject")}
													className="flex items-center justify-center w-8 h-8 bg-red-600 rounded-lg hover:bg-red-700 transition-colors group"
													title="Reject"
												>
													<X className="w-4 h-4 text-white" />
												</button>
											</div>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
