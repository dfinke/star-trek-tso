enum AlertLevel {
    Normal
    RedAlert
    Destroyed
}

class ShipCondition {
    [AlertLevel]$AlertLevel = [AlertLevel]::Normal
    [double]$IncomingDamageMultiplier = 1.0

    [string] ToString() {
        return $this.AlertLevel.ToString()
    }
}

class NormalCondition : ShipCondition {
    NormalCondition() {
        $this.AlertLevel = [AlertLevel]::Normal
        $this.IncomingDamageMultiplier = 1.0
    }
}

class RedAlertCondition : ShipCondition {
    RedAlertCondition() {
        $this.AlertLevel = [AlertLevel]::RedAlert
        $this.IncomingDamageMultiplier = 0.9
    }
}

class DestroyedCondition : ShipCondition {
    DestroyedCondition() {
        $this.AlertLevel = [AlertLevel]::Destroyed
        $this.IncomingDamageMultiplier = 1.0
    }
}

class Position {
    [int]$X
    [int]$Y

    Position([int]$x, [int]$y) {
        $this.X = $x
        $this.Y = $y
    }
}

class Enterprise {
    [string]$Name = 'USS Enterprise'
    [int]$Energy
    [int]$Shields
    [int]$Torpedoes
    [Position]$Position
    [ShipCondition]$Condition

    Enterprise() {
        $this.Energy = 3000
        $this.Shields = 1000
        $this.Torpedoes = 10
        $this.Position = [Position]::new(4, 4)
        $this.Condition = [NormalCondition]::new()
    }

    [void] ApplyDamage([int]$rawDamage) {
        $scaled = [Math]::Floor($rawDamage * $this.Condition.IncomingDamageMultiplier)

        if ($this.Shields -ge $scaled) {
            $this.Shields -= $scaled
            return
        }

        $remaining = $scaled - $this.Shields
        $this.Shields = 0
        $this.Energy -= $remaining

        if ($this.Energy -le 0) {
            $this.Energy = 0
            $this.Condition = [DestroyedCondition]::new()
        }
    }
}

class Klingon {
    [int]$Id
    [int]$Hull
    [Position]$Position

    Klingon([int]$id, [int]$hull, [Position]$position) {
        $this.Id = $id
        $this.Hull = $hull
        $this.Position = $position
    }

    [bool] IsAlive() {
        return $this.Hull -gt 0
    }
}

class Quadrant {
    [int]$Width = 8
    [int]$Height = 8
    [System.Collections.Generic.List[Klingon]]$Klingons

    Quadrant() {
        $this.Klingons = [System.Collections.Generic.List[Klingon]]::new()
    }

    [System.Collections.Generic.List[Klingon]] GetAliveKlingons() {
        $alive = [System.Collections.Generic.List[Klingon]]::new()
        foreach ($k in $this.Klingons) {
            if ($k.IsAlive()) {
                [void]$alive.Add($k)
            }
        }
        return $alive
    }
}

class GameState {
    [Enterprise]$Ship
    [Quadrant]$CurrentQuadrant
    [int]$Stardate
    [int]$TurnsRemaining
    [System.Collections.Generic.List[string]]$MessageLog
    [System.Collections.Generic.List[object]]$Observers

    GameState() {
        $this.Ship = [Enterprise]::new()
        $this.CurrentQuadrant = [Quadrant]::new()
        $this.Stardate = 1312
        $this.TurnsRemaining = 30
        $this.MessageLog = [System.Collections.Generic.List[string]]::new()
        $this.Observers = [System.Collections.Generic.List[object]]::new()
    }

    [void] AddMessage([string]$message) {
        [void]$this.MessageLog.Add($message)
        $this.Notify('MessageAdded', $message)
    }

    [void] AddObserver([object]$observer) {
        [void]$this.Observers.Add($observer)
    }

    [void] Notify([string]$eventName, [object]$payload) {
        foreach ($observer in $this.Observers) {
            $observer.Update($eventName, $payload, $this)
        }
    }

    [bool] IsGameOver() {
        if ($this.Ship.Condition.AlertLevel -eq [AlertLevel]::Destroyed) {
            return $true
        }

        if ($this.GetAliveEnemyCount() -eq 0) {
            return $true
        }

        return $this.TurnsRemaining -le 0
    }

    [int] GetAliveEnemyCount() {
        return $this.CurrentQuadrant.GetAliveKlingons().Count
    }

    [void] AdvanceTurn() {
        $this.Stardate += 1
        $this.TurnsRemaining -= 1
        $this.Notify('TurnAdvanced', $null)
    }

    [void] EvaluateShipCondition() {
        if ($this.Ship.Condition.AlertLevel -eq [AlertLevel]::Destroyed) {
            return
        }

        if ($this.GetAliveEnemyCount() -gt 0) {
            $this.Ship.Condition = [RedAlertCondition]::new()
        }
        else {
            $this.Ship.Condition = [NormalCondition]::new()
        }

        $this.Notify('ConditionChanged', $this.Ship.Condition)
    }
}
