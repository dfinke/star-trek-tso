class GameScreenView {
    [int]$LogTailCount = 8
    [int]$LastFrameHeight = 0

    [void] WriteLineAt([int]$row, [string]$text, [System.ConsoleColor]$color, [int]$width) {
        $content = if ($text.Length -gt $width) {
            $text.Substring(0, $width)
        }
        else {
            $text.PadRight($width)
        }

        [System.Console]::SetCursorPosition(0, $row)
        Write-Host $content -ForegroundColor $color
    }

    [System.Collections.Generic.List[pscustomobject]] BuildFrame([GameState]$gameState) {
        $lines = [System.Collections.Generic.List[pscustomobject]]::new()

        [void]$lines.Add([pscustomobject]@{ Text = ('=' * 68); Color = [System.ConsoleColor]::DarkGray })
        [void]$lines.Add([pscustomobject]@{ Text = 'MAINFRAME TSO STAR TREK - COMMAND CONSOLE'; Color = [System.ConsoleColor]::White })
        [void]$lines.Add([pscustomobject]@{ Text = ('=' * 68); Color = [System.ConsoleColor]::DarkGray })
        [void]$lines.Add([pscustomobject]@{ Text = ("STARDATE: {0}   TURNS: {1}   ALERT: {2}" -f $gameState.Stardate, $gameState.TurnsRemaining, $gameState.Ship.Condition.AlertLevel); Color = [System.ConsoleColor]::Cyan })
        [void]$lines.Add([pscustomobject]@{ Text = ("ENERGY:   {0}   SHIELDS: {1}   TORPEDOES: {2}" -f $gameState.Ship.Energy, $gameState.Ship.Shields, $gameState.Ship.Torpedoes); Color = [System.ConsoleColor]::Green })
        [void]$lines.Add([pscustomobject]@{ Text = ("POSITION: X={0}, Y={1}   HOSTILES: {2}" -f $gameState.Ship.Position.X, $gameState.Ship.Position.Y, $gameState.GetAliveEnemyCount()); Color = [System.ConsoleColor]::Yellow })
        [void]$lines.Add([pscustomobject]@{ Text = ('=' * 68); Color = [System.ConsoleColor]::DarkGray })

        [void]$lines.Add([pscustomobject]@{ Text = 'SECTOR MAP (E=Enterprise, K=Klingon)'; Color = [System.ConsoleColor]::Magenta })
        for ($y = 1; $y -le 8; $y++) {
            $row = @()
            for ($x = 1; $x -le 8; $x++) {
                $symbol = '.'
                if (($gameState.Ship.Position.X -eq $x) -and ($gameState.Ship.Position.Y -eq $y)) {
                    $symbol = 'E'
                }

                foreach ($k in $gameState.CurrentQuadrant.GetAliveKlingons()) {
                    if (($k.Position.X -eq $x) -and ($k.Position.Y -eq $y)) {
                        $symbol = 'K'
                        break
                    }
                }

                $row += $symbol
            }
            [void]$lines.Add([pscustomobject]@{ Text = (($row -join ' ') + "  | $y"); Color = [System.ConsoleColor]::Gray })
        }
        [void]$lines.Add([pscustomobject]@{ Text = '1 2 3 4 5 6 7 8  | X-axis'; Color = [System.ConsoleColor]::DarkGray })
        [void]$lines.Add([pscustomobject]@{ Text = ''; Color = [System.ConsoleColor]::Gray })
        [void]$lines.Add([pscustomobject]@{ Text = '--- COMPUTER LOG ---'; Color = [System.ConsoleColor]::White })

        $start = [Math]::Max(0, $gameState.MessageLog.Count - $this.LogTailCount)
        for ($offset = 0; $offset -lt $this.LogTailCount; $offset++) {
            $index = $start + $offset
            $text = if ($index -lt $gameState.MessageLog.Count) {
                "- $($gameState.MessageLog[$index])"
            }
            else {
                ''
            }

            [void]$lines.Add([pscustomobject]@{ Text = $text; Color = [System.ConsoleColor]::Gray })
        }

        [void]$lines.Add([pscustomobject]@{ Text = ''; Color = [System.ConsoleColor]::Gray })
        [void]$lines.Add([pscustomobject]@{ Text = 'Commands: NAV <x> <y>, PHA <energy>, TOR <x> <y>, SRS, STATUS, HELP, QUIT'; Color = [System.ConsoleColor]::DarkCyan })

        return $lines
    }

    [void] RenderFallback([GameState]$gameState) {
        Clear-Host
        $lines = $this.BuildFrame($gameState)
        foreach ($line in $lines) {
            Write-Host $line.Text -ForegroundColor $line.Color
        }
    }

    [void] Update([string]$eventName, [object]$payload, [GameState]$gameState) {
        if ($eventName -ne 'RenderRequested') {
            return
        }

        try {
            $frame = $this.BuildFrame($gameState)
            $bufferWidth = [Math]::Max(60, [System.Console]::BufferWidth - 1)

            for ($row = 0; $row -lt $frame.Count; $row++) {
                $this.WriteLineAt($row, $frame[$row].Text, $frame[$row].Color, $bufferWidth)
            }

            for ($row = $frame.Count; $row -lt $this.LastFrameHeight; $row++) {
                $this.WriteLineAt($row, '', [System.ConsoleColor]::Gray, $bufferWidth)
            }

            $this.LastFrameHeight = $frame.Count
            [System.Console]::SetCursorPosition(0, $frame.Count + 1)
        }
        catch {
            $this.RenderFallback($gameState)
        }
    }
}
