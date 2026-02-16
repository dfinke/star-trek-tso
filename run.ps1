$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\src\Core\Model.ps1"
. "$PSScriptRoot\src\Core\Combat\CombatStrategies.ps1"
. "$PSScriptRoot\src\Core\Factories\ScenarioFactory.ps1"
. "$PSScriptRoot\src\Application\Commands\Commands.ps1"
. "$PSScriptRoot\src\Application\Controllers\GameController.ps1"
. "$PSScriptRoot\src\UI\Views\TerminalViews.ps1"

$game = [ScenarioFactory]::CreateDefaultGame(0)
$controller = [GameController]::new($game, 0)

$screenView = [GameScreenView]::new()

$game.AddObserver($screenView)

$game.Notify('RenderRequested', 'INITIAL')

function Clear-CommandInputLine {
    param(
        [int]$PromptRow
    )

    try {
        $width = [Math]::Max(20, [System.Console]::BufferWidth - 1)
        [System.Console]::SetCursorPosition(0, $PromptRow)
        Write-Host (' ' * $width) -NoNewline
        [System.Console]::SetCursorPosition(0, $PromptRow)
    }
    catch {
        # Non-interactive hosts may not support cursor control.
    }
}

while ($controller.CanContinue()) {
    $promptRow = 0
    try {
        $promptRow = [System.Console]::CursorTop
    }
    catch {
        $promptRow = 0
    }

    $inputLine = Read-Host 'COMMAND (HELP for list)'
    Clear-CommandInputLine -PromptRow $promptRow
    $controller.Dispatch($inputLine)
}

if ($game.Ship.Condition.AlertLevel -eq [AlertLevel]::Destroyed) {
    Write-Host 'MISSION FAILED: The Enterprise was lost.' -ForegroundColor Red
}
elseif ($game.GetAliveEnemyCount() -eq 0) {
    Write-Host 'MISSION SUCCESS: Enemy ships destroyed.' -ForegroundColor Green
}
elseif ($controller.ShouldQuit) {
    Write-Host 'Simulation terminated by command.' -ForegroundColor Yellow
}
else {
    Write-Host 'MISSION FAILED: Stardate limit exceeded.' -ForegroundColor Red
}
