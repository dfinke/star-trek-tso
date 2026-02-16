export enum AlertLevel {
    Normal = "Normal",
    RedAlert = "RedAlert",
    Destroyed = "Destroyed"
}

export class ShipCondition {
    constructor(
        public alertLevel: AlertLevel,
        public incomingDamageMultiplier: number
    ) { }
}

export class NormalCondition extends ShipCondition {
    constructor() {
        super(AlertLevel.Normal, 1.0);
    }
}

export class RedAlertCondition extends ShipCondition {
    constructor() {
        super(AlertLevel.RedAlert, 0.9);
    }
}

export class DestroyedCondition extends ShipCondition {
    constructor() {
        super(AlertLevel.Destroyed, 1.0);
    }
}

export class Position {
    constructor(public x: number, public y: number) { }
}

export class Enterprise {
    name = "USS Enterprise";
    energy = 3000;
    shields = 1000;
    torpedoes = 10;
    position = new Position(4, 4);
    condition: ShipCondition = new NormalCondition();

    applyDamage(rawDamage: number): void {
        const scaled = Math.floor(rawDamage * this.condition.incomingDamageMultiplier);

        if (this.shields >= scaled) {
            this.shields -= scaled;
            return;
        }

        const remaining = scaled - this.shields;
        this.shields = 0;
        this.energy -= remaining;

        if (this.energy <= 0) {
            this.energy = 0;
            this.condition = new DestroyedCondition();
        }
    }
}

export class Klingon {
    constructor(
        public id: number,
        public hull: number,
        public position: Position
    ) { }

    isAlive(): boolean {
        return this.hull > 0;
    }
}

export class Quadrant {
    width = 8;
    height = 8;
    klingons: Klingon[] = [];

    getAliveKlingons(): Klingon[] {
        return this.klingons.filter((k) => k.isAlive());
    }
}

export interface GameObserver {
    update(eventName: string, payload: unknown, gameState: GameState): void;
}

export class GameState {
    ship = new Enterprise();
    currentQuadrant = new Quadrant();
    stardate = 1312;
    turnsRemaining = 30;
    messageLog: string[] = [];
    private observers: GameObserver[] = [];

    addMessage(message: string): void {
        this.messageLog.push(message);
        this.notify("MessageAdded", message);
    }

    addObserver(observer: GameObserver): void {
        this.observers.push(observer);
    }

    notify(eventName: string, payload: unknown): void {
        for (const observer of this.observers) {
            observer.update(eventName, payload, this);
        }
    }

    getAliveEnemyCount(): number {
        return this.currentQuadrant.getAliveKlingons().length;
    }

    isGameOver(): boolean {
        if (this.ship.condition.alertLevel === AlertLevel.Destroyed) {
            return true;
        }

        if (this.getAliveEnemyCount() === 0) {
            return true;
        }

        return this.turnsRemaining <= 0;
    }

    advanceTurn(): void {
        this.stardate += 1;
        this.turnsRemaining -= 1;
        this.notify("TurnAdvanced", null);
    }

    evaluateShipCondition(): void {
        if (this.ship.condition.alertLevel === AlertLevel.Destroyed) {
            return;
        }

        this.ship.condition = this.getAliveEnemyCount() > 0 ? new RedAlertCondition() : new NormalCondition();
        this.notify("ConditionChanged", this.ship.condition);
    }
}
