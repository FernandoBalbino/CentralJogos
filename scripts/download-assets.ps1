param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [switch]$ForceRefresh
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$assetDirectory = Join-Path $ProjectRoot 'assets\items'
$creditPath = Join-Path $ProjectRoot 'js\credits-data.js'
$statePath = Join-Path $PSScriptRoot '.asset-download-state.txt'
New-Item -ItemType Directory -Force -Path $assetDirectory | Out-Null
if ($ForceRefresh -and (Test-Path -LiteralPath $statePath)) { Remove-Item -LiteralPath $statePath -Force }
$completedIds = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
if (Test-Path -LiteralPath $statePath) {
    foreach ($savedId in Get-Content -LiteralPath $statePath) {
        if (-not [string]::IsNullOrWhiteSpace($savedId)) { [void]$completedIds.Add($savedId.Trim()) }
    }
}

# Artigos com uma imagem principal representativa e estável.
$articles = @(
    @{ id='teclado'; title='Computer keyboard' },
    @{ id='mouse'; title='Computer mouse' },
    @{ id='microfone'; title='Microphone' },
    @{ id='scanner'; title='Image scanner' },
    @{ id='webcam'; title='Webcam' },
    @{ id='mesa-digitalizadora'; title='Graphics tablet' },
    @{ id='leitor-biometrico'; title='Fingerprint scanner' },
    @{ id='monitor'; title='Computer monitor' },
    @{ id='impressora'; title='Printer (computing)' },
    @{ id='caixa-som'; title='Computer speakers' },
    @{ id='fone-ouvido'; title='Headphones' },
    @{ id='projetor'; title='Video projector' },
    @{ id='plotter'; title='Plotter' },
    @{ id='painel-led'; title='LED display' },
    @{ id='processador'; title='Central processing unit' },
    @{ id='placa-mae'; title='Motherboard' },
    @{ id='memoria-ram'; title='Random-access memory' },
    @{ id='ssd'; title='Solid-state drive' },
    @{ id='disco-rigido'; title='Hard disk drive' },
    @{ id='placa-video'; title='Graphics card' },
    @{ id='fonte-alimentacao'; title='Power supply unit (computer)' },
    @{ id='cooler'; title='Computer fan' },
    @{ id='touchscreen'; title='Touchscreen' },
    @{ id='multifuncional'; title='Multi-function printer' },
    @{ id='headset'; title='Audio headset' },
    @{ id='modem'; title='Modem' },
    @{ id='pen-drive'; title='USB flash drive' },
    @{ id='gravador-dvd'; title='Optical disc drive' }
)

# Arquivos escolhidos diretamente quando a imagem principal do artigo era ambígua.
$directFiles = @(
    @{ id='leitor-codigo-barras'; file='File:Barcode-scanner.jpg' },
    @{ id='impressora-3d'; file='File:MAKE 3D Printer Shootout Weekend - Afinia 3D Printer (9434019726).jpg' },
    @{ id='roteador'; file='File:Dlink wireless router.jpg' },
    @{ id='hd-externo'; file='File:Typical External Hard Drive.JPG' }
)

$software = @(
    @{ id='windows'; slug=$null; title='File:Windows logo - 2021.svg'; label='Windows' },
    @{ id='ubuntu'; slug='ubuntu'; label='Ubuntu' },
    @{ id='google-chrome'; slug='googlechrome'; label='Google Chrome' },
    @{ id='mozilla-firefox'; slug='firefoxbrowser'; label='Mozilla Firefox' },
    @{ id='libreoffice-writer'; slug='libreofficewriter'; label='LibreOffice Writer' },
    @{ id='vlc'; slug='vlcmediaplayer'; label='VLC Media Player' },
    @{ id='gimp'; slug='gimp'; label='GIMP' },
    @{ id='seven-zip'; slug='7zip'; label='7-Zip' }
)

$commonsApi = 'https://commons.wikimedia.org/w/api.php'
$wikipediaApi = 'https://en.wikipedia.org/w/api.php'
$headers = @{ 'User-Agent' = 'CentralJogosEducational/1.0 (local classroom project)' }
$credits = [ordered]@{}

function Remove-Html([string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) { return 'Contribuidor do Wikimedia Commons' }
    $decoded = [System.Net.WebUtility]::HtmlDecode($value)
    return (($decoded -replace '<[^>]+>', ' ' -replace '\s+', ' ').Trim())
}

function Invoke-WithRetry([scriptblock]$operation) {
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try { return & $operation }
        catch {
            if ($attempt -eq 5) { throw }
            Start-Sleep -Seconds (3 * $attempt)
        }
    }
}

function Save-RemoteFile([string]$url, [string]$destination) {
    Invoke-WithRetry { Invoke-WebRequest -Uri $url -Headers $headers -OutFile $destination } | Out-Null
}

function Save-ThumbnailAsJpeg([string]$url, [string]$destination) {
    $temporary = [System.IO.Path]::GetTempFileName()
    try {
        Save-RemoteFile -url $url -destination $temporary
        $source = [System.Drawing.Image]::FromFile($temporary)
        try {
            $canvas = New-Object System.Drawing.Bitmap 360,260
            $canvas.SetResolution(96,96)
            $graphics = [System.Drawing.Graphics]::FromImage($canvas)
            try {
                $graphics.Clear([System.Drawing.Color]::White)
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $padding = 12
                $scale = [Math]::Min((360 - 2*$padding) / $source.Width, (260 - 2*$padding) / $source.Height)
                $drawWidth = [int]($source.Width * $scale)
                $drawHeight = [int]($source.Height * $scale)
                $x = [int]((360 - $drawWidth) / 2)
                $y = [int]((260 - $drawHeight) / 2)
                $graphics.DrawImage($source, $x, $y, $drawWidth, $drawHeight)
                $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
                $parameters = New-Object System.Drawing.Imaging.EncoderParameters 1
                $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 86L
                $canvas.Save($destination, $jpegCodec, $parameters)
            }
            finally { $graphics.Dispose(); $canvas.Dispose() }
        }
        finally { $source.Dispose() }
    }
    finally { Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue }
}

# Descobre o nome do arquivo principal dos artigos em uma única consulta.
$fileById = [ordered]@{}
$articleParameters = @{
    action='query'; format='json'; titles=(($articles.title) -join '|'); redirects=1;
    prop='pageimages'; piprop='name'
}
$articleResponse = Invoke-WithRetry { Invoke-RestMethod -Uri $wikipediaApi -Body $articleParameters -Method Get -Headers $headers }
$articlePages = @{}
foreach ($page in $articleResponse.query.pages.PSObject.Properties.Value) {
    $articlePages[$page.title.ToLowerInvariant()] = $page
}
foreach ($item in $articles) {
    $page = $articlePages[$item.title.ToLowerInvariant()]
    if (-not $page -or -not $page.pageimage) { throw "Artigo sem imagem principal: $($item.title)" }
    $fileById[$item.id] = 'File:' + $page.pageimage
}
foreach ($item in $directFiles) { $fileById[$item.id] = $item.file }

# Consulta metadados e miniaturas em uma única chamada ao Commons.
$allFileTitles = @($fileById.Values)
$commonsParameters = @{
    action='query'; format='json'; titles=($allFileTitles -join '|');
    prop='imageinfo'; iiprop='url|extmetadata|mime'; iiurlwidth=320
}
$commonsResponse = Invoke-WithRetry { Invoke-RestMethod -Uri $commonsApi -Body $commonsParameters -Method Get -Headers $headers }
$commonsByTitle = @{}
foreach ($page in $commonsResponse.query.pages.PSObject.Properties.Value) {
    $commonsByTitle[$page.title.ToLowerInvariant()] = $page
}

foreach ($entry in $fileById.GetEnumerator()) {
    $lookupTitle = ($entry.Value -replace '_',' ').ToLowerInvariant()
    $page = $commonsByTitle[$lookupTitle]
    if (-not $page -or -not $page.imageinfo[0].thumburl) { throw "Arquivo não encontrado no Commons: $($entry.Value)" }
    $info = $page.imageinfo[0]
    $destination = Join-Path $assetDirectory ($entry.Key + '.jpg')
    if (-not ($completedIds.Contains($entry.Key) -and (Test-Path -LiteralPath $destination))) {
        Save-ThumbnailAsJpeg -url $info.thumburl -destination $destination
        Add-Content -LiteralPath $statePath -Value $entry.Key -Encoding utf8
        [void]$completedIds.Add($entry.Key)
        Start-Sleep -Milliseconds 450
    }
    $metadata = $info.extmetadata
    $credits[$entry.Key] = [ordered]@{
        source = $info.descriptionurl
        license = if ($metadata.LicenseShortName.value) { $metadata.LicenseShortName.value } else { 'Licença indicada na página do arquivo' }
        author = Remove-Html $metadata.Artist.value
        title = $page.title -replace '^File:', ''
    }
}

foreach ($item in $software) {
    $destination = Join-Path $assetDirectory ($item.id + '.svg')
    if ($item.slug) {
        Save-RemoteFile -url "https://cdn.simpleicons.org/$($item.slug)" -destination $destination
        $credits[$item.id] = [ordered]@{
            source = "https://simpleicons.org/?q=$([Uri]::EscapeDataString($item.label))"
            license = 'Simple Icons — CC0 1.0; marcas pertencem aos respectivos titulares'
            author = 'Simple Icons e titular da marca'
            title = "Logotipo $($item.label)"
        }
    }
    else {
        $parameters = @{ action='query'; format='json'; titles=$item.title; prop='imageinfo'; iiprop='url|extmetadata' }
        $response = Invoke-WithRetry { Invoke-RestMethod -Uri $commonsApi -Body $parameters -Method Get -Headers $headers }
        $page = $response.query.pages.PSObject.Properties.Value | Select-Object -First 1
        $info = $page.imageinfo[0]
        Save-RemoteFile -url $info.url -destination $destination
        $credits[$item.id] = [ordered]@{
            source = $info.descriptionurl
            license = $info.extmetadata.LicenseShortName.value
            author = Remove-Html $info.extmetadata.Artist.value
            title = $page.title -replace '^File:', ''
        }
    }
}

$json = $credits | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($creditPath, "window.assetCredits = $json;`n", [System.Text.UTF8Encoding]::new($false))
Write-Output "Baixados $($fileById.Count + $software.Count) recursos visuais curados e criado o registro de créditos."
