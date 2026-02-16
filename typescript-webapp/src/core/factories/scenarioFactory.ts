import { GameState, Klingon, Position } from "../model";
import { IRandom } from "../random";

export class ScenarioFactory {
    static createDefaultGame(rng: IRandom): GameState {
        const game = new GameState();

        const enemyCount = 3;
        for (let i = 1; i <= enemyCount; i += 1) {
            let x = rng.nextInt(1, 9);
            let y = rng.nextInt(1, 9);

            if (x === game.ship.position.x && y === game.ship.position.y) {
                x = (x % 8) + 1;
            }

            const enemy = new Klingon(i, rng.nextInt(300, 550), new Position(x, y));
            game.currentQuadrant.klingons.push(enemy);
        }

        game.addMessage("Incoming transmission: Klingon vessels detected in this quadrant.");
        game.evaluateShipCondition();
        return game;
    }
}
