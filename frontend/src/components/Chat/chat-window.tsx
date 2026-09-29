import React, { useState, useEffect, useRef, useContext } from 'react';
import { Gamepad, MessageCircle, MoreVertical, Send, MessageCircleOff, Eye, X, BadgeX, CircleChevronUp, CircleSlash, Play, MessageSquareLock, MessageSquareMore, CircleCheck } from "lucide-react";
import { IoIosCloseCircle } from "react-icons/io";
import {BlockWarningProps, ChatHeaderProps, ChatWindowProps, MessageHistoryProps, RoomMessage, ReloadMoreProps, Room, BlockedUserToastProps} from './chat-types';
import {fetchRoomMessages, narrowToastError} from './chat-utils';
import { BACKEND_URL } from '@/helpers/info';
import { useShowNotification } from '@/contexts/notification-provider';
import Profile from '../Profile/profile';
import { useUser } from '@/contexts/user-provider';
import { useInView } from 'react-intersection-observer';
import Api from '@/helpers/axios';
import { toast } from 'react-toastify';
import tournam from '../../../src/assets/tournam.png'

const formatDate = (isoString: string) => {
  const d = new Date(isoString);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed!
  const year = String(d.getFullYear()).slice(-2); // Get last 2 digits

  const time = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});

  return `${day}-${month}-${year} ${time}`;
}

const ReloadMore = (props: ReloadMoreProps) => {
	const {setActiveRoomMessages, activeRoom, pageToFetch} = props;
	const me = useUser();
  return (
	<button
	  className="
		p-2
		rounded-full
		bg-slate-700
		text-white
		transition-colors
		hover:bg-slate-900
	  "
	  onClick={async () => {await fetchRoomMessages(me.user, setActiveRoomMessages, activeRoom, pageToFetch)}}
	>
	  <CircleChevronUp/>
	</button>
  );
};

const MessageHistory = (props: MessageHistoryProps) => {
	const {LastMessageRef, FirstMessageRef, activeRoomMessages, setActiveRoomMessages, blockWarning, setBlockWarning, user, showLoadMore, activeRoom, pageToFetch} = props;
	const previousMessageCount = useRef<number>(0);
	const me = useUser();

	const isInitialLoad = useRef<boolean>(true);

	useEffect(() => {
		if (isInitialLoad.current && activeRoomMessages.length > 0) {
			if (LastMessageRef.current) {
				LastMessageRef.current.scrollIntoView({ behavior: "smooth" });
			}
			isInitialLoad.current = false;
			previousMessageCount.current = activeRoomMessages.length;
			return;
		}
		const messagesAdd = activeRoomMessages.length > previousMessageCount.current;
		const newMessages = messagesAdd &&
			activeRoomMessages.length - previousMessageCount.current === 1;
		if (newMessages && LastMessageRef.current) {
			LastMessageRef.current.scrollIntoView({ behavior: "smooth" });
		}
		previousMessageCount.current = activeRoomMessages.length;
	}, [activeRoomMessages]);

	return (
		<>
			<div className="flex-1 p-6 overflow-y-auto trans-scrollbar relative">
				{ showLoadMore && activeRoomMessages.length > 12 && (
					<div className="absolute right-1/2 flex items-center">
						<ReloadMore setActiveRoomMessages={setActiveRoomMessages} activeRoom={activeRoom} pageToFetch={pageToFetch}/>
					</div>
				) }
				{activeRoomMessages.map((msg, index) => {
					const isLastMesage = index === activeRoomMessages.length - 1;
					const isFirstMessage = index === 0;
					return (
					<div ref={isLastMesage ? LastMessageRef : isFirstMessage ? FirstMessageRef : null} key={index} className={`flex mb-4 ${msg.sent ? 'justify-end' : 'justify-start'}`}>
						{!msg.sent && (
							<img
								src={`${BACKEND_URL}${user.avatar_url}`}
								alt="Sender"
								className="w-6 h-6 rounded-full object-cover mb-5 mr-2"
							/>
						)}
						<div className={`flex flex-col max-w-md ${msg.sent ? 'items-end' : 'items-start'}`}>
							<div className={`p-3 max-w-[200px] min-w-[40px] font-bold rounded-xl ${msg.sent ? 'bg-yellow-600 text-white rounded-tr-none' : 'bg-slate-900 text-white rounded-tl-none'}`}>
								<p className='break-words whitespace-pre-wrap'>{msg.text}</p>
								<span className={`text-xs font-normal mt-1 block text-right ${msg.sent ? 'text-yellow-900' : 'text-slate-400'}`}>
									{formatDate(msg.timestamp)}
								</span>
							</div>
						</div>
						{msg.sent && me.user && (
							<img
								src={`${BACKEND_URL}${me.user.avatar_url}`}
								alt="Me"
								className="w-6 h-6 rounded-full object-cover mb-5 ml-2"
							/>
						)}
					</div>
				)})}
				{blockWarning && <BlockWarning user={user} setBlockWarning={setBlockWarning} /> }
			</div>
		</>
	);
}

export const BlockedUserToast = (props: BlockedUserToastProps) => {
	const {username, mode} = props;
  return (
			mode === 'block' ? (
				<div className="flex absolute w-full h-full items-center overflow-hidden">
					<CircleSlash className="absolute right-2.5 h-30 w-30 text-red-500 opacity-15" />
					<MessageSquareLock className="h-8 w-8 text-red-500" />
					<div className="ml-3">
					<p className="text-l text-white">
						You have blocked <span className="font-semibold">{username}</span>.
					</p>
					</div>
				</div>
		) : (
				<div className="flex absolute w-full h-full items-center overflow-hidden">
					<CircleCheck className="absolute right-2.5 h-30 w-30 text-yellow-500 opacity-15" />
					<MessageSquareMore className="h-8 w-8 text-yellow-500" />
					<div className="ml-3">
					<p className="text-l text-white">
						You have unblocked <span className="font-semibold">{username}</span>.
					</p>
					</div>
				</div>
		)
  );
};

const BlockWarning = (props: BlockWarningProps) => {

	const {user, setBlockWarning} = props;

	const blockUser = async (userId: number) => {
		try{
			const response = await Api.post(`/relationships/friends/block/${userId}`, {});
			return response.data.success;
		}
		catch (e){narrowToastError(e)}
	}

	return (
		<div className="absolute left-1/3 top-1/3 max-w-md bg-slate-800 rounded-2xl shadow-lg text-white p-6 mx-4 font-sans">

		<div className="flex justify-center mb-3">
			<div className="relative">
			<img
				src={`${BACKEND_URL}${user.avatar_url}`}
				alt="User Avatar"
				className="w-20 h-20 rounded-full"
			/>
			<IoIosCloseCircle className='absolute w-7 h-7 text-red-600 bottom-0 -right-1 bg-slate-800 rounded-full'/>
			</div>
		</div>

		<h1 className="text-center text-2xl font-bold mb-3">Block {user.username}?</h1>

		<div className='space-y-3 justify-start mb-10 mt-4'>
			<div className='flex gap-2 items-center'>
				<MessageCircleOff className='text-red-600 w-5 h-5'/>
				<h2 className="font-semibold">Stop direct messages</h2>
			</div>
			<div className='flex gap-2 items-center'>
				<BadgeX className='text-red-600'/>
				<h2 className="font-semibold">Limit access to your profile and activity</h2>
			</div>
		</div>

		<div className="flex justify-end space-x-3">
			<button onClick={() => {setBlockWarning(false)}} className="bg-transparent hover:bg-[#4E5058]/50 text-white font-medium py-2 px-6 rounded">
			Cancel
			</button>
			<button className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded" onClick={async () => {
					const success = await blockUser(user.id);
					if (success){
						toast(<BlockedUserToast username={user.username} mode='block'/>, {
							customProgressBar: true});
						setBlockWarning(false)
					};
				}}>
			Block
			</button>
		</div>
		</div>
	);
};

const ChatHeader = (props: ChatHeaderProps) => {
	const {user, showProfile, setShowProfile, expandMenu, setExpandMenu, setBlockWarning, blockWarning} = props;
	const showNotification = useShowNotification();
	const {socketId} = useUser();

	const gameInviteNotification = async () => {
		if (user.is_online && user.game_state === "idle") {
			const response = await Api.post('/game/invite/send', {
				invitedId: user.id,
				mode: "1v1",
				socketId,
			});
			if (response.data.success) {
				showNotification({
					message: "Game invite sent successfully 🎉",
					type: "success",
				});
			} else {
				showNotification({
					message: response.data.success || "Error sending invitation",
					type: "error",
				})
			}
			} else {
				showNotification({
					message: `${user.username} is currently ${user.is_online ? "in a game" : "offline"} 🎮`,
					type: "error",
				});
		}
	};

	const profileToggle = () => {
		setShowProfile((current) => !current);
		setExpandMenu((current) => !current);
	};

	const blockWarningToggle = () => {
		setBlockWarning((current) => !current);
		setExpandMenu((current) => !current);
	};

	return (
			<div className="flex items-center p-4 border-b border-slate-70">
			<img src={`${BACKEND_URL}${user.avatar_url}`} alt={user.username} className="w-10 h-10 rounded-full" />
			<div className="ml-4">
				<h2 className="text-lg font-bold text-white truncate max-w-[200px]"> {user.username} </h2>
				<p className={`text-sm ${user.is_online ? 'text-green-400' : 'text-gray-500'}`}>{user.is_online ? 'Online' : 'Offline'}</p>
			</div>
			<div className="ml-auto relative flex items-center gap-2">
				<button className="p-2 rounded-full hover:bg-slate-700" title="Invite to Game" onClick={user.blocker_id ? undefined : () => {!blockWarning && gameInviteNotification()}}> {/*to avoid blocking a user after starting a game session with that user*/}
					<Gamepad className={`${user.blocker_id ? 'text-slate-100 opacity-20' : 'text-white' }`}/>
				</button>
					{expandMenu && (
						<div className="absolute right-0 top-full bg-slate-800 rounded-xl p-1 w-max z-10">
							<button className="flex items-center gap-2 cursor-pointer hover:bg-red-900 rounded-lg p-2 w-full" onClick={blockWarningToggle}>
								<MessageCircleOff className="w-4 h-4 text-red-500" />
								<p className="text-white font-medium">Block user</p>
							</button>
							<button className="flex items-center gap-2 cursor-pointer hover:bg-slate-600 rounded-lg p-2 w-full" onClick={profileToggle}>
								<Eye className="w-5 h-5 text-blue-500" />
								<p className="text-white font-medium">inspect user</p>
							</button>
						</div>
					)}

				{showProfile ?
					(
					<button className="rounded-full hover:bg-slate-700 shadow-2xl" title="close inspection window" onClick={() => {setShowProfile((current) => !current)}}> {/* don't show menu again unless showProfile is false, so the menu won't show when the profile is rendered */}
						<X className="w-7 h-7 text-red-500"/>
					</button>
					) : (
					<button className="rounded-full hover:bg-slate-700" title="More Options" onClick={user.blocker_id ? undefined : () => { expandMenu ? setExpandMenu(false) : !showProfile && !blockWarning  && setExpandMenu(true)}}> {/* don't show menu again unless showProfile is false, so the menu won't show when the profile is rendered */}
						<MoreVertical className={`${user.blocker_id ? 'text-slate-100 opacity-20' : 'text-white' }`}/>
					</button>
					)
				}
			</div>
		</div>
	);
}

export const ChatWindow = ( props: ChatWindowProps) => {
	const { user, onSendMessage, message, setMessage, activeRoom, activeRoomMessages, setActiveRoomMessages } = props;
	const LastMessageRef = useRef<HTMLDivElement>(null);
	const [expandMenu, setExpandMenu] = useState<boolean>(false);
	const [showProfile, setShowProfile] = useState<boolean>(false);
	const [blockWarning, setBlockWarning] = useState<boolean>(false);
	const [showLoadMore, setShowLoadMore] = useState<boolean>(false);
	const pageToFetch = useRef<number>(2);
	const me = useUser();
	const { ref: oldestMessageRef, inView } = useInView({
		threshold: 1,
	});

	useEffect(() => {
		if (activeRoom === 0) return;
		pageToFetch.current = 2;
		fetchRoomMessages(me.user, setActiveRoomMessages, activeRoom, 1);
		setExpandMenu(false);
		setBlockWarning(false);
	}, [activeRoom]);

	useEffect(() => {
		if (inView) setShowLoadMore(true);
		else setShowLoadMore(false);
	}, [inView]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (message.trim()) {
			onSendMessage(message);
			setMessage('');
		}
	};

	return (
		<>
			<ChatHeader user={user} showProfile={showProfile} setShowProfile={setShowProfile} expandMenu={expandMenu} setExpandMenu={setExpandMenu} setBlockWarning={setBlockWarning} blockWarning={blockWarning}/>
			{
				showProfile ? (<Profile userId={user.id}/>) :
				(<>
					<MessageHistory key={activeRoom} LastMessageRef={LastMessageRef} FirstMessageRef={oldestMessageRef} activeRoomMessages={activeRoomMessages} setActiveRoomMessages={setActiveRoomMessages} blockWarning={blockWarning} setBlockWarning={setBlockWarning} user={user} showLoadMore={showLoadMore} activeRoom={activeRoom} pageToFetch={pageToFetch}/>
					{ user.blocker_id ? (
						<div className='text-center text-slate-400 font-mono mb-5'>
							This person isn't receiving messages at this time.
						</div>
					) : (
						<div className="p-4 mb-10">
							<form onSubmit={handleSubmit} className="flex items-center gap-4">
								<input
									type="text"
									placeholder="Type your message..."
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									className="flex-1 p-3 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-white-500 text-white"
									autoComplete="off"
								/>
								<button type="submit" className=" hover:bg-gray-700/70 text-white p-3 rounded-lg transition-colors">
									<Send />
								</button>
							</form>
						</div>
					)
					}
				</>
				)
			}
		</>
	);
};

interface ChatPlaceholderProps {
	activeRoom: number | null;
}

export const ChatPlaceholder = (props: ChatPlaceholderProps) => {
	const {activeRoom} = props;
	if (activeRoom === 0)
		return (<div>
		<div className="flex items-center p-4 border-b border-slate-70">
			<img src={tournam.src} alt='Tour bot' className="w-10 h-10 rounded-full" />
			<div className="ml-4">
				<h2 className="text-lg font-bold text-white truncate max-w-[200px]"> Tournament Bot </h2>
				<p className='text-sm text-green-400'>Online</p>
			</div>
		</div>
		<div className="flex-1 p-6 overflow-y-auto trans-scrollbar relative">
					<div className='flex mb-4 justify-start'>
						<img
							src={tournam.src}
							alt="Sender"
							className="w-6 h-6 rounded-full object-cover mb-5 mr-2"
						/>
						<div className='flex flex-col max-w-md items-start'>
							<div className='p-3 w-100 font-bold rounded-xl bg-slate-900 text-white rounded-tl-none'>
								<p className='break-words whitespace-pre-wrap'>The battle for the crown begins now! The local tournament has started! Good luck to all players.</p>
							</div>
						</div>
					</div>
			</div>
		</div>);
	return (
		<div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
			<MessageCircle />
			<h2 className="text-2xl font-bold text-gray-400 mt-4">Select a conversation</h2>
			<p className="mt-2">Choose a friend from the list to start chatting.</p>
		</div>
	);
};
