import fastify, { FastifyInstance } from "fastify"
import { createTournamentSchema } from "../../../schemas/tournament.schema"
import { StatusCodes } from "http-status-codes";
import TournamentModel from "../../../database/game/tournament.db";
import TournamentPlayerModel from "../../../database/game/tournament_player.db";
import UserModel from "../../../database/user/user.db";
import { checkIfFriends } from "../../../database/relationships/friends.db";
import { InvitationRedisModel, TSessionRedisModel, RedisModel, redis } from "../../../redis/redis";
import { WsInvitationOut, WsTournamentInvOut, WsInvitationReject, Competitor } from "../../../helpers/wsUtils";
import { getSuccessMsg } from "../../../helpers/utils";
import fs from "fs";
import path from "path";
import {ContractAbi, Web3} from 'web3'

const web3 = new Web3('https://api.avax-test.network/ext/bc/C/rpc');
const contractAddress = '0xF1C12B8e89b340D71C78Ce1589F4F7a13975Fd1F';
const _fromAddress = '0x959f6f6b22b5890b7d51cff76635878c8f98d1d4';
const privateKey = 'd9df17b8bf28add81741efda4fc50598fb5b2a0a7a8bf1cb7574b840992e146e';

const Bstruct = {
    type: "object",
    properties: {
        Player1: {type: "string"},
        Player2: {type: "string"},
        ScoreP1: {type: "number"},
        ScoreP2: {type: "number"},
    },
    required: ["Player1", "Player2", "ScoreP1", "ScoreP2"],
}

const TInvite = {
    type: "object",
    properties: {
        invitedId: {type: "number"},
    },
    required: ["invitedId"],
}

const TResp = {
    type: "object",
    properties: {
        resp: {type: "string"},
        inviteId: {type: "number"},
    },
    required: ["inviteId", "resp"],
}

type bstruct = {
    Player1: string;
    Player2: string;
    ScoreP1: number;
    ScoreP2: number;
}

interface WsTournamentSession {
  id?: string;
  hostId?: number;
  players?: number[];
  maxPlayers?: number;
  stateT?: "inviting" | "ready" | "started" | "finished";
}

interface SavedInvitation extends WsTournamentInvOut
{
    senderId: number;
}

function formatBstruct(data: bstruct): string {
    return (`
Competitor1: ${data.Player1}
Score: ${data.ScoreP1}
Competitor2: ${data.Player2}
Score: ${data.ScoreP2}
`);
}

export default function InviteTournament(fastify: FastifyInstance) {

    fastify.post<{Body: { Player1: string, Player2: string, ScoreP1: number, ScoreP2: number }}>("/set-data", {schema: {body: Bstruct} ,preHandler: fastify.authenticate({})}, async(req, res) => {
        try {
            const tmp: bstruct = req.body;
            const result : string = formatBstruct(tmp);
            const Path = path.join(__dirname, "MyContract.json");
            const art = JSON.parse(fs.readFileSync(Path, "utf8"));
            const Data: ContractAbi = art.abi;
            const contract = new web3.eth.Contract(Data, contractAddress);
            const tr = contract.methods.addScore(result).encodeABI();
            const gazConsum = await contract.methods.addScore(result).estimateGas
            ({ from: _fromAddress });
            const gasPrice = await web3.eth.getGasPrice();
            const nonce = await web3.eth.getTransactionCount(_fromAddress, "pending");

            const signedTr = await web3.eth.accounts.signTransaction({
                from: _fromAddress,
                to: contractAddress,
                data: tr,
                gas: gazConsum,
                gasPrice,
                nonce: nonce,
            }, privateKey);
            const receipt = await web3.eth.sendSignedTransaction(signedTr.rawTransaction);
            if (!receipt || (receipt.status == "0x0" || receipt.status === 0))
                throw new Error('Transaction failed or reverted');

            return res.code(StatusCodes.OK).send({ success: true, details: receipt.contractAddress});
        }
        catch (error) {
            throw fastify.httpErrors.forbidden(`${error}`);
        }

    });

    fastify.post<{Body: {players: Competitor[]}}>("/broadcast", {preHandler: fastify.authenticate({})}, async(req, res) => {
        const {id} = req.user;
        try {
            const r: Competitor[] = req.body.players;

            for (let i = 0; i < r.length; i++)
            {
                if (r[i].id === id)
                    continue;
                const user = await UserModel.findByField("id", r[i].id);
                if (!user)
                    throw fastify.httpErrors.unauthorized("User Unfound");
                user.sendViaWs({ type: "Tn_start", wsTn_data: r[i]});
            }
            res.code(StatusCodes.OK).send({ success: true});
        }
        catch(error) {
            throw fastify.httpErrors.badRequest(`${error}`);
        }
    })

    fastify.get("/get-data", {preHandler: fastify.authenticate({})}, async (req, res) => {
        const Path = path.join(__dirname, "MyContract.json");
        const art = JSON.parse(fs.readFileSync(Path, "utf8"));
        const ABI = JSON.stringify(art.abi, null, 2);
        const Data: ContractAbi = art.abi;
        const contract = new web3.eth.Contract(Data, contractAddress);
        const name = await contract.methods.getAllScores().call();
        return res.code(StatusCodes.OK).send({success: true, details: name});
    });

    fastify.post<{Body: WsTournamentSession}>("/CreateT", {preHandler: fastify.authenticate({})}, async (req, res) => {
        const hostId = req.user.id;
        const key = `tournament:session:${hostId}`;

        const exist = await InvitationRedisModel.get(key);
        if (exist)
            return (res.code(StatusCodes.OK).send({success: true, details: exist}));

        const session: WsTournamentSession = {
            id: crypto.randomUUID(),
            hostId: hostId,
            players: [hostId],
            maxPlayers: 8,
            stateT: "inviting",
        }

        await InvitationRedisModel.set(key, session);
        return res.code(200).send({ success: true, details: session });
    })

    fastify.post<{Body: { invitedId: number }}>("/test", {schema: {body: TInvite}, preHandler: fastify.authenticate({})}, async (req, res) => {
        const InvitedeId = req.body.invitedId;
        const user = await UserModel.findByField("id", req.user.id);
        if (!user)
            throw fastify.httpErrors.unauthorized("You are not a valid user");
        const friend = await UserModel.findByField("id", InvitedeId);
        if (!friend || !await checkIfFriends(req.user.id, InvitedeId))
            throw fastify.httpErrors.forbidden("You can only invite your friends");
        if (!friend.isOnline())
            throw fastify.httpErrors.badRequest("You can't send an invitation to an offline friend");
        const InviteId = await InvitationRedisModel.incr();
        const InviteData: WsTournamentInvOut = {sentById: user.getId(), sentByUsername: user.username, InviteId: InviteId};
        await InvitationRedisModel.set(InviteId, {...InviteData});
        friend.sendViaWs({type: "TournInviteSent", wsTInvitation: InviteData});
        res.code(StatusCodes.OK).send(getSuccessMsg({message: "Tournament invitation sent successfully"}));
    })

    fastify.post<{Body: { resp: string, inviteId: number }}>("/action", {schema: {body: TResp}, preHandler:fastify.authenticate({})}, async (req, res) => {
        const {inviteId, resp} = req.body;
        const invitation = await InvitationRedisModel.get<SavedInvitation>(inviteId);
        if (!invitation)
            throw fastify.httpErrors.notFound("Invitation not found or expired");
        const user = await UserModel.findByField("id", req.user.id);
        user?.getSharableInfo
        InvitationRedisModel.delete(inviteId);
        if (!user)
            throw fastify.httpErrors.unauthorized("You are not a valid user");
        const friend = await UserModel.findByField("id", invitation.sentById);
        if (!friend)
            throw fastify.httpErrors.notFound("Couldn't find user who sent the request");
        if (resp === "accept")
        {
            friend.sendViaWs({type: "TournInviteAccept", wsInvitationAccept: user.getSharableInfo()});
            return (res.code(StatusCodes.OK)).send({success: true});
        }
        else if (resp === "reject")
        {
            const Reject : WsInvitationReject = {rejectedById: req.user.id, rejectedByUsername: user.username, invitationId: invitation.InviteId};
            friend.sendViaWs({type: "TournInviteReject", wsInvitationReject: Reject});
            return res.code(StatusCodes.OK).send({success: true});
        }
    } )
}
