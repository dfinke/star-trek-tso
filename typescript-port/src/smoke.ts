import { GameController } from "./application/controllers/gameController.js";
import { ScenarioFactory } from "./core/factories/scenarioFactory.js";
import { LcgRandom } from "./core/random.js";

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(message);
    }
}

function findSafeAdjacentMove(shipX: number, shipY: number, occupied: Set<string>): { x: number; y: number } {
    const candidates = [
        { x: shipX + 1, y: shipY },
        { x: shipX - 1, y: shipY },
        { x: shipX, y: shipY + 1 },
        { x: shipX, y: shipY - 1 }
    ];

    for (const candidate of candidates) {
        if (
            candidate.x >= 1 &&
            candidate.x <= 8 &&
            candidate.y >= 1 &&
            candidate.y <= 8 &&
            !occupied.has(`${candidate.x},${candidate.y}`)
        ) {
            return candidate;
        }
    }

    throw new Error("Unable to find a safe adjacent NAV destination for smoke test.");
}

function runSmoke(): void {
    const rng = new LcgRandom(42);
    const game = ScenarioFactory.createDefaultGame(rng);
    const controller = new GameController(game, rng);

    controller.dispatch("STATUS");

    const occupied = new Set<string>();
    for (const enemy of game.currentQuadrant.getAliveKlingons()) {
        occupied.add(`${enemy.position.x},${enemy.position.y}`);
    }

    const shipX = game.ship.position.x;
    const shipY = game.ship.position.y;
    const targetMove = findSafeAdjacentMove(shipX, shipY, occupied);

    const energyBeforeNav = game.ship.energy;
    const turnsBeforeNav = game.turnsRemaining;
    controller.dispatch(`NAV ${targetMove.x} ${targetMove.y}`);

    assert(game.ship.position.x === targetMove.x && game.ship.position.y === targetMove.y, "Expected ship position to change after NAV.");
    assert(game.ship.energy < energyBeforeNav, "Expected energy to decrease after NAV.");
    assert(game.turnsRemaining === turnsBeforeNav - 1, "Expected turn count to decrease after successful NAV.");

    const torpedoesBefore = game.ship.torpedoes;
    const turnsBeforeTor = game.turnsRemaining;
    const enemiesBeforeTor = game.getAliveEnemyCount();
    const targetEnemy = game.currentQuadrant.getAliveKlingons()[0];
    if (!targetEnemy) {
        throw new Error("Expected at least one enemy for TOR validation.");
    }

    controller.dispatch(`TOR ${targetEnemy.position.x} ${targetEnemy.position.y}`);

    assert(game.ship.torpedoes === torpedoesBefore - 1, "Expected torpedo inventory to decrease by one after TOR.");
    assert(game.turnsRemaining === turnsBeforeTor - 1, "Expected turn count to decrease after successful TOR.");
    assert(game.getAliveEnemyCount() <= enemiesBeforeTor, "Expected enemy count to stay the same or decrease after TOR.");

    const energyBeforePha = game.ship.energy;
    const turnsBeforePha = game.turnsRemaining;
    const enemiesBeforePha = game.getAliveEnemyCount();

    controller.dispatch("PHA 700");

    assert(game.ship.energy < energyBeforePha, "Expected energy to decrease after PHA.");
    assert(game.turnsRemaining === turnsBeforePha - 1, "Expected turn count to decrease after successful PHA.");
    assert(game.getAliveEnemyCount() <= enemiesBeforePha, "Expected enemy count to stay the same or decrease after PHA.");
    assert(game.messageLog.length > 0, "Expected message log entries after command dispatch.");

    console.log("Smoke test passed.");
    console.log(`Position: X=${shipX},Y=${shipY} -> X=${game.ship.position.x},Y=${game.ship.position.y}`);
    console.log(`Energy after NAV/TOR/PHA: ${energyBeforeNav} -> ${game.ship.energy}`);
    console.log(`Torpedoes: ${torpedoesBefore} -> ${game.ship.torpedoes}`);
    console.log(`Enemies: ${enemiesBeforeTor} -> ${game.getAliveEnemyCount()}`);
    console.log(`Turns remaining: ${game.turnsRemaining}`);
}

runSmoke();
