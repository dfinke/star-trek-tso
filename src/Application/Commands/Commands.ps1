class CommandBase {
    [string]$Name
    [string]$Description

    CommandBase([string]$name, [string]$description) {
        $this.Name = $name
        $this.Description = $description
    }

    [bool] Execute([object]$context, [string[]]$commandArgs) {
        throw 'Execute must be overridden.'
    }
}

class PhaserCommand : CommandBase {
    PhaserCommand() : base('PHA', 'Fire phasers: PHA <energy>') {}

    [bool] Execute([object]$context, [string[]]$commandArgs) {
        $game = $context.GameState

        if ($game.GetAliveEnemyCount() -eq 0) {
            $game.AddMessage('No targets in range. Quadrant secure.')
            return $false
        }

        if ($commandArgs.Count -lt 1) {
            $game.AddMessage('Usage: PHA <energy>')
            return $false
        }

        $requestedEnergy = 0
        if (-not [int]::TryParse($commandArgs[0], [ref]$requestedEnergy)) {
            $game.AddMessage('Phaser energy must be a whole number.')
            return $false
        }

        if ($requestedEnergy -le 0) {
            $game.AddMessage('Phaser energy must be greater than zero.')
            return $false
        }

        if ($requestedEnergy -gt $game.Ship.Energy) {
            $game.AddMessage("Insufficient energy. Available: $($game.Ship.Energy)")
            return $false
        }

        $alive = $game.CurrentQuadrant.GetAliveKlingons()
        $weights = [System.Collections.Generic.List[double]]::new()
        $weightSum = 0.0

        foreach ($enemy in $alive) {
            $dx = [Math]::Abs($enemy.Position.X - $game.Ship.Position.X)
            $dy = [Math]::Abs($enemy.Position.Y - $game.Ship.Position.Y)
            $dist = [Math]::Sqrt(($dx * $dx) + ($dy * $dy))
            $dist = [Math]::Max($dist, 1.0)
            $w = 1.0 / $dist
            [void]$weights.Add($w)
            $weightSum += $w
        }

        $game.Ship.Energy -= $requestedEnergy
        $totalDamage = 0

        for ($i = 0; $i -lt $alive.Count; $i++) {
            $enemy = $alive[$i]
            $share = [Math]::Floor($requestedEnergy * ($weights[$i] / $weightSum))

            $dx = [Math]::Abs($enemy.Position.X - $game.Ship.Position.X)
            $dy = [Math]::Abs($enemy.Position.Y - $game.Ship.Position.Y)
            $dist = [Math]::Sqrt(($dx * $dx) + ($dy * $dy))
            $dist = [Math]::Max($dist, 1.0)

            $damage = $context.PhaserStrategy.ResolveDamage($share, $dist)
            $enemy.Hull -= $damage
            $totalDamage += $damage

            if ($enemy.Hull -le 0) {
                $enemy.Hull = 0
                $game.AddMessage("Klingon #$($enemy.Id) destroyed.")
            }
            else {
                $game.AddMessage("Klingon #$($enemy.Id) hit for $damage. Hull remaining: $($enemy.Hull)")
            }
        }

        $game.AddMessage("Phaser volley complete. Total damage: $totalDamage")
        $game.Notify('CombatResolved', $null)
        return $true
    }
}

class NavigateCommand : CommandBase {
    NavigateCommand() : base('NAV', 'Navigate to sector coordinates: NAV <x> <y>') {}

    [bool] Execute([object]$context, [string[]]$commandArgs) {
        $game = $context.GameState

        if ($commandArgs.Count -lt 2) {
            $game.AddMessage('Usage: NAV <x> <y>')
            return $false
        }

        $targetX = 0
        $targetY = 0
        if ((-not [int]::TryParse($commandArgs[0], [ref]$targetX)) -or (-not [int]::TryParse($commandArgs[1], [ref]$targetY))) {
            $game.AddMessage('Navigation coordinates must be whole numbers.')
            return $false
        }

        if (($targetX -lt 1) -or ($targetX -gt 8) -or ($targetY -lt 1) -or ($targetY -gt 8)) {
            $game.AddMessage('Navigation coordinates must be between 1 and 8.')
            return $false
        }

        if (($targetX -eq $game.Ship.Position.X) -and ($targetY -eq $game.Ship.Position.Y)) {
            $game.AddMessage('Already at those coordinates.')
            return $false
        }

        foreach ($enemy in $game.CurrentQuadrant.GetAliveKlingons()) {
            if (($enemy.Position.X -eq $targetX) -and ($enemy.Position.Y -eq $targetY)) {
                $game.AddMessage('Navigation blocked: hostile vessel occupies that sector.')
                return $false
            }
        }

        $dx = [Math]::Abs($targetX - $game.Ship.Position.X)
        $dy = [Math]::Abs($targetY - $game.Ship.Position.Y)
        $distance = [Math]::Sqrt(($dx * $dx) + ($dy * $dy))
        $energyCost = [Math]::Max(25, [Math]::Floor($distance * 80))

        if ($energyCost -gt $game.Ship.Energy) {
            $game.AddMessage("Insufficient energy for course. Required: $energyCost, available: $($game.Ship.Energy)")
            return $false
        }

        $game.Ship.Energy -= $energyCost
        $game.Ship.Position = [Position]::new($targetX, $targetY)
        $game.AddMessage("Course laid in. Arrived at X=$targetX Y=$targetY. Energy cost: $energyCost")
        return $true
    }
}

class TorpedoCommand : CommandBase {
    TorpedoCommand() : base('TOR', 'Fire photon torpedo: TOR <x> <y>') {}

    [bool] Execute([object]$context, [string[]]$commandArgs) {
        $game = $context.GameState

        if ($commandArgs.Count -lt 2) {
            $game.AddMessage('Usage: TOR <x> <y>')
            return $false
        }

        $targetX = 0
        $targetY = 0
        if ((-not [int]::TryParse($commandArgs[0], [ref]$targetX)) -or (-not [int]::TryParse($commandArgs[1], [ref]$targetY))) {
            $game.AddMessage('Torpedo coordinates must be whole numbers.')
            return $false
        }

        if (($targetX -lt 1) -or ($targetX -gt 8) -or ($targetY -lt 1) -or ($targetY -gt 8)) {
            $game.AddMessage('Torpedo coordinates must be between 1 and 8.')
            return $false
        }

        if ($game.Ship.Torpedoes -le 0) {
            $game.AddMessage('No photon torpedoes remaining.')
            return $false
        }

        $game.Ship.Torpedoes -= 1
        $target = $null
        foreach ($enemy in $game.CurrentQuadrant.GetAliveKlingons()) {
            if (($enemy.Position.X -eq $targetX) -and ($enemy.Position.Y -eq $targetY)) {
                $target = $enemy
                break
            }
        }

        if ($null -eq $target) {
            $game.AddMessage("Photon torpedo misses at X=$targetX Y=$targetY.")
            return $true
        }

        $dx = [Math]::Abs($target.Position.X - $game.Ship.Position.X)
        $dy = [Math]::Abs($target.Position.Y - $game.Ship.Position.Y)
        $distance = [Math]::Sqrt(($dx * $dx) + ($dy * $dy))
        $damage = $context.TorpedoStrategy.ResolveDamage($distance, $context.Rng)
        $target.Hull -= $damage

        if ($target.Hull -le 0) {
            $target.Hull = 0
            $game.AddMessage("Direct hit! Klingon #$($target.Id) destroyed.")
        }
        else {
            $game.AddMessage("Direct hit on Klingon #$($target.Id) for $damage. Hull remaining: $($target.Hull)")
        }

        return $true
    }
}

class ShortRangeScanCommand : CommandBase {
    ShortRangeScanCommand() : base('SRS', 'Short range scan') {}

    [bool] Execute([object]$context, [string[]]$commandArgs) {
        $context.GameState.Notify('RenderRequested', 'SRS')
        return $true
    }
}

class StatusCommand : CommandBase {
    StatusCommand() : base('STATUS', 'Show mission status') {}

    [bool] Execute([object]$context, [string[]]$commandArgs) {
        $context.GameState.Notify('RenderRequested', 'STATUS')
        return $true
    }
}

class HelpCommand : CommandBase {
    HelpCommand() : base('HELP', 'List commands') {}

    [bool] Execute([object]$context, [string[]]$commandArgs) {
        $names = ($context.Controller.GetCommandList() | ForEach-Object { $_.Name }) -join ', '
        $context.GameState.AddMessage("Available commands: $names")
        return $true
    }
}

class QuitCommand : CommandBase {
    QuitCommand() : base('QUIT', 'Exit game') {}

    [bool] Execute([object]$context, [string[]]$commandArgs) {
        $context.Controller.RequestQuit()
        $context.GameState.AddMessage('Starfleet command acknowledged. Ending simulation.')
        return $true
    }
}

class UnknownCommand : CommandBase {
    UnknownCommand() : base('UNKNOWN', 'Unknown command handler') {}

    [bool] Execute([object]$context, [string[]]$commandArgs) {
        $context.GameState.AddMessage('Unknown command. Type HELP for available commands.')
        return $false
    }
}
