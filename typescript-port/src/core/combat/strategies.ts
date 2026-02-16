import { Enterprise, Klingon } from "../model.js";
import { IRandom } from "../random.js";

export class ClassicPhaserStrategy {
    resolveDamage(allocatedEnergy: number, distance: number): number {
        if (allocatedEnergy <= 0) {
            return 0;
        }

        const effectiveDistance = Math.max(distance, 1.0);
        return Math.floor(allocatedEnergy / effectiveDistance);
    }
}

export class ClassicTorpedoStrategy {
    resolveDamage(distance: number, rng: IRandom): number {
        const effectiveDistance = Math.max(distance, 1.0);
        const base = rng.nextInt(360, 620);
        return Math.floor(base / Math.sqrt(effectiveDistance));
    }
}

export class DefaultEnemyAttackStrategy {
    resolveEnemyDamage(attacker: Klingon, ship: Enterprise, rng: IRandom): number {
        const dx = Math.abs(attacker.position.x - ship.position.x);
        const dy = Math.abs(attacker.position.y - ship.position.y);
        const distance = Math.sqrt(dx * dx + dy * dy);

        const base = rng.nextInt(120, 340);
        const effectiveDistance = Math.max(distance, 1.0);
        return Math.floor(base / effectiveDistance);
    }
}
