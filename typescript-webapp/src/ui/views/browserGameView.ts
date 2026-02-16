import { GameObserver, GameState, Klingon } from "../../core/model";

interface BrowserGameViewElements {
    statusBanner: HTMLElement;
    shipStats: HTMLElement;
    mapGrid: HTMLElement;
    log: HTMLElement;
    commandHelp: HTMLElement;
}

export class BrowserGameView implements GameObserver {
    private readonly logTailCount = 12;

    constructor(private readonly elements: BrowserGameViewElements) { }

    update(eventName: string, _payload: unknown, gameState: GameState): void {
        if (eventName !== "RenderRequested") {
            return;
        }

        this.render(gameState);
    }

    private render(gameState: GameState): void {
        this.elements.statusBanner.textContent =
            `STARDATE ${gameState.stardate}  •  TURNS ${gameState.turnsRemaining}  •  ALERT ${gameState.ship.condition.alertLevel}`;

        this.elements.shipStats.innerHTML = [
            `Energy: <strong>${gameState.ship.energy}</strong>`,
            `Shields: <strong>${gameState.ship.shields}</strong>`,
            `Torpedoes: <strong>${gameState.ship.torpedoes}</strong>`,
            `Position: <strong>X=${gameState.ship.position.x}, Y=${gameState.ship.position.y}</strong>`,
            `Hostiles: <strong>${gameState.getAliveEnemyCount()}</strong>`
        ].join("<span class=\"divider\">|</span>");

        this.renderMap(gameState);
        this.renderLog(gameState);

        this.elements.commandHelp.textContent = "Commands: NAV <x> <y>, PHA <energy>, TOR <x> <y>, SRS, STATUS, HELP, QUIT";
    }

    private renderMap(gameState: GameState): void {
        const aliveByPosition = new Map<string, Klingon>();
        for (const k of gameState.currentQuadrant.getAliveKlingons()) {
            aliveByPosition.set(`${k.position.x},${k.position.y}`, k);
        }

        this.elements.mapGrid.innerHTML = "";

        const topLeftCorner = document.createElement("div");
        topLeftCorner.className = "axis-label corner";
        topLeftCorner.textContent = "";
        this.elements.mapGrid.appendChild(topLeftCorner);

        for (let x = 1; x <= 8; x += 1) {
            const xAxis = document.createElement("div");
            xAxis.className = "axis-label x-axis";
            xAxis.textContent = `${x}`;
            xAxis.title = `X=${x}`;
            this.elements.mapGrid.appendChild(xAxis);
        }

        for (let y = 1; y <= 8; y += 1) {
            const yAxis = document.createElement("div");
            yAxis.className = "axis-label y-axis";
            yAxis.textContent = `${y}`;
            yAxis.title = `Y=${y}`;
            this.elements.mapGrid.appendChild(yAxis);

            for (let x = 1; x <= 8; x += 1) {
                const cell = document.createElement("div");
                cell.className = "sector-cell";

                const shipHere = gameState.ship.position.x === x && gameState.ship.position.y === y;
                const enemyHere = aliveByPosition.has(`${x},${y}`);

                if (shipHere) {
                    cell.classList.add("ship");
                    cell.textContent = "E";
                    cell.title = `Enterprise at ${x},${y}`;
                } else if (enemyHere) {
                    cell.classList.add("enemy");
                    cell.textContent = "K";
                    cell.title = `Klingon at ${x},${y}`;
                } else {
                    cell.textContent = "·";
                    cell.title = `Empty sector ${x},${y}`;
                }

                this.elements.mapGrid.appendChild(cell);
            }
        }
    }

    private renderLog(gameState: GameState): void {
        const start = Math.max(0, gameState.messageLog.length - this.logTailCount);
        const messages = gameState.messageLog.slice(start);

        if (messages.length === 0) {
            this.elements.log.innerHTML = "<li>Computer log empty.</li>";
            return;
        }

        this.elements.log.innerHTML = messages
            .map((message) => `<li>${this.escapeHtml(message)}</li>`)
            .join("");
    }

    private escapeHtml(text: string): string {
        return text
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }
}
