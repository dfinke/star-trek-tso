export interface IRandom {
    nextInt(minInclusive: number, maxExclusive: number): number;
}

export class LcgRandom implements IRandom {
    private state: number;

    constructor(seed?: number) {
        const normalized = seed && seed !== 0 ? seed : Date.now();
        this.state = normalized >>> 0;
    }

    private nextFloat(): number {
        this.state = (1664525 * this.state + 1013904223) >>> 0;
        return this.state / 0x100000000;
    }

    nextInt(minInclusive: number, maxExclusive: number): number {
        if (maxExclusive <= minInclusive) {
            return minInclusive;
        }

        const span = maxExclusive - minInclusive;
        return minInclusive + Math.floor(this.nextFloat() * span);
    }
}
