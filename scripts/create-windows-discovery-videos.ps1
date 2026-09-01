param(
  [Parameter(Mandatory = $true)]
  [string]$FfmpegPath
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$assetRoot = Join-Path $projectRoot "assets\windows-discovery"
$videoRoot = Join-Path $assetRoot "videos"
$posterRoot = Join-Path $assetRoot "posters"

if (-not (Test-Path -LiteralPath $FfmpegPath)) {
  throw "FFmpeg não encontrado em $FfmpegPath"
}

New-Item -ItemType Directory -Path $videoRoot -Force | Out-Null
New-Item -ItemType Directory -Path $posterRoot -Force | Out-Null

$scenes = @("desktop", "start", "explorer", "browser", "settings")
foreach ($scene in $scenes) {
  $source = Join-Path $assetRoot "scene-$scene.png"
  $poster = Join-Path $posterRoot "$scene.webp"
  & $FfmpegPath -hide_banner -loglevel error -y -i $source -vf "scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2" -frames:v 1 -c:v libwebp -quality 78 $poster
  if ($LASTEXITCODE -ne 0) { throw "Falha ao gerar pôster $scene" }
}

$clips = @(
  @{ Id = 1; Scene = "desktop"; X = 570; Y = 250 },
  @{ Id = 2; Scene = "desktop"; X = 46; Y = 62 },
  @{ Id = 3; Scene = "desktop"; X = 48; Y = 226 },
  @{ Id = 4; Scene = "desktop"; X = 485; Y = 512 },
  @{ Id = 5; Scene = "start"; X = 382; Y = 512 },
  @{ Id = 6; Scene = "start"; X = 480; Y = 78 },
  @{ Id = 7; Scene = "start"; X = 515; Y = 172 },
  @{ Id = 8; Scene = "explorer"; X = 500; Y = 255 },
  @{ Id = 9; Scene = "explorer"; X = 832; Y = 40 },
  @{ Id = 10; Scene = "explorer"; X = 866; Y = 40 },
  @{ Id = 11; Scene = "explorer"; X = 904; Y = 40 },
  @{ Id = 12; Scene = "settings"; X = 420; Y = 244 },
  @{ Id = 13; Scene = "desktop"; X = 916; Y = 510 },
  @{ Id = 14; Scene = "settings"; X = 707; Y = 244 },
  @{ Id = 15; Scene = "settings"; X = 787; Y = 366 },
  @{ Id = 16; Scene = "settings"; X = 320; Y = 88 },
  @{ Id = 17; Scene = "explorer"; X = 525; Y = 518 },
  @{ Id = 18; Scene = "explorer"; X = 105; Y = 330 },
  @{ Id = 19; Scene = "explorer"; X = 126; Y = 330 },
  @{ Id = 20; Scene = "explorer"; X = 255; Y = 192 },
  @{ Id = 21; Scene = "explorer"; X = 490; Y = 190 },
  @{ Id = 22; Scene = "explorer"; X = 598; Y = 190 },
  @{ Id = 23; Scene = "browser"; X = 800; Y = 142 },
  @{ Id = 24; Scene = "browser"; X = 132; Y = 40 },
  @{ Id = 25; Scene = "explorer"; X = 598; Y = 190 },
  @{ Id = 26; Scene = "explorer"; X = 180; Y = 118 },
  @{ Id = 27; Scene = "explorer"; X = 218; Y = 118 },
  @{ Id = 28; Scene = "explorer"; X = 490; Y = 242 },
  @{ Id = 29; Scene = "explorer"; X = 335; Y = 118 },
  @{ Id = 30; Scene = "desktop"; X = 48; Y = 286 }
)

$cursor = Join-Path $assetRoot "cursor.png"
$ring = Join-Path $assetRoot "click-ring.png"

foreach ($clip in $clips) {
  $id = "{0:D2}" -f $clip.Id
  $scene = $clip.Scene
  $source = Join-Path $assetRoot "scene-$scene.png"
  $output = Join-Path $videoRoot "$id-$scene.webm"
  $startX = if ($clip.X -lt 300) { 650 } else { 115 }
  $startY = if ($clip.Y -gt 430) { 110 } else { 455 }
  $deltaX = $clip.X - $startX
  $deltaY = $clip.Y - $startY
  $filter = "[0:v]scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2,setsar=1[bg];" +
    "[1:v]format=rgba,scale=48:48[cur];" +
    "[2:v]format=rgba,scale=74:74[ring];" +
    "[bg][cur]overlay=x='$startX+$deltaX*min(t/2.35,1)':y='$startY+$deltaY*min(t/2.35,1)':shortest=0[mid];" +
    "[mid][ring]overlay=x=$($clip.X - 37):y=$($clip.Y - 37):enable='between(t,2.25,2.85)':shortest=0,format=yuv420p[out]"

  & $FfmpegPath -hide_banner -loglevel error -y `
    -loop 1 -framerate 30 -i $source `
    -loop 1 -framerate 30 -i $cursor `
    -loop 1 -framerate 30 -i $ring `
    -filter_complex $filter -map "[out]" -t 4.4 -r 30 -an `
    -c:v libvpx-vp9 -crf 44 -b:v 0 -deadline good -cpu-used 5 -row-mt 1 $output
  if ($LASTEXITCODE -ne 0) { throw "Falha ao gerar vídeo $id-$scene" }
}

$totalBytes = (Get-ChildItem -LiteralPath $videoRoot -Filter "*.webm" | Measure-Object -Property Length -Sum).Sum
Write-Output "Vídeos gerados: $($clips.Count)"
Write-Output "Total de vídeos: $([Math]::Round($totalBytes / 1MB, 2)) MiB"
