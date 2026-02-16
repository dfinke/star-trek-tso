import * as readline from "node:readline";
import { GameObserver, GameState } from "../../core/model.js";

interface FrameLine {
    text: string;
}

export class GameScreenView implements GameObserver {
    private readonly logTailCount = 8;
    private lastFrameHeight = 0;

    update(eventName: string, _payload: unknown, gameState: GameState): void {
        if (eventName !== "RenderRequested") {
            return;
        }

        const frame = this.buildFrame(gameState);
        this.render(frame);
    }

    private buildFrame(gameState: GameState): FrameLine[] {
        const lines: FrameLine[] = [];

        lines.push({ text: "=".repeat(68) });
        lines.push({ text: "MAINFRAME TSO STAR TREK - COMMAND CONSOLE" });
        lines.push({ text: "=".repeat(68) });
        lines.push({ text: `STARDATE: ${gameState.stardate}   TURNS: ${gameState.turnsRemaining}   ALERT: ${gameState.ship.condition.alertLevel}` });
        lines.push({ text: `ENERGY: ${gameState.ship.energy}   SHIELDS: ${gameState.ship.shields}   TORPEDOES: ${gameState.ship.torpedoes}` });
        lines.push({ text: `POSITION: X=${gameState.ship.position.x}, Y=${gameState.ship.position.y}   HOSTILES: ${gameState.getAliveEnemyCount()}` });
        lines.push({ text: "=".repeat(68) });
        lines.push({ text: "SECTOR MAP (E=Enterprise, K=Klingon)" });

        for (let y = 1; y <= 8; y += 1) {
            const row: string[] = [];
            for (let x = 1; x <= 8; x += 1) {
                let symbol = ".";

                if (gameState.ship.position.x === x && gameState.ship.position.y === y) {
                    symbol = "E";
                }

                for (const k of gameState.currentQuadrant.getAliveKlingons()) {
                    if (k.position.x === x && k.position.y === y) {
                        symbol = "K";
                        break;
                    }
                }

                row.push(symbol);
            }

            lines.push({ text: `${row.join(" ")}  | ${y}` });
        }

        lines.push({ text: "1 2 3 4 5 6 7 8  | X-axis" });
        lines.push({ text: "" });
        lines.push({ text: "--- COMPUTER LOG ---" });

        const start = Math.max(0, gameState.messageLog.length - this.logTailCount);
        for (let i = 0; i < this.logTailCount; i += 1) {
            const index = start + i;
            const text = index < gameState.messageLog.length ? `- ${gameState.messageLog[index]}` : "";
            lines.push({ text });
        }

        lines.push({ text: "" });
        lines.push({ text: "Commands: NAV <x> <y>, PHA <energy>, TOR <x> <y>, SRS, STATUS, HELP, QUIT" });

        return lines;
    }

    private render(frame: FrameLine[]): void {
        if (!process.stdout.isTTY) {
            // Fallback for redirected output.
            process.stdout.write(`${frame.map((x) => x.text).join("\n")}\n`);
            return;
        }

        const width = Math.max(60, (process.stdout.columns ?? 120) - 1);

        readline.cursorTo(process.stdout, 0, 0);
        for (let row = 0; row < frame.length; row += 1) {
            readline.clearLine(process.stdout, 0);
            const text = frame[row]?.text ?? "";
            process.stdout.write(text.length > width ? text.slice(0, width) : text.padEnd(width, " "));
            if (row < frame.length - 1) {
                process.stdout.write("\n");
            }
        }

        for (let row = frame.length; row < this.lastFrameHeight; row += 1) {
            process.stdout.write("\n");
            readline.clearLine(process.stdout, 0);
            process.stdout.write(" ".repeat(width));
        }

        this.lastFrameHeight = frame.length;
        readline.cursorTo(process.stdout, 0, frame.length + 1);
    }
}
