import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { AlertLevel } from "./core/model.js";
import { LcgRandom } from "./core/random.js";
import { ScenarioFactory } from "./core/factories/scenarioFactory.js";
import { GameController } from "./application/controllers/gameController.js";
import { GameScreenView } from "./ui/views/gameScreenView.js";

async function main(): Promise<void> {
    const rng = new LcgRandom();
    const game = ScenarioFactory.createDefaultGame(rng);
    const controller = new GameController(game, rng);
    const view = new GameScreenView();

    game.addObserver(view);
    game.notify("RenderRequested", "INITIAL");

    const rl = createInterface({ input, output });

    try {
        while (controller.canContinue()) {
            const inputLine = await rl.question("COMMAND (HELP for list) ");
            controller.dispatch(inputLine);
        }
    } finally {
        rl.close();
    }

    if (game.ship.condition.alertLevel === AlertLevel.Destroyed) {
        console.log("MISSION FAILED: The Enterprise was lost.");
    } else if (game.getAliveEnemyCount() === 0) {
        console.log("MISSION SUCCESS: Enemy ships destroyed.");
    } else if (controller.shouldQuit) {
        console.log("Simulation terminated by command.");
    } else {
        console.log("MISSION FAILED: Stardate limit exceeded.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
