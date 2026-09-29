import axios from "axios";
import {RoomMessage } from "./chat-types";
import { toast } from "react-toastify";
import Api from "@/helpers/axios";
import { User } from "@/helpers/types";

export const fetchRoomMessages = async (loggedInUser: User | undefined,updateMessages: React.Dispatch<React.SetStateAction<RoomMessage[]>>, activeRoom: number | null, pageToFetch: React.RefObject<number> | number) => {

    const pageToUse = typeof pageToFetch === 'number' ? pageToFetch : pageToFetch.current;

    try{
        const currentUserId = loggedInUser?.id;
		if (!loggedInUser)
			throw Error;
        const roomMessages = await Api.get(`/chat/messages/list/${activeRoom}`, { params: { page: pageToUse } });
		if (roomMessages.data.success) {
            const formattedMessages: RoomMessage[] = roomMessages.data.messages.map((msg: any) => ({
                text: msg.content,
                receiver: msg.user_id,
                room_id: msg.room_id,
                timestamp: msg.timestamp,
                sent: msg.user_id !== currentUserId,
            }));
        if (pageToUse === 1)
            updateMessages(formattedMessages.reverse());
        else if (pageToUse > 1){
            updateMessages(prevMessages => [
            ...[...formattedMessages].reverse(),
            ...prevMessages
            ]);
        }
        if (typeof pageToFetch === 'object' && pageToFetch !== null && 'current' in pageToFetch) // 100% sure pageToFetch is a ref
            pageToFetch.current = roomMessages.data.pagination.currentPage + 1;
        }
    }
    catch(error){ narrowToastError(error) }
};

const createParticipants = async (roomId: number, otherUserId: number) => {
	try {
		await Api.post('/chat/participants/create', {room_id: roomId, other_id: otherUserId});
	} catch (error) {narrowToastError(error)}
};

const selectRoom = async (user: User, me: User) => {
	try {
		const loggedInUser: number = me.id;
		const receiverUser: number = user.id;

		const response = await Api.get(`/chat/check-membership/${receiverUser}`);
		let room_id;
		if (response.data.exists)
			room_id = response.data.room_id;
		else {
			const newRoom = await Api.post('/chat/rooms/create', {host: loggedInUser, guest: receiverUser});
			await createParticipants(newRoom.data.room_id, receiverUser);
			room_id = newRoom.data.room_id;
		}
		return room_id;
	}
	catch(e){
		if (axios.isAxiosError(e) && e.response && e.response.status === 403)
			toast.warning(e.response.data.error);
		else
			narrowToastError(e)
	}
};

export const setUpConvo = async (me: User, onSelectConversation: (userId: number, room_id: number) => void, user: User, setMessage: (message: string) => void) => {
			const room_id: number = await selectRoom(user, me);
			onSelectConversation(user.id, room_id);
			setMessage('');
}

export const narrowToastError = (errorObject: unknown) => {
	if (axios.isAxiosError(errorObject) && errorObject.response) {
		const status = errorObject.response.status;
		const errorMessage = errorObject.response.data.error || "An unknown server error occurred.";
		let toastMessage = "";
		switch (status) {
			case 400: // Bad Request
				toastMessage = errorMessage;
				break;
			case 404: // Not Found
				toastMessage = errorMessage;
				break;
			case 409: // Conflict
				toastMessage = errorMessage;
				break;
			case 413: // Payload Too Large
				toastMessage = `Message too long. Please keep it under 2000 characters.`;
				break;
			case 500: // Internal Server Error
				toastMessage = "A server error occurred. Please try again later.";
				break;
			default:
				toastMessage = `Error: ${errorMessage}`;
		}
		toast.error(toastMessage);
	} else if (errorObject instanceof Error) {
		toast.error("An error occurred in your browser. Please refresh.");
	} else {
		toast.error("An unknown error occurred. Please try again.");
	}
}
