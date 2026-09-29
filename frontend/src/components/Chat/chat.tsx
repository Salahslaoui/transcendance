"use client";

import React, { useEffect, useRef, useState } from 'react';
import { ChatWindow, ChatPlaceholder } from './chat-window';
import {RoomMessage, Friends} from './chat-types';
import ConversationList from './conversation-list';
import WebsocketService, { ChatMsg, WsDataIn } from '@/services/ws';
import {narrowToastError} from './chat-utils';
import { useUser } from '@/contexts/user-provider';
import Api from "@/helpers/axios";
import { User } from '@/helpers/types';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function Chat() {

	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const activeRoomParam = searchParams.get("room");
	const [message, setMessage] = useState<string>('');
	const [tournament, SetTournament] = useState<boolean>(false);
	const [users, setUsers] = useState<Friends>({});
	const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
	const [activeRoom, setActiveRoom] = useState<number | null>(null);
	const [activeRoomMessages, setActiveRoomMessages] = useState<RoomMessage[]>([]);
	const [searchedFriend, setSearchedFriend] = useState<string>('');
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const me = useUser();

	const handleSetSearchedFriend = (value: string) => {

		 if (searchTimeoutRef.current) {
			 clearTimeout(searchTimeoutRef.current);
		 }
		 searchTimeoutRef.current = setTimeout(() => {
			 setSearchedFriend(value);
		 }, 400);
	 };

	 useEffect(() => {
		 return () => {
			 if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
		 };
	 }, []);

	useEffect(() => {

		const handleIncomingMessage = async (event: WsDataIn) => {
			const msgData: ChatMsg | undefined = event.details.chatMsg;
			if (!msgData || !msgData.senderId || !msgData.text) return;
			const myId = me.user!.id;

			if (activeConversationId === msgData.senderId) {
				setActiveRoomMessages(prev => [...prev, {
					text: msgData.text,
					receiver: myId,
					room_id: activeRoom!,
					timestamp: new Date().toISOString(),
					sent: false
				}]);
			}
		};

		const handleSelfMessage = async (event: WsDataIn) => {
			const msgData: ChatMsg | undefined = event.details.chatMsg;
			if (!msgData || !msgData.senderId || !msgData.text) return;
			const myId = me.user!.id;

			if (activeConversationId && myId === msgData.senderId) {
				setActiveRoomMessages(prev => [...prev, {
					text: msgData.text,
					receiver: activeConversationId,
					room_id: activeRoom!,
					timestamp: new Date().toISOString(),
					sent: true // Received message
				}]);
			}
		};

		WebsocketService.subscribe("arrived_message", handleIncomingMessage);
		WebsocketService.subscribe("self_message", handleSelfMessage);
		return () => {
			WebsocketService.unsubscribe("arrived_message", handleIncomingMessage)
			WebsocketService.unsubscribe("self_message", handleSelfMessage)
		};
	}, [activeConversationId, activeRoom]);

	useEffect(() => {
		 const handleFriendConnect = (event: { details: { id: string | number } }) => {
			setUsers(prev => {
				const updated = { ...prev };
				if (updated[event.details.id]) {
					updated[event.details.id] = { ...updated[event.details.id], is_online: true };
				}
				return updated;
			});
		};
		const handleFriendDisconnect = (event: { details: { id: string | number } }) => {
			setUsers(prev => {
				const updated = { ...prev };
				if (updated[event.details.id]) {
					updated[event.details.id] = { ...updated[event.details.id], is_online: false };
				}
				return updated;
			});
		};

		const handleBlockUser = (event: WsDataIn) => {
			if (!event.details.blocker)
				return;
			setUsers(prev => {
				const updated = { ...prev };
				if (updated[event.details.blocker!]) {
					updated[event.details.blocker!] = { ...updated[event.details.blocker!], blocker_id: event.details.blocker! };
				}
				return updated;
			});
		}

		const handleUnblockUser = (event: WsDataIn) => {
			if (!event.details.blocker)
				return;
			setUsers(prev => {
				const updated = { ...prev };
				if (updated[event.details.blocker!]) {
					updated[event.details.blocker!] = { ...updated[event.details.blocker!], blocker_id: null };
				}
				return updated;
			});
		}

		const handleSelfBlockUser = (event: WsDataIn) => {
			if (!event.details.blocked)
				return;
			setUsers(prev => {
				const updated = { ...prev };
				if (updated[event.details.blocked!]) {
					updated[event.details.blocked!] = { ...updated[event.details.blocked!], blocker_id: me.user?.id};
				}
				return updated;
			});
		}

		const handleSelfUnblockUser = (event: WsDataIn) => {
			if (!event.details.blocked)
				return;
			setUsers(prev => {
				const updated = { ...prev };
				if (updated[event.details.blocked!]) {
					updated[event.details.blocked!] = { ...updated[event.details.blocked!], blocker_id: null};
				}
				return updated;
			});
		}

		const handleFriendAdd = async (event: WsDataIn) => {
			if (!event.details.friendInfo)
				return;
			const newFriend = event.details.friendInfo;
			setUsers((prevUsers) => ({ ...prevUsers, [newFriend.id]: newFriend }));
		}

		const handleFriendDelete = async (event: WsDataIn) => {
			if (!event.details.id)
				return;
			setUsers((prevUsers) => {
				const { [event.details.id!.toString()]: toRemove, ...remainingFriends } = prevUsers;
				return remainingFriends;
			});
		}

		const handleTournamentStart = (event: WsDataIn) => {
			SetTournament(true);
		}

		WebsocketService.subscribe("friend_add", handleFriendAdd);
		WebsocketService.subscribe("friend_removed", handleFriendDelete);
		WebsocketService.subscribe("friend_connect", handleFriendConnect);
		WebsocketService.subscribe("friend_disconnect", handleFriendDisconnect);
		WebsocketService.subscribe("user_blocked", handleBlockUser);
		WebsocketService.subscribe("user_unblocked", handleUnblockUser);
		WebsocketService.subscribe("self_user_blocked", handleSelfBlockUser);
		WebsocketService.subscribe("self_user_unblocked", handleSelfUnblockUser);
		WebsocketService.subscribe("Tn_start", handleTournamentStart);
		return () => {
			WebsocketService.unsubscribe("friend_add", handleFriendAdd);
			WebsocketService.unsubscribe("friend_removed", handleFriendDelete);
			WebsocketService.unsubscribe("friend_connect", handleFriendConnect);
			WebsocketService.unsubscribe("friend_disconnect", handleFriendDisconnect);
			WebsocketService.unsubscribe("user_blocked", handleBlockUser);
			WebsocketService.unsubscribe("user_unblocked", handleUnblockUser);
			WebsocketService.unsubscribe("self_user_blocked", handleSelfBlockUser);
			WebsocketService.unsubscribe("self_user_unblocked", );
			WebsocketService.unsubscribe("Tn_start", handleTournamentStart);
		};
	}, []);

	useEffect(() => {
		const fetchFriends = async () => {
			try{
				const response = await Api.get(`/relationships/friends/list-by-match/${searchedFriend}`);
				const friends: User[] = response.data.details.friends;
				const usersData: Friends = friends.reduce((acc, friend) => {
					acc[friend.id] = friend;
					return acc;
				}, {} as Friends);
				setUsers(usersData);
			}
			catch(e){narrowToastError(e)}
		};
		fetchFriends();
	}, [searchedFriend]);

useEffect(() => { // set states from url
	const validateAndSetRoom = async () => {
		const roomId = Number(activeRoomParam!);

		if (isNaN(roomId)) {
			router.replace(pathname);
			return;
		}
		try {
			const response = await Api.get(`/chat/participants/members-by-room/${roomId}`);
			const members: number[] = [response.data.member1, response.data.member2];
			const isMember = members.includes(me.user!.id);
			if (isMember) {
				const friendId: number = me.user!.id === members[0] ? members[1] : members[0];
				setActiveRoom(roomId);
				setActiveConversationId(friendId);
			}
			else router.replace(pathname);
		}
		catch (e) {
			narrowToastError(e);
			router.replace(pathname);
		}
	};

	if (activeRoomParam !== null) // when '?room=' the param will be "", which is falsy
		validateAndSetRoom();
}, [activeRoomParam]);

	const handleSendMessage = async (messageText: string) => {
		if (!activeConversationId) return; // so unnecessary: no send button is rendered in the first place when no user is selected, therefore no button to call handleSendMessage, keep it cuz im paranoid :|
		try{
			const msgObject = {
				room_id: activeRoom!,
				user_id: activeConversationId, // recipient id
				content: messageText,
				my_socket_id: me.socketId,
			};
			const response = await Api.post('/chat/messages/create', msgObject);
			if (response.data.success){
				setActiveRoomMessages(prevMessages => [
					...prevMessages,
					{
						text: msgObject.content,
						receiver: msgObject.user_id,
						room_id: msgObject.room_id,
						timestamp: new Date().toISOString(),
						sent: true,
					}
				]);
			}
		}
		catch (e) {narrowToastError(e);}
	};

	const handleSelectConversation = (userId: number, room_id: number) => {
		if (!room_id)
			return;
		if (room_id === activeRoom)
			return ;
		setActiveRoomMessages([]);
		setActiveConversationId(userId);
		setActiveRoom(room_id);

		const params = new URLSearchParams(searchParams.toString());
		params.set('room', room_id.toString());
		router.push(pathname + "?" + params.toString());
	};

	const activeUser = activeConversationId ? users[activeConversationId] : null;

	return (
		<div className="flex h-screen overflow-hidden text-gray-300">
			<main className="flex-1 flex flex-col">
				{(activeUser && activeRoom) ? (
					<ChatWindow
						user={activeUser}
						onSendMessage={handleSendMessage}
						message={message}
						setMessage={setMessage}
						activeRoom={activeRoom}
						activeRoomMessages={activeRoomMessages}
						setActiveRoomMessages={setActiveRoomMessages}
					/> ) : (
					<ChatPlaceholder activeRoom={activeRoom}/>
				)}
			</main>
			<ConversationList
				users={users}
				activeRoom={activeRoom}
				activeConversationId={activeConversationId}
				onSelectConversation={handleSelectConversation}
				setMessage={setMessage}
				handleSetSearchedFriend={handleSetSearchedFriend}
				setActiveRoom={setActiveRoom}
				tournament={tournament}
			/>
		</div>
	);
}
