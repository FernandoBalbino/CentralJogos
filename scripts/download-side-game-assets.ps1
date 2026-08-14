param(
    [switch]$ForceRefresh
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$iconRoot = Join-Path $projectRoot "assets\side-game\icons"
$brandRoot = Join-Path $projectRoot "assets\side-game\brands"

New-Item -ItemType Directory -Force -Path $iconRoot, $brandRoot | Out-Null

$materialVersion = "0.14.13"
$materialBase = "https://cdn.jsdelivr.net/npm/@material-design-icons/svg@$materialVersion/round"
$materialIcons = @(
    "volume_up", "volume_off", "fullscreen", "settings", "pause", "play_arrow",
    "history", "visibility", "restart_alt", "swap_horiz", "arrow_back", "arrow_downward",
    "arrow_forward", "close", "check_circle", "timer", "navigation",
    "settings_ethernet", "router", "description", "developer_mode", "security",
    "memory", "apps", "language", "wifi", "bluetooth", "picture_as_pdf",
    "vpn_key", "http", "person", "folder", "insert_drive_file", "storage",
    "device_hub", "code", "account_tree", "filter_1", "touch_app", "mouse",
    "sports_esports", "print", "tv", "speaker", "graphic_eq", "sd_card"
)

$downloads = @{}
foreach ($icon in $materialIcons) {
    $downloads[(Join-Path $iconRoot "$icon.svg")] = "$materialBase/$icon.svg"
}

$downloads[(Join-Path $brandRoot "linux.svg")] = "https://cdn.jsdelivr.net/npm/simple-icons@v16/icons/linux.svg"
$downloads[(Join-Path $brandRoot "android.svg")] = "https://cdn.jsdelivr.net/npm/simple-icons@v16/icons/android.svg"

foreach ($entry in $downloads.GetEnumerator()) {
    if ((Test-Path -LiteralPath $entry.Key) -and -not $ForceRefresh) {
        continue
    }
    Invoke-WebRequest -Uri $entry.Value -OutFile $entry.Key -UseBasicParsing
    Write-Host "Baixado: $($entry.Key.Replace($projectRoot, '.'))"
}

Write-Host "Assets do Escolha Seu Lado prontos."
