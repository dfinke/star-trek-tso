class ClassicPhaserStrategy {
    [int] ResolveDamage([int]$allocatedEnergy, [double]$distance) {
        if ($allocatedEnergy -le 0) {
            return 0
        }

        $effectiveDistance = [Math]::Max($distance, 1.0)
        return [Math]::Floor($allocatedEnergy / $effectiveDistance)
    }
}

class ClassicTorpedoStrategy {
    [int] ResolveDamage([double]$distance, [Random]$rng) {
        $effectiveDistance = [Math]::Max($distance, 1.0)
        $base = $rng.Next(360, 620)
        return [Math]::Floor($base / [Math]::Sqrt($effectiveDistance))
    }
}

class DefaultEnemyAttackStrategy {
    [int] ResolveEnemyDamage([Klingon]$attacker, [Enterprise]$ship, [Random]$rng) {
        $dx = [Math]::Abs($attacker.Position.X - $ship.Position.X)
        $dy = [Math]::Abs($attacker.Position.Y - $ship.Position.Y)
        $distance = [Math]::Sqrt(($dx * $dx) + ($dy * $dy))

        $base = $rng.Next(120, 340)
        $effectiveDistance = [Math]::Max($distance, 1.0)
        return [Math]::Floor($base / $effectiveDistance)
    }
}
