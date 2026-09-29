import UserModel, { User } from "../database/user/user.db";
import MatchModel from "../database/game/match.db";
import { GameScoreInfo, GameEndInfo, GameMode, WsDataOut, WebsocketService } from "../helpers/wsUtils";
import { getSuccessMsg } from "../helpers/utils";
import { addXp } from "../routes/user/level/level";
import { UserSharableInfo } from "../database/user/user.db";
import fastify from "../init";


export type GameState = {
    ballPos: Vector;
    paddlesPos: PaddleObj;
}

type AcceptatbleKeys = "ArrowUp" | "ArrowDown";

type Dimensions = {
    width: number;
    height: number;
  };

  type Vector = {
    x: number;
    y: number;
  };


  type PaddleObj = {
    left: number;
    right: number;
  }

type MatchState = "init" | "running" | "normal_pause_left" | "normal_pause_right" | "waiting_for_left" | "waiting_for_right" | "finished";

export type PlayerGameState = {
    matchState: MatchState;
    matchId: number;
    vsPlayer: UserSharableInfo;
    myScore: number;
    vsPlayerScore: number;
    myDirection: "left" | "right";
    additionalInfo?: {
        remainingPause?: number;
    }
}

// Other user quit game while waiting for control?

export class MatchManager {
    static currentMatches: Partial<Record<number, MatchManager>> = {};

    private static currentPlayers: Partial<Record<number, number>> = {}; // UserID / MatchId
    private static worldDims: Dimensions = { width: 200, height: 100 };
    private static paddleDims: Dimensions = { width: 1, height: 20 };
    private static ballRadius = 2;
    private static targetPoints = 6;
    private static refreshRate = 1000 / 30;
    private static paddleSpeed = 3;  // units per frame
    private static defaultTimeout = 10000;

    private state: MatchState;
    private match: MatchModel;
    private leftPlayer: UserModel;
    private rightPlayer: UserModel;
    private playerActions: { leftPlayer: Record<AcceptatbleKeys, boolean>,
                            rightPlayer: Record<AcceptatbleKeys, boolean> };
    private playerScores: GameScoreInfo;
    private playerSocketIds : {left: number, right: number};
    private ballPos: Vector;
    private ballVelocity: Vector;
    private paddlesPos: PaddleObj;
    private paddleTouch: number;
    private mode: GameMode;
    private timer: NodeJS.Timeout | null;
    private pauseStartTime: number | null;




    constructor(match: MatchModel, leftPlayer: UserModel, rightPlayer: UserModel, mode: GameMode, leftId?: number, rightId?: number) {
        this.match = match;
        this.leftPlayer = leftPlayer;
        this.rightPlayer = rightPlayer;
        this.playerActions = {
            leftPlayer: { ArrowUp: false, ArrowDown: false },
            rightPlayer: { ArrowUp: false, ArrowDown: false }
        };
        this.playerScores = {leftScore: 0, rightScore: 0};
        this.ballPos = { x: MatchManager.worldDims.width / 2, y: MatchManager.worldDims.height / 2 };
        this.ballVelocity = { x: 1.5, y: 1.5 };
        this.paddlesPos = {
            left: MatchManager.worldDims.height / 2,
            right: MatchManager.worldDims.height / 2
        };
        this.timer = null;
        this.paddleTouch = 0;
        this.mode = mode;
        this.state = "init";
        this.pauseStartTime = null;
        MatchManager.currentMatches[match.getId()] = this;
        MatchManager.currentPlayers[this.leftPlayer.getId()] = match.getId();
        MatchManager.currentPlayers[this.rightPlayer.getId()] = match.getId();
        if (leftId && rightId)
            this.playerSocketIds = {left: leftId, right: rightId};
        else
            this.playerSocketIds = {left: -1, right: -1};
    }

    private static isAcceptableKey(key: string): key is AcceptatbleKeys {
        return key === "ArrowUp" || key === "ArrowDown";
    }

    private finish() {
        this.state = "finished";
        delete MatchManager.currentMatches[this.match.getId()];
        delete MatchManager.currentPlayers[this.leftPlayer.getId()];
        delete MatchManager.currentPlayers[this.rightPlayer.getId()];
        if (this.timer) clearTimeout(this.timer);
    }

    private async finalizeMatchState(winner?: "left" | "right") {
        this.leftPlayer.game_state = "idle";
        await this.leftPlayer.save();
        this.rightPlayer.game_state = "idle";
        await this.rightPlayer.save();
        this.match.score_player1 = this.playerScores.leftScore;
        this.match.score_player2 = this.playerScores.rightScore;
        switch(winner) {
            case "left":
                this.match.winner_id = this.leftPlayer.getId();
                addXp(this.leftPlayer.getId());
                break;
            case "right":
                this.match.winner_id = this.rightPlayer.getId();
                addXp(this.rightPlayer.getId());
                break;
        }
        await this.match.save();
    }

    private async endGameByWin(winner: "left" | "right") {

        const winData: WsDataOut = {type: "game_end", gameEndInfo: {normalEnd: true, details: {winner: true, message: "You reached the target points"}}};
        const loseData: WsDataOut = {type: "game_end", gameEndInfo: {normalEnd: true, details: {winner: false, message: "Your openenent has scored"}}};
        this.finish();
        await this.finalizeMatchState(winner);

        switch(winner) {
            case "left":
                this.leftPlayer.sendViaWs(winData);
                this.rightPlayer.sendViaWs(loseData);
                return;
            case "right":
                this.rightPlayer.sendViaWs(winData);
                this.leftPlayer.sendViaWs(loseData);
                return;
        }
    }

    private promotePlayer(player: "left" | "right") {
        const startTime = Date.now();

        switch (player) {
            case "left":
                this.leftPlayer.sendViaWs({type: "game_ask_control", gamePauseInfo: {startTime, duration: MatchManager.defaultTimeout}});
                this.rightPlayer.sendViaWs({type: "game_pause", gamePauseInfo: {startTime, duration: MatchManager.defaultTimeout}});
                this.pause("waiting_for_left");
            case "right":
                this.rightPlayer.sendViaWs({type: "game_ask_control", gamePauseInfo: {startTime, duration: MatchManager.defaultTimeout}});
                this.leftPlayer.sendViaWs({type: "game_pause", gamePauseInfo: {startTime, duration: MatchManager.defaultTimeout}});
                this.pause("waiting_for_right");
        }
    }

    private async updateOrPromote(data: WsDataOut) {
        const [leftRes, rightRes] = await Promise.allSettled([
            this.leftPlayer.sendViaWs(data, {ignoreOffline: false}),
            this.rightPlayer.sendViaWs(data, {ignoreOffline: false})
        ]);


        if (leftRes.status === "fulfilled" && rightRes.status === "fulfilled") {
            if (!WebsocketService.isWsAlive(this.playerSocketIds.left)) {
                this.promotePlayer("left");
                return;
            }

            if (!WebsocketService.isWsAlive(this.playerSocketIds.right)) {
                const startTime = Date.now();
                this.promotePlayer("right");
                return;
            }
            return;

        }
        // Game Updates failed completly, there is no fallback, game must end
        this.finish();
        if (leftRes.status === "rejected" && rightRes.status === "rejected") {
            if (this.playerScores.leftScore == this.playerScores.rightScore)
                await this.finalizeMatchState();
            else
                await this.finalizeMatchState(this.playerScores.leftScore > this.playerScores.rightScore ? "left" : "right");
            return ;
        }
        const gameEndInfo: GameEndInfo = { normalEnd: false, details: {winner: true, message: "Other player disconnected"}};
        if (leftRes.status === "fulfilled") {
            this.leftPlayer.sendViaWs({type: "game_end", gameEndInfo});
            await this.finalizeMatchState("left");
        }
        else {
            this.rightPlayer.sendViaWs({type: "game_end", gameEndInfo});
            await this.finalizeMatchState("right");
        }
    }



    private applyActions() {
        if (this.playerActions.leftPlayer["ArrowUp"])
            this.paddlesPos.left = Math.max(0, this.paddlesPos.left - MatchManager.paddleSpeed);
        if (this.playerActions.leftPlayer["ArrowDown"])
            this.paddlesPos.left = Math.min(MatchManager.worldDims.height - MatchManager.paddleDims.height, this.paddlesPos.left + MatchManager.paddleSpeed);


        if (this.playerActions.rightPlayer["ArrowUp"])
            this.paddlesPos.right = Math.max(0, this.paddlesPos.right - MatchManager.paddleSpeed);
        if (this.playerActions.rightPlayer["ArrowDown"])
            this.paddlesPos.right = Math.min(MatchManager.worldDims.height - MatchManager.paddleDims.height, this.paddlesPos.right + MatchManager.paddleSpeed);

        // if (this.playerActions.leftPlayer["ArrowUp"]) this.paddlesPos.left -= MatchManager.paddleSpeed;
        // if (this.playerActions.leftPlayer["ArrowDown"]) this.paddlesPos.left += MatchManager.paddleSpeed;

        // if (this.playerActions.rightPlayer["ArrowUp"]) this.paddlesPos.right -= MatchManager.paddleSpeed;
        // if (this.playerActions.rightPlayer["ArrowDown"]) this.paddlesPos.right += MatchManager.paddleSpeed;

        // this.paddlesPos.left = Math.max(0, Math.min(this.paddlesPos.left, MatchManager.worldDims.height - MatchManager.paddleDims.height));
        // this.paddlesPos.right = Math.max(0, Math.min(this.paddlesPos.right, MatchManager.worldDims.height - MatchManager.paddleDims.height ));
    }

    private checkCollision(): boolean {
        const goingLeft = this.ballVelocity.x < 0;
        const paddleY = goingLeft ? this.paddlesPos.left : this.paddlesPos.right;
        const paddleX = goingLeft ? 0 : MatchManager.worldDims.width - MatchManager.paddleDims.width;

        const withinPaddleY =
            this.ballPos.y + MatchManager.ballRadius >= paddleY &&
            this.ballPos.y - MatchManager.ballRadius <= paddleY + MatchManager.paddleDims.height;

        const withinPaddleX = goingLeft
            ? this.ballPos.x - MatchManager.ballRadius <= paddleX + MatchManager.paddleDims.width
            : this.ballPos.x + MatchManager.ballRadius >= paddleX;

        return withinPaddleY && withinPaddleX;
    }

    private updateScores(player: "left" | "right") {
        switch(player) {
            case "left":
                this.playerScores.leftScore += 1;
                break;
            case "right":
                this.playerScores.rightScore += 1;
                break;
        }
        if (this.playerScores.leftScore == MatchManager.targetPoints) {
            this.endGameByWin("left");
            return;
        }
        if (this.playerScores.rightScore == MatchManager.targetPoints) {
            this.endGameByWin("right");
            return;
        }

        this.updateOrPromote({type: "game_score", score: this.playerScores });
    }

    private setBallPosition() {
        let newBallX = this.ballPos.x + this.ballVelocity.x;
        let newBallY = this.ballPos.y + this.ballVelocity.y;

        if (newBallX < 0 || newBallX > MatchManager.worldDims.width) {
            this.updateScores(newBallX < 0 ? "right" : "left");
            this.ballPos.x = MatchManager.worldDims.width / 2;
            this.ballPos.y = MatchManager.worldDims.height / 2;
            return;
        }

        if (this.checkCollision()) {
            this.ballVelocity.x *= -1;
        } else if (newBallY - MatchManager.ballRadius < 0) {
            this.ballVelocity.y *= -1;
            newBallY = MatchManager.ballRadius + 1;
        } else if (newBallY + MatchManager.ballRadius > MatchManager.worldDims.height) {
            this.ballVelocity.y *= -1;
            newBallY = MatchManager.worldDims.height - MatchManager.ballRadius - 1;
        }

        this.ballPos = { x: newBallX, y: newBallY };

    }

    private async update() {
        if (this.state != "running") return;
        this.applyActions();
        this.setBallPosition();
        const gameState: GameState = { ballPos: this.ballPos, paddlesPos: this.paddlesPos };
        this.updateOrPromote({type: "game_event", gameState});
        this.timer = setTimeout(() => this.update(), MatchManager.refreshRate);
    }

    private pause(nextState: MatchState, timeout = MatchManager.defaultTimeout) {
        if (nextState == "running")
            throw new Error("Can't pause and run at the same time");
        this.state = nextState;
        if (this.timer) clearTimeout(this.timer);

        const normalPause = async () => {
            const leftConnected = this.leftPlayer.isOnline();
            const rightConnected = this.rightPlayer.isOnline();
            if (!leftConnected && !rightConnected) {
                this.finish();
                await this.finalizeMatchState(this.playerScores.leftScore > this.playerScores.rightScore ? "left" : "right");
                return;
            }
            if (!leftConnected) {
                this.endGameByWin("right");
                return;
            }
            if (!rightConnected) {
                this.endGameByWin("left");
                return;
            }
            this.state = "running";
            this.leftPlayer.sendViaWs({type: "game_continue"});
            this.rightPlayer.sendViaWs({type: "game_continue"});
            this.pauseStartTime = null;
            this.update();
        }

        const waitForControlPause = () => {
            switch (this.state) {
                case "running": {
                    this.pauseStartTime = null;
                    return;
                }
                case "waiting_for_left":
                    this.endGameByWin("right");
                    return;
                case "waiting_for_right":
                    this.endGameByWin("left");
                    return;
            }
        }

        this.pauseStartTime = Date.now();
        if (this.state == "normal_pause_left" || this.state == "normal_pause_right")
            this.timer = setTimeout(normalPause, timeout);
        else
            this.timer = setTimeout(waitForControlPause, timeout);
    }

    // this needs to be re-modeled to match the code's structure
    private async notifyStart() {
        const leftWsEntries = this.leftPlayer.getWs();
        const rightWsEntries = this.rightPlayer.getWs();

        if (!leftWsEntries || !rightWsEntries)
            throw new Error("Someone is offline");

        let leftControlId = this.playerSocketIds.left ?? -1;
        let rightControlId = this.playerSocketIds.right ?? -1;

        let leftControlGiven = false;
        let rightControlGiven = false;

        for (const entry of leftWsEntries) {
            const ws = entry.ws;
            if (ws.readyState !== ws.OPEN) continue;

            if (!leftControlGiven && (leftControlId == -1 || !WebsocketService.hasWs(this.leftPlayer.getId(), leftControlId))) {
                leftControlId = entry.id;
                leftControlGiven = true;
            }

            const startLeft: WsDataOut = {
                type: "game_start",
                gameStartInfo: {
                    against: this.rightPlayer.getSharableInfo(),
                    isControl: entry.id === leftControlId,
                    myDirection: "left",
                    mode: this.mode,
                    matchId: this.match.getId()
                }
            };
            ws.send(JSON.stringify(getSuccessMsg(startLeft)));
        }

        //RIGHT PLAYER LOOP
        for (const entry of rightWsEntries) {
            const ws = entry.ws;
            if (ws.readyState !== ws.OPEN) continue;

            if (!rightControlGiven && (rightControlId == -1 || !WebsocketService.hasWs(this.rightPlayer.getId(), rightControlId))) {
                rightControlId = entry.id;
                rightControlGiven = true;
            }

            const startRight: WsDataOut = {
                type: "game_start",
                gameStartInfo: {
                    against: this.leftPlayer.getSharableInfo(),
                    isControl: entry.id === rightControlId,
                    myDirection: "right",
                    mode: this.mode,
                    matchId: this.match.getId()
                }
            };
            ws.send(JSON.stringify(getSuccessMsg(startRight)));
        }


        if (leftControlId === -1 || rightControlId === -1)
            throw new Error("Could not assign control — both players must have at least one open connection");
        this.state = "running";
        this.playerSocketIds = { left: leftControlId, right: rightControlId };
    }

    public manageAction(playerId: number, key: string, action: "up" | "down", socketId: number) {
        if (!MatchManager.isAcceptableKey(key)) return;
        const setAs = action === "down";
        switch (playerId) {
            case this.match.player1_id:
                if (this.playerSocketIds.left != socketId)
                    return;
                this.playerActions.leftPlayer[key] = setAs;
                break;
            case this.match.player2_id:
                if (this.playerSocketIds.right != socketId)
                    return;
                this.playerActions.rightPlayer[key] = setAs;
                break;
            default:
                throw new Error("Invalid player id in manageAction");
        }
    }

    public async start() {
        await this.notifyStart();
        this.update();
    }

    private static findAuthorizedMatchManager(id: number, matchId: number, socketId: number) {
        const matchManager = MatchManager.currentMatches[matchId];
        if (!matchManager
                || (matchManager.rightPlayer.getId() != id && matchManager.leftPlayer.getId() != id)
                || (matchManager.playerSocketIds.left != socketId && matchManager.playerSocketIds.right != socketId))
            return null;
        return matchManager;
    }

    // Match control static functions, find the match then act on it
    static async endGameByRequest(id:number, matchId: number, socketId: number) {
        const matchManager = this.findAuthorizedMatchManager(id, matchId, socketId);
        if (!matchManager)
            return;
        matchManager.finish();
        switch (id) {
            case matchManager.leftPlayer.getId():
                matchManager.rightPlayer.sendViaWs({type: "game_end", gameEndInfo: {
                    normalEnd: true,
                    details: {winner: true, message: "Other player ended the game"}}
                });
                await matchManager.finalizeMatchState("right");
                break;
            case matchManager.rightPlayer.getId():
                matchManager.leftPlayer.sendViaWs({type: "game_end", gameEndInfo: {
                    normalEnd: true,
                    details: {winner: true, message: "Other player ended the game"}}
                });
                await matchManager.finalizeMatchState("left");
                break;
        }
    }


    static pauseMatch(id: number, matchId: number, socketId: number) {
        const matchManager = this.findAuthorizedMatchManager(id, matchId, socketId);
        if (!matchManager)
            return;
        if (matchManager.state == "running") {
            // we cant await for sending to players here to maintain an accurate startTime between all sessions :)
            matchManager.leftPlayer.sendViaWs({type: "game_pause", gamePauseInfo: {startTime: Date.now(), duration: this.defaultTimeout, isSelfPaused: matchManager.leftPlayer.getId() === id }});
            matchManager.rightPlayer.sendViaWs({type: "game_pause", gamePauseInfo: {startTime: Date.now(), duration: this.defaultTimeout, isSelfPaused: matchManager.rightPlayer.getId() === id}});
            matchManager.pause(id === matchManager.leftPlayer.getId() ? "normal_pause_left" : "normal_pause_right");
        }
    }

    // non pauser could resume the game!!!!
    static async continueMatch(id: number, matchId: number, socketId: number) {
        const matchManager = this.findAuthorizedMatchManager(id, matchId, socketId);
        if (!matchManager)
            return;
        if (matchManager.state != "normal_pause_left" && matchManager.state != "normal_pause_right")
            return;
        if (matchManager.state == "normal_pause_left" && id != matchManager.leftPlayer.getId())
            return;
        if (matchManager.state == "normal_pause_right" && id != matchManager.rightPlayer.getId())
            return;

        if (matchManager.timer) clearTimeout(matchManager.timer);
        matchManager.state = "running";
        await matchManager.leftPlayer.sendViaWs({type: "game_continue"});
        await matchManager.rightPlayer.sendViaWs({type: "game_continue"});
        matchManager.update();
    }

    static async takeControl(id: number, matchId: number, socketId: number) {
        const matchManager = MatchManager.currentMatches[matchId];
        if (!matchManager || (matchManager.rightPlayer.getId() != id && matchManager.leftPlayer.getId() != id))
            return;
        switch (id) {
            case matchManager.rightPlayer.getId():
                if (matchManager.state != "waiting_for_right")
                    return;
                matchManager.playerSocketIds.right = socketId;
                if (matchManager.timer) clearTimeout(matchManager.timer);
                matchManager.state = "running";
                await matchManager.leftPlayer.sendViaWs({type: "game_continue"});
                await matchManager.rightPlayer.sendViaWs({type: "game_continue"});
                matchManager.update();
                break;
            case matchManager.leftPlayer.getId():
                if (matchManager.state != "waiting_for_left")
                    return;
                matchManager.playerSocketIds.left = socketId;
                if (matchManager.timer) clearTimeout(matchManager.timer);
                matchManager.state = "running";
                await matchManager.leftPlayer.sendViaWs({type: "game_continue"});
                await matchManager.rightPlayer.sendViaWs({type: "game_continue"});
                matchManager.update();
                break;
        }
    }

    static async promoteIfPaused(id: number, leftWsId: number) {
        const matchId = this.currentPlayers[id];
        if (!matchId)
            return;
        const matchManager = this.currentMatches[matchId];
        if (!matchManager || (matchManager.state != "normal_pause_left" && matchManager.state != "normal_pause_right"))
            return;
        switch (leftWsId) {
            case matchManager.playerSocketIds.left:
                await matchManager.leftPlayer.sendViaWs({type: "game_continue"});
                await matchManager.rightPlayer.sendViaWs({type: "game_continue"});
                matchManager.promotePlayer("left");
                break;
            case matchManager.playerSocketIds.right:
                await matchManager.leftPlayer.sendViaWs({type: "game_continue"});
                await matchManager.rightPlayer.sendViaWs({type: "game_continue"});
                matchManager.promotePlayer("right");
                break;
        }

    }


    static cleanUpPlayer(id: number) {
        const matchId = this.currentPlayers[id];
        if (!matchId)
            return;
        const matchManager = this.currentMatches[matchId];
        if (!matchManager)
            return;
        switch (id) {
            case matchManager.leftPlayer.getId():
                matchManager.endGameByWin("right");
                break;
            case matchManager.rightPlayer.getId():
                matchManager.endGameByWin("left");
                break;
        }
    }

    static async getGameState(id: number): Promise<PlayerGameState | null> {
        const matchId = MatchManager.currentPlayers[id];
        if (!matchId) {
            return null;
        }
        const matchManager = this.currentMatches[matchId];
        if (!matchManager || matchManager.state === "finished") {
            return null;
        }
        const isLeftPlayer = id === matchManager.leftPlayer.getId();

        const myScore = isLeftPlayer ? matchManager.playerScores.leftScore : matchManager.playerScores.rightScore;
        const vsPlayerScore = isLeftPlayer ? matchManager.playerScores.rightScore : matchManager.playerScores.leftScore;


        let state: PlayerGameState = {
            matchState: matchManager.state,
            matchId,
            vsPlayer:id == matchManager.leftPlayer.getId() ?
                            matchManager.rightPlayer.getSharableInfo() :
                            matchManager.leftPlayer.getSharableInfo(),
            myScore,
            vsPlayerScore,
            myDirection: isLeftPlayer ? "left" : "right"
        }
        if ((matchManager.state == "normal_pause_left"
                || matchManager.state == "normal_pause_right"
                || matchManager.state == "waiting_for_left"
                || matchManager.state == "waiting_for_right")
            && matchManager.pauseStartTime != null) {
            state = {...state, additionalInfo: {remainingPause: MatchManager.defaultTimeout - (Date.now() - matchManager.pauseStartTime)}};
        }
        return state;
    }
}
