import { User } from "@/helpers/types";
import { SetStateAction } from "react";

export interface Message {
	text: string;
	sent: boolean;
}

export interface BlockedUserToastProps {
  username: string;
  mode: 'block' | 'unblock';
}

export interface Room {
	id: number;// not the room id from the db!!!!!!!!!
	name: string;
	created_at: string;
}

export interface RoomMessage {
	text: string;
	receiver: number;
	room_id: number;
	timestamp: string;
	sent: boolean;
}

export interface Friends {
	[key: string]: User;
}

export interface ConversationListProps {
	users: Friends;
	activeConversationId: number | null;
	activeRoom: number | null;
	onSelectConversation: (userId: number, room_id: number) => void
	setMessage: (message: string) => void;
	handleSetSearchedFriend: (value: string) => void,
	setActiveRoom: React.Dispatch<React.SetStateAction<number | null>>,
	tournament: boolean,
}

export interface ProfileListProps {
	user: User;
	onSelectConversation: (userId: number, room_id: number) => void
	setMessage: (message: string) => void;
	activeConversationId: number | null;
	setShowUndoWarning: (value: SetStateAction<boolean>) => void
}

export interface ChatWindowProps {
	user: User;
	onSendMessage: (message: string) => void;
	message: string;
	setMessage: (message: string) => void;
	activeRoom: number | null;
	activeRoomMessages: RoomMessage[];
	setActiveRoomMessages: React.Dispatch<React.SetStateAction<RoomMessage[]>>
}

export interface MessageHistoryProps {
	LastMessageRef: React.RefObject<HTMLDivElement | null>;
	FirstMessageRef: (node?: Element | null | undefined) => void;
	activeRoomMessages: RoomMessage[];
	setActiveRoomMessages: React.Dispatch<React.SetStateAction<RoomMessage[]>>
	blockWarning: boolean;
	setBlockWarning: (value: React.SetStateAction<boolean>) => void;
	user: User;
	showLoadMore: boolean;
	activeRoom: number | null;
	pageToFetch: React.RefObject<number>
}

export interface ChatHeaderProps {
	user: User;
	showProfile: boolean;
	setShowProfile: (value: React.SetStateAction<boolean>) => void;
	expandMenu: boolean;
	setExpandMenu: (value: React.SetStateAction<boolean>) => void;
	blockWarning: boolean;
	setBlockWarning: (value: React.SetStateAction<boolean>) => void;
}

export interface BlockWarningProps {
	user: User;
	setBlockWarning: (value: React.SetStateAction<boolean>) => void;
}

export interface NewMessageToastProps {
	messageText: string;
	senderProfilUrl: string;
	senderName: string;
}

export interface ReloadMoreProps {
	setActiveRoomMessages: React.Dispatch<React.SetStateAction<RoomMessage[]>>;
	activeRoom: number | null;
	pageToFetch: React.RefObject<number>
}
