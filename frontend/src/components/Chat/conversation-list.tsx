import { BACKEND_URL } from '@/helpers/info';
import {ConversationListProps, ProfileListProps} from './chat-types';
import {narrowToastError, setUpConvo } from './chat-utils';
import {BadgeX, LockOpen, MessageCircle, MessageCircleOff, UserRoundSearch, ChevronLeft, Loader2, BotMessageSquare, Trophy} from 'lucide-react';
import { IoIosCloseCircle } from 'react-icons/io';
import { useUser } from '@/contexts/user-provider';
import { useEffect, useState } from 'react';
import Api from '@/helpers/axios';
import { motion } from 'framer-motion';
import { User } from '@/helpers/types';
import { toast } from 'react-toastify';
import { BlockedUserToast } from './chat-window';
import tournam from '../../../src/assets/tournam.png'

const ProfileList = (props: ProfileListProps) => {
	const use = useUser();
	const [loading, setLoading] = useState<boolean>(true);
	const me = use.user;
	const {user, onSelectConversation, setMessage, activeConversationId, setShowUndoWarning} = props;

	useEffect(() => {
		if (me)
			setLoading(false);
	}, [me])

	if (loading)
		return	<motion.div
                      className="w-13 h-13"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    >
                      <Loader2 className="w-13 h-13" />
                </motion.div>

	return (
		<div
			onClick={async () => {me ? await setUpConvo(me, onSelectConversation, user, setMessage) : undefined}}

			className={`
				relative flex items-center ml-3 py-4 pl-4 h-12 transition-colors rounded-2xl bg-[#1a1a22] overflow-hidden
				${activeConversationId === user.id && !user.blocker_id ? 'bg-slate-700' : ''}
				${user.blocker_id
					? 'opacity-60'
					: 'cursor-pointer hover:bg-slate-700/50'
				}
			`}
		>
			{user.blocker_id ? (
				<BadgeX
					className="absolute top-1/2 -translate-y-1/2 right-2 z-0 h-18 w-18 text-red-500 opacity-15 transform -rotate-13 pointer-events-none"
				/>
			) : (
				<MessageCircle
					className="absolute top-1/2 -translate-y-1/2 right-2 z-0 h-16 w-16 text-slate-500 opacity-15 transform rotate-10 pointer-events-none"
				/>
			)
		}

			<div className="relative flex items-center w-full">
				<div className="relative">
					<img src={`${BACKEND_URL}${user.avatar_url}`}
						 alt={user.username}
						 className={`w-8 h-8 rounded-full object-cover ${user.blocker_id ? 'grayscale' : ''}`} />

					{!user.blocker_id && (
						<span className={`absolute bottom-0 right-0 h-3.5 w-3.5 ${user.is_online ? 'bg-green-500' : 'bg-slate-500'} rounded-full border-2 border-[#1a1a22]`}></span>
					)}
				</div>

				<div className="flex-1 ml-4 overflow-hidden relative">
					<div className="flex justify-between items-center absolute inset-0">
						<h3 className={`font-semibold text-white truncate max-w-[100px] ${user.blocker_id ? 'line-through' : ''}`}>{user.username}</h3>
					</div>

					<div className="h-8">
						{(activeConversationId === user.id) && (user.blocker_id === me!.id) && (
							<motion.button
								className='absolute h-7 right-0 bottom-0 bg-slate-500/40 hover:bg-slate-600 rounded-tl-md rounded-bl-md overflow-hidden'
								initial={{ width: 0 }}
								animate={{ width: "3.5rem" }}
								transition={{ duration: 0.5, ease: "easeOut" }}
								onClick={async () => {
									me!.id === user.blocker_id &&
									setShowUndoWarning((current) => !current);
								}}
							>
								<div className='w-14 flex items-center justify-start'>
									<LockOpen className='pl-1.5 w-5.5 h-5.5'/>
								</div>
							</motion.button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

interface TournamentBotProps {
	setActiveRoom: React.Dispatch<React.SetStateAction<number | null>>,
}

const TournamentBot = (props: TournamentBotProps) => {
	const {setActiveRoom} = props;
	return (
		<div className='relative flex items-center ml-3 py-4 pl-4 h-12 transition-colors rounded-2xl bg-[#1a1a22] overflow-hidden cursor-pointer hover:bg-slate-700/50' onClick={() => {setActiveRoom(0)}}>
				<Trophy
					className="absolute top-1/2 -translate-y-1/2 right-2 z-0 h-13 w-13 text-orange-500 opacity-15 transform rotate-10 pointer-events-none"
				/>

			<div className="relative flex items-center w-full">
				<div className="relative">
					<img src={tournam.src}
						 alt='Tournament Bot'
						 className='w-8 h-8 rounded-full object-cover' />
				</div>

				<div className="flex-1 ml-4 overflow-hidden relative">
						<h3 className='font-semibold text-white truncate max-w-[100px]'>Tournament</h3>
				</div>
			</div>
		</div>
	);
}

const ConversationList = (props: ConversationListProps) => {
	const { users, activeConversationId, onSelectConversation, setMessage, handleSetSearchedFriend, setActiveRoom, tournament } = props;
	const [showUndoWarning, setShowUndoWarning] = useState<boolean>(false);
	const userEntries = Object.entries(users);
	const [isVisible, setIsVisible] = useState<boolean>(true);

	const unBlockUser = async (userId: number) => {
		try{
			const response = await Api.post(`/relationships/friends/unblock/${userId}`);
			return response.data.success;
		}
		catch (e){narrowToastError(e)}
	}

	useEffect(() => {setShowUndoWarning(false)}, [activeConversationId]);


	return (
		<>
			{ activeConversationId && showUndoWarning &&
				<div className="absolute left-1/3 top-1/3 max-w-md bg-slate-800 rounded-2xl shadow-lg text-white p-6 mx-4 font-sans">

				<div className="flex justify-center mb-3">
					<div className="relative">
					<img
						src={`${BACKEND_URL}${users[activeConversationId].avatar_url}`}
						alt="User Avatar"
						className="w-20 h-20 rounded-full"
					/>
					<IoIosCloseCircle className='absolute w-7 h-7 text-amber-400 bottom-0 -right-1 bg-slate-800 rounded-full'/>
					</div>
				</div>

				<h1 className="text-center text-2xl font-bold mb-3">Unblock {users[activeConversationId].username} ?</h1>

				<div className='space-y-3 justify-start mb-10 mt-4'>
					<div className='flex gap-2 items-center'>
						<MessageCircleOff className='text-amber-400 w-5 h-5'/>
						<h2 className="font-semibold">this user will be able to send and receive messages</h2>
					</div>
					<div className='flex gap-2 items-center'>
						<BadgeX className='text-amber-400'/>
						<h2 className="font-semibold">Access to your profile, activity, and old messages will be restored</h2>
					</div>
				</div>

				<div className="flex justify-end space-x-3">
					<button onClick={() => {setShowUndoWarning(false)}} className="bg-transparent hover:bg-[#4E5058]/50 text-white font-medium py-2 px-6 rounded">
					Cancel
					</button>
					<button className="bg-amber-400 hover:bg-amber-500 text-white font-medium py-2 px-6 rounded" onClick={async () => {
							const success = await unBlockUser(activeConversationId);
							if (success){
								toast(<BlockedUserToast username={users[activeConversationId].username} mode='unblock'/>, {
								customProgressBar: true});
								setShowUndoWarning(false);
							}
						}}>
					Unblock
					</button>
				</div>
				</div>
			}
		<aside
			className={`
				flex flex-col border-l border-slate-700
				transition-all duration-300 ease-in-out
				${isVisible ? "w-70 pr-3" : "w-10"}
			`}
			>
			<button
				onClick={() => {setIsVisible(!isVisible)}}
				className="w-8 h-8 flex ml-1 items-center justify-center rounded-xl hover:bg-purple-600/50 transition-colors"
				title={isVisible ? "Hide conversations" : "Show conversations"}
			>
				<ChevronLeft
				className={`
					w-4 h-4 text-white
					transition-transform duration-300
					${isVisible ? 'rotate-180' : 'rotate-0'}
				`}
				/>
			</button>

			{ isVisible ? (
				<div className="flex-1 overflow-y-auto space-y-3 trans-scrollbar">

				<div className="relative flex gap-2 mb-3 mt-3 ml-3">
					<UserRoundSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
					<input
						type="text"
						onChange={(e) => {handleSetSearchedFriend(e.target.value)}}
						placeholder="Search friends..."
						className="w-full mr-1 pl-11 py-2 text-sm text-white bg-[#1a1a22] border border-gray-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
					/>
				</div>

				{userEntries.length === 0 ? (
					<div className="flex items-center justify-center h-full text-gray-400">
					No friends yet. Make some!
					</div>
				) : (
					userEntries
					.slice()
					.sort((entryA, entryB) => {
						const userA = entryA[1];
						const userB = entryB[1];
						const getScore = (user: User) => {
							if (user.blocker_id) return 0;
							if (user.is_online) return 2;
							return 1;
						};
						return getScore(userB) - getScore(userA);
					})
					.map(([id, user]) => {
						return (
						<ProfileList
							key={id}
							user={user}
							onSelectConversation={onSelectConversation}
							setMessage={setMessage}
							activeConversationId={activeConversationId}
							setShowUndoWarning={setShowUndoWarning}
						/>
						);
					})
				)}
				{
					tournament && <TournamentBot setActiveRoom={setActiveRoom}/>
				}
				</div>
			) : (
				<div></div>
			)}
		</aside>
		</>
)};

export default ConversationList;
