import {IGamepad} from "../interfaces.ts";

interface IKeyEvent {
    keyCode: number
    type: string
    preventDefault: ()=>void
}

export default class GameBoyAdvanceKeypad {
    KEYCODE_LEFT = 37
        KEYCODE_UP = 38
        KEYCODE_RIGHT = 39
        KEYCODE_DOWN = 40
        KEYCODE_START = 13
        KEYCODE_SELECT = 220
        KEYCODE_A = 90
        KEYCODE_B = 88
        KEYCODE_L = 65
        KEYCODE_R = 83

        GAMEPAD_LEFT = 14
        GAMEPAD_UP = 12
        GAMEPAD_RIGHT = 15
        GAMEPAD_DOWN = 13
        GAMEPAD_START = 9
        GAMEPAD_SELECT = 8
        GAMEPAD_A = 1
        GAMEPAD_B = 0
        GAMEPAD_L = 4
        GAMEPAD_R = 5
        GAMEPAD_THRESHOLD = 0.2

        A = 0
        B = 1
        SELECT = 2
        START = 3
        RIGHT = 4
        LEFT = 5
        UP = 6
        DOWN = 7
        R = 8
        L = 9

        currentDown: number
        eatInput: boolean
        gamepads: IGamepad[]

    constructor() {
        

        this.currentDown = 0x03FF;
        this.eatInput = false;

        this.gamepads = [];
    }

    keyboardHandler(e: IKeyEvent): void {
        let toggle = 0;
        switch (e.keyCode) {
            case this.KEYCODE_START:
                toggle = this.START;
                break;
            case this.KEYCODE_SELECT:
                toggle = this.SELECT;
                break;
            case this.KEYCODE_A:
                toggle = this.A;
                break;
            case this.KEYCODE_B:
                toggle = this.B;
                break;
            case this.KEYCODE_L:
                toggle = this.L;
                break;
            case this.KEYCODE_R:
                toggle = this.R;
                break;
            case this.KEYCODE_UP:
                toggle = this.UP;
                break;
            case this.KEYCODE_RIGHT:
                toggle = this.RIGHT;
                break;
            case this.KEYCODE_DOWN:
                toggle = this.DOWN;
                break;
            case this.KEYCODE_LEFT:
                toggle = this.LEFT;
                break;
            default:
                return;
        }

        toggle = 1 << toggle;
        if (e.type == "keydown") {
            this.currentDown &= ~toggle;
        } else {
            this.currentDown |= toggle;
        }

        if (this.eatInput) {
            e.preventDefault();
        }
    }


    gamepadHandler(gamepad: IGamepad): void {
        let value = 0;
        if (gamepad.buttons[this.GAMEPAD_LEFT] > this.GAMEPAD_THRESHOLD) {
            value |= 1 << this.LEFT;
        }
        if (gamepad.buttons[this.GAMEPAD_UP] > this.GAMEPAD_THRESHOLD) {
            value |= 1 << this.UP;
        }
        if (gamepad.buttons[this.GAMEPAD_RIGHT] > this.GAMEPAD_THRESHOLD) {
            value |= 1 << this.RIGHT;
        }
        if (gamepad.buttons[this.GAMEPAD_DOWN] > this.GAMEPAD_THRESHOLD) {
            value |= 1 << this.DOWN;
        }
        if (gamepad.buttons[this.GAMEPAD_START] > this.GAMEPAD_THRESHOLD) {
            value |= 1 << this.START;
        }
        if (gamepad.buttons[this.GAMEPAD_SELECT] > this.GAMEPAD_THRESHOLD) {
            value |= 1 << this.SELECT;
        }
        if (gamepad.buttons[this.GAMEPAD_A] > this.GAMEPAD_THRESHOLD) {
            value |= 1 << this.A;
        }
        if (gamepad.buttons[this.GAMEPAD_B] > this.GAMEPAD_THRESHOLD) {
            value |= 1 << this.B;
        }
        if (gamepad.buttons[this.GAMEPAD_L] > this.GAMEPAD_THRESHOLD) {
            value |= 1 << this.L;
        }
        if (gamepad.buttons[this.GAMEPAD_R] > this.GAMEPAD_THRESHOLD) {
            value |= 1 << this.R;
        }

        this.currentDown = ~value & 0x3FF;
    }

    /**
     * 
     * @param gamepad 
     */
    gamepadConnectHandler(gamepad: IGamepad): void {
        this.gamepads.push(gamepad);
    }

    /**
     * 
     * @param gamepad 
     */
    gamepadDisconnectHandler(gamepad: IGamepad): void {
        this.gamepads = this.gamepads.filter( (other: IGamepad) => other != gamepad );
    }

    /**
     * 
     */
    pollGamepads(): void {
        let navigatorList = [];

        // @ts-ignore
        if (navigator.webkitGetGamepads) {
            // @ts-ignore
            navigatorList = navigator.webkitGetGamepads();
            // @ts-ignore
        } else if (navigator.getGamepads) {
            // @ts-ignore
            navigatorList = navigator.getGamepads();
        }

        // Let's all give a shout out to Chrome for making us get the gamepads EVERY FRAME
        if (navigatorList.length) {
            this.gamepads = [];
        }
        for (var i = 0; i < navigatorList.length; ++i) {
            if (navigatorList[i]) {
                this.gamepads.push(navigatorList[i]);
            }
        }
        if (this.gamepads.length > 0) {
            this.gamepadHandler(this.gamepads[0]);
        }

    }

    /**
     * 
     */
    registerHandlers(): void {
        // @ts-ignore
        window.addEventListener("keydown", this.keyboardHandler.bind(this), true);

        // @ts-ignore
        window.addEventListener("keyup", this.keyboardHandler.bind(this), true);

        // @ts-ignore
        window.addEventListener("gamepadconnected", this.gamepadConnectHandler.bind(this), true);
        // @ts-ignore
        window.addEventListener("mozgamepadconnected", this.gamepadConnectHandler.bind(this), true);
        // @ts-ignore
        window.addEventListener("webkitgamepadconnected", this.gamepadConnectHandler.bind(this), true);

        // @ts-ignore
        window.addEventListener("gamepaddisconnected", this.gamepadDisconnectHandler.bind(this), true);
        // @ts-ignore
        window.addEventListener("mozgamepaddisconnected", this.gamepadDisconnectHandler.bind(this), true);
        // @ts-ignore
        window.addEventListener("webkitgamepaddisconnected", this.gamepadDisconnectHandler.bind(this), true);
    }

}
