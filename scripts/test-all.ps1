# PowerShell Test Runner Pipeline for again!
# Runs full test suite: Backend Pytest (unit & integration) -> Frontend Typecheck -> Frontend E2E (Playwright)

param (
    [switch]$SkipE2E,
    [switch]$SkipBackend,
    [switch]$VerboseOutput
)

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " again! Full-Stack Test Pipeline (CI / Verification)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

$StagesPassed = 0
$TotalStages = 0

function Run-Stage {
    param (
        [string]$Name,
        [scriptblock]$Action
    )
    $script:TotalStages++
    Write-Host ""
    Write-Host ">>> STAGE $script:TotalStages: $Name" -ForegroundColor Yellow
    $StageStart = Get-Date
    try {
        & $Action
        $StageDuration = ((Get-Date) - $StageStart).TotalSeconds.ToString("0.0")
        Write-Host ">>> PASSED: $Name (${StageDuration}s)" -ForegroundColor Green
        $script:StagesPassed++
    } catch {
        $StageDuration = ((Get-Date) - $StageStart).TotalSeconds.ToString("0.0")
        Write-Host ">>> FAILED: $Name (${StageDuration}s)" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        Exit-Pipeline -ExitCode 1
    }
}

function Exit-Pipeline {
    param ([int]$ExitCode)
    $TotalDuration = ((Get-Date) - $StartTime).TotalSeconds.ToString("0.0")
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Cyan
    if ($ExitCode -eq 0) {
        Write-Host " ALL STAGES PASSED ($StagesPassed/$TotalStages) in ${TotalDuration}s" -ForegroundColor Green
    } else {
        Write-Host " PIPELINE FAILED ($StagesPassed/$TotalStages passed) in ${TotalDuration}s" -ForegroundColor Red
    }
    Write-Host "========================================================" -ForegroundColor Cyan
    exit $ExitCode
}

# ----------------------------------------------------
# STAGE 1: Backend Test Suite (Unit & Integration)
# ----------------------------------------------------
if (-not $SkipBackend) {
    Run-Stage "Backend Pytest Suite (Unit + Integration)" {
        # Check if backend container is running; otherwise run via isolated uv runner
        $BackendContainer = ""
        try {
            $BackendContainer = (docker ps --filter "name=again-backend" --format "{{.Names}}" 2>$null)
        } catch {}

        if ($BackendContainer -eq "again-backend") {
            Write-Host "Executing tests inside running Docker container (again-backend)..." -ForegroundColor DarkGray
            docker exec again-backend uv run --project backend pytest backend/tests
            if ($LASTEXITCODE -ne 0) { throw "Backend test suite failed inside Docker container." }
        } else {
            Write-Host "Executing tests via local uv runner..." -ForegroundColor DarkGray
            cd "$ProjectRoot\backend"
            uv run --isolated pytest tests
            cd "$ProjectRoot"
            if ($LASTEXITCODE -ne 0) { throw "Backend test suite failed via local uv runner." }
        }
    }
}

# ----------------------------------------------------
# STAGE 2: Frontend TypeScript Validation
# ----------------------------------------------------
Run-Stage "Frontend Type Check (tsc --noEmit)" {
    npx tsc --noEmit
    if ($LASTEXITCODE -ne 0) { throw "TypeScript type check found errors." }
}

# ----------------------------------------------------
# STAGE 3: Frontend Playwright E2E Suite
# ----------------------------------------------------
if (-not $SkipE2E) {
    Run-Stage "Frontend Playwright E2E Suite" {
        npx playwright test
        if ($LASTEXITCODE -ne 0) { throw "Playwright E2E test suite failed." }
    }
}

Exit-Pipeline -ExitCode 0
