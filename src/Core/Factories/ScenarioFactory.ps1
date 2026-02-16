class ScenarioFactory {
    static [GameState] CreateDefaultGame([int]$seed) {
        $rng = if ($seed -eq 0) { [Random]::new() } else { [Random]::new($seed) }

        $game = [GameState]::new()

        $enemyCount = 3
        for ($i = 1; $i -le $enemyCount; $i++) {
            $pos = [Position]::new($rng.Next(1, 8), $rng.Next(1, 8))
            if (($pos.X -eq $game.Ship.Position.X) -and ($pos.Y -eq $game.Ship.Position.Y)) {
                $pos = [Position]::new(($pos.X % 8) + 1, $pos.Y)
            }

            $enemy = [Klingon]::new($i, $rng.Next(300, 550), $pos)
            [void]$game.CurrentQuadrant.Klingons.Add($enemy)
        }

        $game.AddMessage('Incoming transmission: Klingon vessels detected in this quadrant.')
        $game.EvaluateShipCondition()
        return $game
    }
}
