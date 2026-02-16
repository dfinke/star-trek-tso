$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\src\Core\Model.ps1"
. "$PSScriptRoot\src\Core\Combat\CombatStrategies.ps1"
. "$PSScriptRoot\src\Core\Factories\ScenarioFactory.ps1"
. "$PSScriptRoot\src\Application\Commands\Commands.ps1"
. "$PSScriptRoot\src\Application\Controllers\GameController.ps1"

$game = [ScenarioFactory]::CreateDefaultGame(42)
$controller = [GameController]::new($game, 42)

$controller.Dispatch('STATUS')

# NAV validation
$occupied = @{}
foreach ($enemy in $game.CurrentQuadrant.GetAliveKlingons()) {
    $occupied["$($enemy.Position.X),$($enemy.Position.Y)"] = $true
}

$shipX = $game.Ship.Position.X
$shipY = $game.Ship.Position.Y
$candidateMoves = @(
    [pscustomobject]@{ X = ($shipX + 1); Y = $shipY },
    [pscustomobject]@{ X = ($shipX - 1); Y = $shipY },
    [pscustomobject]@{ X = $shipX; Y = ($shipY + 1) },
    [pscustomobject]@{ X = $shipX; Y = ($shipY - 1) }
)

$targetMove = $null
foreach ($move in $candidateMoves) {
    $x = $move.X
    $y = $move.Y
    if (($x -ge 1) -and ($x -le 8) -and ($y -ge 1) -and ($y -le 8) -and (-not $occupied.ContainsKey("$x,$y"))) {
        $targetMove = $move
        break
    }
}

if ($null -eq $targetMove) {
    throw 'Unable to find a safe adjacent NAV destination for smoke test.'
}

$energyBeforeNav = $game.Ship.Energy
$turnsBeforeNav = $game.TurnsRemaining
$controller.Dispatch("NAV $($targetMove.X) $($targetMove.Y)")

if (($game.Ship.Position.X -ne $targetMove.X) -or ($game.Ship.Position.Y -ne $targetMove.Y)) {
    throw 'Expected ship position to change after NAV.'
}

if ($game.Ship.Energy -ge $energyBeforeNav) {
    throw 'Expected energy to decrease after NAV.'
}

if ($game.TurnsRemaining -ne ($turnsBeforeNav - 1)) {
    throw 'Expected turn count to decrease after successful NAV.'
}

# TOR validation
$torpedoesBefore = $game.Ship.Torpedoes
$turnsBeforeTor = $game.TurnsRemaining
$enemiesBeforeTor = $game.GetAliveEnemyCount()
$targetEnemy = $game.CurrentQuadrant.GetAliveKlingons()[0]

$controller.Dispatch("TOR $($targetEnemy.Position.X) $($targetEnemy.Position.Y)")

if ($game.Ship.Torpedoes -ne ($torpedoesBefore - 1)) {
    throw 'Expected torpedo inventory to decrease by one after TOR.'
}

if ($game.TurnsRemaining -ne ($turnsBeforeTor - 1)) {
    throw 'Expected turn count to decrease after successful TOR.'
}

if ($game.GetAliveEnemyCount() -gt $enemiesBeforeTor) {
    throw 'Expected enemy count to stay the same or decrease after TOR.'
}

# PHA validation
$energyBeforePha = $game.Ship.Energy
$enemiesBeforePha = $game.GetAliveEnemyCount()
$turnsBeforePha = $game.TurnsRemaining

$controller.Dispatch('PHA 700')

if ($game.Ship.Energy -ge $energyBeforePha) {
    throw 'Expected energy to decrease after PHA.'
}

if ($game.TurnsRemaining -ne ($turnsBeforePha - 1)) {
    throw 'Expected turn count to decrease after successful PHA.'
}

if ($game.GetAliveEnemyCount() -gt $enemiesBeforePha) {
    throw 'Expected enemy count to stay the same or decrease after PHA.'
}

if ($game.MessageLog.Count -eq 0) {
    throw 'Expected message log entries after command dispatch.'
}

Write-Host 'Smoke test passed.' -ForegroundColor Green
Write-Host "Position: X=$shipX,Y=$shipY -> X=$($game.Ship.Position.X),Y=$($game.Ship.Position.Y)"
Write-Host "Energy after NAV/TOR/PHA: $energyBeforeNav -> $($game.Ship.Energy)"
Write-Host "Torpedoes: $torpedoesBefore -> $($game.Ship.Torpedoes)"
Write-Host "Enemies: $enemiesBeforeTor -> $($game.GetAliveEnemyCount())"
Write-Host "Turns remaining: $($game.TurnsRemaining)"
