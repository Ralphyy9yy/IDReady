$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$demoRoot = Join-Path $PSScriptRoot '..\..\docs\demo'
$demoWork = Join-Path $demoRoot 'work'
New-Item -ItemType Directory -Force -Path $demoWork | Out-Null
$demoScenes = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'scenes.json') -Raw | ConvertFrom-Json
$demoVoice = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $demoVoice.SelectVoice('Microsoft Zira Desktop')
    $demoVoice.Rate = 0
    for ($demoIndex = 0; $demoIndex -lt $demoScenes.Count; $demoIndex++) {
        $demoVoice.SetOutputToWaveFile((Join-Path $demoWork ("voice-{0}.wav" -f $demoIndex)))
        $demoVoice.Speak($demoScenes[$demoIndex].narration)
    }
    $demoVoice.SetOutputToNull()
} finally {
    $demoVoice.Dispose()
}
Write-Output 'Local narration generated.'
