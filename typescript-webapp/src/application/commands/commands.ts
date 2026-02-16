import { ClassicPhaserStrategy, ClassicTorpedoStrategy } from "../../core/combat/strategies";
import { GameState, Position } from "../../core/model";
import { IRandom } from "../../core/random";

export interface ControllerPort {
    requestQuit(): void;
    getCommandNames(): string[];
}

export interface CommandContext {
    gameState: GameState;
    phaserStrategy: ClassicPhaserStrategy;
    torpedoStrategy: ClassicTorpedoStrategy;
    rng: IRandom;
    controller: ControllerPort;
}

export abstract class CommandBase {
    constructor(public readonly name: string, public readonly description: string) { }

    abstract execute(context: CommandContext, commandArgs: string[]): boolean;
}

function distanceBetween(a: Position, b: Position): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return Math.sqrt(dx * dx + dy * dy);
}

export class NavigateCommand extends CommandBase {
    constructor() {
        super("NAV", "Navigate to sector coordinates: NAV <x> <y>");
    }

    override execute(context: CommandContext, commandArgs: string[]): boolean {
        const game = context.gameState;

        if (commandArgs.length < 2) {
            game.addMessage("Usage: NAV <x> <y>");
            return false;
        }

        const targetX = Number.parseInt(commandArgs[0] ?? "", 10);
        const targetY = Number.parseInt(commandArgs[1] ?? "", 10);

        if (Number.isNaN(targetX) || Number.isNaN(targetY)) {
            game.addMessage("Navigation coordinates must be whole numbers.");
            return false;
        }

        if (targetX < 1 || targetX > 8 || targetY < 1 || targetY > 8) {
            game.addMessage("Navigation coordinates must be between 1 and 8.");
            return false;
        }

        if (targetX === game.ship.position.x && targetY === game.ship.position.y) {
            game.addMessage("Already at those coordinates.");
            return false;
        }

        for (const enemy of game.currentQuadrant.getAliveKlingons()) {
            if (enemy.position.x === targetX && enemy.position.y === targetY) {
                game.addMessage("Navigation blocked: hostile vessel occupies that sector.");
                return false;
            }
        }

        const distance = distanceBetween(game.ship.position, new Position(targetX, targetY));
        const energyCost = Math.max(25, Math.floor(distance * 80));

        if (energyCost > game.ship.energy) {
            game.addMessage(`Insufficient energy for course. Required: ${energyCost}, available: ${game.ship.energy}`);
            return false;
        }

        game.ship.energy -= energyCost;
        game.ship.position = new Position(targetX, targetY);
        game.addMessage(`Course laid in. Arrived at X=${targetX} Y=${targetY}. Energy cost: ${energyCost}`);
        return true;
    }
}

export class PhaserCommand extends CommandBase {
    constructor() {
        super("PHA", "Fire phasers: PHA <energy>");
    }

    override execute(context: CommandContext, commandArgs: string[]): boolean {
        const game = context.gameState;

        if (game.getAliveEnemyCount() === 0) {
            game.addMessage("No targets in range. Quadrant secure.");
            return false;
        }

        if (commandArgs.length < 1) {
            game.addMessage("Usage: PHA <energy>");
            return false;
        }

        const requestedEnergy = Number.parseInt(commandArgs[0] ?? "", 10);
        if (Number.isNaN(requestedEnergy)) {
            game.addMessage("Phaser energy must be a whole number.");
            return false;
        }

        if (requestedEnergy <= 0) {
            game.addMessage("Phaser energy must be greater than zero.");
            return false;
        }

        if (requestedEnergy > game.ship.energy) {
            game.addMessage(`Insufficient energy. Available: ${game.ship.energy}`);
            return false;
        }

        const alive = game.currentQuadrant.getAliveKlingons();
        const weights: number[] = [];
        let weightSum = 0;

        for (const enemy of alive) {
            const distance = Math.max(distanceBetween(enemy.position, game.ship.position), 1.0);
            const w = 1.0 / distance;
            weights.push(w);
            weightSum += w;
        }

        game.ship.energy -= requestedEnergy;
        let totalDamage = 0;

        for (let i = 0; i < alive.length; i += 1) {
            const enemy = alive[i]!;
            const share = Math.floor(requestedEnergy * ((weights[i] ?? 0) / weightSum));
            const distance = Math.max(distanceBetween(enemy.position, game.ship.position), 1.0);
            const damage = context.phaserStrategy.resolveDamage(share, distance);

            enemy.hull -= damage;
            totalDamage += damage;

            if (enemy.hull <= 0) {
                enemy.hull = 0;
                game.addMessage(`Klingon #${enemy.id} destroyed.`);
            } else {
                game.addMessage(`Klingon #${enemy.id} hit for ${damage}. Hull remaining: ${enemy.hull}`);
            }
        }

        game.addMessage(`Phaser volley complete. Total damage: ${totalDamage}`);
        game.notify("CombatResolved", null);
        return true;
    }
}

export class TorpedoCommand extends CommandBase {
    constructor() {
        super("TOR", "Fire photon torpedo: TOR <x> <y>");
    }

    override execute(context: CommandContext, commandArgs: string[]): boolean {
        const game = context.gameState;

        if (commandArgs.length < 2) {
            game.addMessage("Usage: TOR <x> <y>");
            return false;
        }

        const targetX = Number.parseInt(commandArgs[0] ?? "", 10);
        const targetY = Number.parseInt(commandArgs[1] ?? "", 10);

        if (Number.isNaN(targetX) || Number.isNaN(targetY)) {
            game.addMessage("Torpedo coordinates must be whole numbers.");
            return false;
        }

        if (targetX < 1 || targetX > 8 || targetY < 1 || targetY > 8) {
            game.addMessage("Torpedo coordinates must be between 1 and 8.");
            return false;
        }

        if (game.ship.torpedoes <= 0) {
            game.addMessage("No photon torpedoes remaining.");
            return false;
        }

        game.ship.torpedoes -= 1;

        const target = game.currentQuadrant
            .getAliveKlingons()
            .find((enemy) => enemy.position.x === targetX && enemy.position.y === targetY);

        if (!target) {
            game.addMessage(`Photon torpedo misses at X=${targetX} Y=${targetY}.`);
            return true;
        }

        const distance = distanceBetween(target.position, game.ship.position);
        const damage = context.torpedoStrategy.resolveDamage(distance, context.rng);
        target.hull -= damage;

        if (target.hull <= 0) {
            target.hull = 0;
            game.addMessage(`Direct hit! Klingon #${target.id} destroyed.`);
        } else {
            game.addMessage(`Direct hit on Klingon #${target.id} for ${damage}. Hull remaining: ${target.hull}`);
        }

        return true;
    }
}

export class ShortRangeScanCommand extends CommandBase {
    constructor() {
        super("SRS", "Short range scan");
    }

    override execute(context: CommandContext): boolean {
        context.gameState.notify("RenderRequested", "SRS");
        return true;
    }
}

export class StatusCommand extends CommandBase {
    constructor() {
        super("STATUS", "Show mission status");
    }

    override execute(context: CommandContext): boolean {
        context.gameState.notify("RenderRequested", "STATUS");
        return true;
    }
}

export class HelpCommand extends CommandBase {
    constructor() {
        super("HELP", "List commands");
    }

    override execute(context: CommandContext): boolean {
        const names = context.controller.getCommandNames().join(", ");
        context.gameState.addMessage(`Available commands: ${names}`);
        return true;
    }
}

export class QuitCommand extends CommandBase {
    constructor() {
        super("QUIT", "Exit game");
    }

    override execute(context: CommandContext): boolean {
        context.controller.requestQuit();
        context.gameState.addMessage("Starfleet command acknowledged. Ending simulation.");
        return true;
    }
}

export class UnknownCommand extends CommandBase {
    constructor() {
        super("UNKNOWN", "Unknown command handler");
    }

    override execute(context: CommandContext): boolean {
        context.gameState.addMessage("Unknown command. Type HELP for available commands.");
        return false;
    }
}
