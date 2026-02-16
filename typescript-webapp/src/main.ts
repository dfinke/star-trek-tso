import "./styles.css";
import { GameController } from "./application/controllers/gameController";
import { AlertLevel } from "./core/model";
import { LcgRandom } from "./core/random";
import { ScenarioFactory } from "./core/factories/scenarioFactory";
import { BrowserGameView } from "./ui/views/browserGameView";

function getMissionOutcome(controller: GameController): string {
    const game = controller.gameState;

    if (game.ship.condition.alertLevel === AlertLevel.Destroyed) {
        return "MISSION FAILED: The Enterprise was lost.";
    }

    if (game.getAliveEnemyCount() === 0) {
        return "MISSION SUCCESS: Enemy ships destroyed.";
    }

    if (controller.shouldQuit) {
        return "Simulation terminated by command.";
    }

    return "MISSION FAILED: Stardate limit exceeded.";
}

function bootstrap(): void {
    const app = document.querySelector<HTMLDivElement>("#app");
    if (!app) {
        throw new Error("Missing #app host element.");
    }

    app.innerHTML = `
        <main class="shell">
            <header>
                <h1>Mainframe TSO Star Trek</h1>
                <p class="subtitle">TypeScript Web Command Console</p>
                <div id="status-banner" class="status-banner"></div>
            </header>

            <section class="panel ship-panel">
                <h2>Ship Telemetry</h2>
                <div id="ship-stats" class="ship-stats"></div>
            </section>

            <section class="panel grid-panel">
                <h2>Sector Map (8×8)</h2>
                <div id="map-grid" class="map-grid" aria-label="Sector map"></div>
            </section>

            <section class="panel log-panel">
                <h2>Computer Log</h2>
                <ul id="message-log" class="message-log"></ul>
                <p id="command-help" class="command-help"></p>
            </section>

            <section class="panel command-panel">
                <h2>Command Input</h2>
                <form id="command-form" class="command-form">
                    <input id="command-input" autocomplete="off" placeholder="Enter command (HELP for list)" />
                    <button type="submit">Execute</button>
                </form>
                <p id="mission-outcome" class="mission-outcome"></p>
            </section>
        </main>
    `;

    const statusBanner = document.querySelector<HTMLElement>("#status-banner");
    const shipStats = document.querySelector<HTMLElement>("#ship-stats");
    const mapGrid = document.querySelector<HTMLElement>("#map-grid");
    const messageLog = document.querySelector<HTMLElement>("#message-log");
    const commandHelp = document.querySelector<HTMLElement>("#command-help");
    const commandForm = document.querySelector<HTMLFormElement>("#command-form");
    const commandInput = document.querySelector<HTMLInputElement>("#command-input");
    const missionOutcome = document.querySelector<HTMLElement>("#mission-outcome");

    if (!statusBanner || !shipStats || !mapGrid || !messageLog || !commandHelp || !commandForm || !commandInput || !missionOutcome) {
        throw new Error("UI initialization failed: missing required elements.");
    }

    const rng = new LcgRandom();
    const game = ScenarioFactory.createDefaultGame(rng);
    const controller = new GameController(game, rng);
    const commandHistory: string[] = [];
    let historyIndex = -1;

    const view = new BrowserGameView({
        statusBanner,
        shipStats,
        mapGrid,
        log: messageLog,
        commandHelp
    });

    game.addObserver(view);
    game.notify("RenderRequested", "INITIAL");

    commandInput.focus();

    commandInput.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowUp") {
            return;
        }

        if (commandHistory.length === 0) {
            return;
        }

        event.preventDefault();

        if (historyIndex <= 0) {
            historyIndex = 0;
        } else {
            historyIndex -= 1;
        }

        commandInput.value = commandHistory[historyIndex] ?? "";
        commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
    });

    commandForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const inputLine = commandInput.value.trim();
        if (!inputLine) {
            return;
        }

        commandHistory.push(inputLine);
        historyIndex = commandHistory.length;

        commandInput.value = "";
        controller.dispatch(inputLine);

        if (!controller.canContinue()) {
            commandInput.disabled = true;
            const button = commandForm.querySelector<HTMLButtonElement>("button[type='submit']");
            if (button) {
                button.disabled = true;
            }

            missionOutcome.textContent = getMissionOutcome(controller);
        }
    });
}

bootstrap();
