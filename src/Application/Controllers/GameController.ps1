class CommandParser {
    [pscustomobject] Parse([string]$input) {
        if ([string]::IsNullOrWhiteSpace($input)) {
            return [pscustomobject]@{ CommandName = ''; Arguments = @() }
        }

        $tokens = $input.Trim().Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
        $name = $tokens[0].ToUpperInvariant()
        $arguments = @()
        if ($tokens.Count -gt 1) {
            $arguments = $tokens[1..($tokens.Count - 1)]
        }

        return [pscustomobject]@{ CommandName = $name; Arguments = [string[]]$arguments }
    }
}

class GameController {
    [GameState]$GameState
    [hashtable]$CommandMap
    [CommandBase]$UnknownCommand
    [CommandParser]$Parser
    [ClassicPhaserStrategy]$PhaserStrategy
    [ClassicTorpedoStrategy]$TorpedoStrategy
    [DefaultEnemyAttackStrategy]$EnemyAttackStrategy
    [Random]$Rng
    [bool]$ShouldQuit = $false

    GameController([GameState]$gameState, [int]$seed) {
        $this.GameState = $gameState
        $this.Parser = [CommandParser]::new()
        $this.CommandMap = @{}
        $this.UnknownCommand = [UnknownCommand]::new()
        $this.PhaserStrategy = [ClassicPhaserStrategy]::new()
        $this.TorpedoStrategy = [ClassicTorpedoStrategy]::new()
        $this.EnemyAttackStrategy = [DefaultEnemyAttackStrategy]::new()
        $this.Rng = if ($seed -eq 0) { [Random]::new() } else { [Random]::new($seed) }

        $this.RegisterCommand([NavigateCommand]::new())
        $this.RegisterCommand([PhaserCommand]::new())
        $this.RegisterCommand([TorpedoCommand]::new())
        $this.RegisterCommand([ShortRangeScanCommand]::new())
        $this.RegisterCommand([StatusCommand]::new())
        $this.RegisterCommand([HelpCommand]::new())
        $this.RegisterCommand([QuitCommand]::new())
    }

    [void] RegisterCommand([CommandBase]$command) {
        $this.CommandMap[$command.Name] = $command
    }

    [System.Collections.Generic.List[CommandBase]] GetCommandList() {
        $list = [System.Collections.Generic.List[CommandBase]]::new()
        foreach ($key in ($this.CommandMap.Keys | Sort-Object)) {
            [void]$list.Add($this.CommandMap[$key])
        }
        return $list
    }

    [void] RequestQuit() {
        $this.ShouldQuit = $true
    }

    [bool] CanContinue() {
        return (-not $this.ShouldQuit) -and (-not $this.GameState.IsGameOver())
    }

    [void] Dispatch([string]$inputLine) {
        $parsed = $this.Parser.Parse($inputLine)
        if ([string]::IsNullOrWhiteSpace($parsed.CommandName)) {
            return
        }

        $command = if ($this.CommandMap.ContainsKey($parsed.CommandName)) {
            $this.CommandMap[$parsed.CommandName]
        }
        else {
            $this.UnknownCommand
        }

        $context = [pscustomobject]@{
            GameState       = $this.GameState
            PhaserStrategy  = $this.PhaserStrategy
            TorpedoStrategy = $this.TorpedoStrategy
            Rng             = $this.Rng
            Controller      = $this
        }

        $wasExecuted = $command.Execute($context, $parsed.Arguments)

        if ($wasExecuted -and ($command.Name -in @('PHA', 'NAV', 'TOR'))) {
            $this.RunEnemyTurn()
            $this.GameState.AdvanceTurn()
            $this.GameState.EvaluateShipCondition()
        }

        $this.GameState.Notify('RenderRequested', 'POST_COMMAND')
    }

    [void] RunEnemyTurn() {
        $alive = $this.GameState.CurrentQuadrant.GetAliveKlingons()
        if ($alive.Count -eq 0) {
            $this.GameState.AddMessage('Sector clear of enemy threats.')
            return
        }

        foreach ($enemy in $alive) {
            $damage = $this.EnemyAttackStrategy.ResolveEnemyDamage($enemy, $this.GameState.Ship, $this.Rng)
            $this.GameState.Ship.ApplyDamage($damage)
            $this.GameState.AddMessage("Klingon #$($enemy.Id) fires for $damage damage.")

            if ($this.GameState.Ship.Condition.AlertLevel -eq [AlertLevel]::Destroyed) {
                $this.GameState.AddMessage('The Enterprise has been destroyed.')
                break
            }
        }
    }
}
