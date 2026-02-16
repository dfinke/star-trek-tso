import {
    CommandBase,
    CommandContext,
    ControllerPort,
    HelpCommand,
    NavigateCommand,
    PhaserCommand,
    QuitCommand,
    ShortRangeScanCommand,
    StatusCommand,
    TorpedoCommand,
    UnknownCommand
} from "../commands/commands";
import {
    ClassicPhaserStrategy,
    ClassicTorpedoStrategy,
    DefaultEnemyAttackStrategy
} from "../../core/combat/strategies";
import { AlertLevel, GameState } from "../../core/model";
import { IRandom } from "../../core/random";

interface ParsedInput {
    commandName: string;
    arguments: string[];
}

class CommandParser {
    parse(input: string): ParsedInput {
        if (!input.trim()) {
            return { commandName: "", arguments: [] };
        }

        const tokens = input.trim().split(/\s+/g);
        const [name, ...args] = tokens;
        return {
            commandName: (name ?? "").toUpperCase(),
            arguments: args
        };
    }
}

export class GameController implements ControllerPort {
    private readonly commandMap = new Map<string, CommandBase>();
    private readonly unknownCommand = new UnknownCommand();
    private readonly parser = new CommandParser();

    readonly phaserStrategy = new ClassicPhaserStrategy();
    readonly torpedoStrategy = new ClassicTorpedoStrategy();
    readonly enemyAttackStrategy = new DefaultEnemyAttackStrategy();
    shouldQuit = false;

    constructor(public readonly gameState: GameState, private readonly rng: IRandom) {
        this.registerCommand(new NavigateCommand());
        this.registerCommand(new PhaserCommand());
        this.registerCommand(new TorpedoCommand());
        this.registerCommand(new ShortRangeScanCommand());
        this.registerCommand(new StatusCommand());
        this.registerCommand(new HelpCommand());
        this.registerCommand(new QuitCommand());
    }

    private registerCommand(command: CommandBase): void {
        this.commandMap.set(command.name, command);
    }

    getCommandNames(): string[] {
        return [...this.commandMap.keys()].sort();
    }

    requestQuit(): void {
        this.shouldQuit = true;
    }

    canContinue(): boolean {
        return !this.shouldQuit && !this.gameState.isGameOver();
    }

    dispatch(inputLine: string): void {
        const parsed = this.parser.parse(inputLine);
        if (!parsed.commandName) {
            return;
        }

        const command = this.commandMap.get(parsed.commandName) ?? this.unknownCommand;

        const context: CommandContext = {
            gameState: this.gameState,
            phaserStrategy: this.phaserStrategy,
            torpedoStrategy: this.torpedoStrategy,
            rng: this.rng,
            controller: this
        };

        const wasExecuted = command.execute(context, parsed.arguments);

        if (wasExecuted && ["PHA", "NAV", "TOR"].includes(command.name)) {
            this.runEnemyTurn();
            this.gameState.advanceTurn();
            this.gameState.evaluateShipCondition();
        }

        this.gameState.notify("RenderRequested", "POST_COMMAND");
    }

    private runEnemyTurn(): void {
        const alive = this.gameState.currentQuadrant.getAliveKlingons();
        if (alive.length === 0) {
            this.gameState.addMessage("Sector clear of enemy threats.");
            return;
        }

        for (const enemy of alive) {
            const damage = this.enemyAttackStrategy.resolveEnemyDamage(enemy, this.gameState.ship, this.rng);
            this.gameState.ship.applyDamage(damage);
            this.gameState.addMessage(`Klingon #${enemy.id} fires for ${damage} damage.`);

            if (this.gameState.ship.condition.alertLevel === AlertLevel.Destroyed) {
                this.gameState.addMessage("The Enterprise has been destroyed.");
                break;
            }
        }
    }
}
