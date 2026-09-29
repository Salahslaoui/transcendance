import ProfilePicture from "../ui/profile-picture";
import ChoosePlayer from "../ui/player-modal";
import { useState } from "react";
import Modal from "../ui/modal";


type MyModal = {
    isopen: boolean;
    onCloser: () => void;
    children: React.ReactNode;
}

export type Competitor = {
    name: string;
    Me?: boolean | null;
    avatar?: string;
    id?: number;
}

type Match = {
    team1: Competitor;
    team2: Competitor;
}

type RoundProps = {
    id: string;
    roundIndex?: number;
    competitors: Competitor[];
    roundClass?: string;
    onInvite?: (invitedFriend: any, slot: {roundIndex: number; slotIndex: number}) => void;
}

export function Competitor({name, avatar, Me}: Competitor) {

    const classes = ["flex items-center m-2 p-3 leading-relaxed bg-gray-600 text-gray-300 rounded-full relative with-connector", Me ? "cursor-default" : "cursor-pointer hover:bg-gray-500"];
    
    return (
        <li className={classes.join(" ")} onClick={() => {if (Me) return;
        }}>
            <ProfilePicture height="40px" width="40px" img={avatar} />
            <span className="ml-3 font-bold">{name}</span>
        </li>
    );
}

export default function Round({id, competitors, roundClass, roundIndex = 0, onInvite}: RoundProps) {
    
    const [showModal, setShowModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{roundIndex: number; slotIndex: number} | null>(null);

    function openChoosePlayer(slotIndex: number) {
        setSelectedSlot({roundIndex, slotIndex});
        setShowModal(true);
    }

    function handleFriendInvite(invitedFriend: any) {
        if (onInvite && selectedSlot) {
            onInvite(invitedFriend, selectedSlot);
        }
        setShowModal(false);
        setSelectedSlot(null);
    }
    return (

        <>
            <ol id={id} className={`flex flex-1 flex-col justify-around mr-5 ml-5 round ${
                roundClass || ""
            }`}>
                {competitors.map((comp, i) => (<Competitor key={i} {...comp}/>))}
            </ol>
        </>
    );
}
