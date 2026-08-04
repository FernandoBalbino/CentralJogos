param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$output = Join-Path $ProjectRoot 'assets\hangman'
New-Item -ItemType Directory -Force -Path $output | Out-Null

$width = 420
$height = 420
$ink = [System.Drawing.Color]::FromArgb(255, 24, 42, 67)
$accent = [System.Drawing.Color]::FromArgb(255, 238, 93, 65)
$teal = [System.Drawing.Color]::FromArgb(255, 0, 166, 166)

function New-Layer([string]$name, [scriptblock]$draw) {
    $bitmap = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        & $draw $graphics
        $bitmap.Save((Join-Path $output $name), [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

New-Layer 'gallows.png' {
    param($g)
    $pen = New-Object System.Drawing.Pen $ink, 14
    $pen.StartCap = $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen, 52, 378, 302, 378)
    $g.DrawLine($pen, 104, 378, 104, 46)
    $g.DrawLine($pen, 104, 48, 302, 48)
    $g.DrawLine($pen, 300, 48, 300, 92)
    $brace = New-Object System.Drawing.Pen $teal, 10
    $brace.StartCap = $brace.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($brace, 107, 102, 162, 50)
    $pen.Dispose(); $brace.Dispose()
}

New-Layer 'part-1.png' {
    param($g)
    $pen = New-Object System.Drawing.Pen $ink, 11
    $g.DrawEllipse($pen, 264, 92, 72, 72)
    $eyePen = New-Object System.Drawing.Pen $accent, 5
    $g.DrawLine($eyePen, 282, 118, 290, 126); $g.DrawLine($eyePen, 290, 118, 282, 126)
    $g.DrawLine($eyePen, 310, 118, 318, 126); $g.DrawLine($eyePen, 318, 118, 310, 126)
    $pen.Dispose(); $eyePen.Dispose()
}

New-Layer 'part-2.png' {
    param($g)
    $pen = New-Object System.Drawing.Pen $ink, 12
    $pen.StartCap = $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen, 300, 168, 300, 264)
    $scarf = New-Object System.Drawing.Pen $teal, 10
    $scarf.StartCap = $scarf.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($scarf, 278, 172, 322, 172)
    $pen.Dispose(); $scarf.Dispose()
}

New-Layer 'part-3.png' {
    param($g)
    $pen = New-Object System.Drawing.Pen $ink, 12
    $pen.StartCap = $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen, 297, 188, 247, 232)
    $pen.Dispose()
}

New-Layer 'part-4.png' {
    param($g)
    $pen = New-Object System.Drawing.Pen $ink, 12
    $pen.StartCap = $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen, 303, 188, 353, 232)
    $pen.Dispose()
}

New-Layer 'part-5.png' {
    param($g)
    $pen = New-Object System.Drawing.Pen $ink, 12
    $pen.StartCap = $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen, 297, 260, 254, 326)
    $pen.Dispose()
}

New-Layer 'part-6.png' {
    param($g)
    $pen = New-Object System.Drawing.Pen $ink, 12
    $pen.StartCap = $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen, 303, 260, 346, 326)
    $pen.Dispose()
}

Write-Output 'Ilustração da forca criada em sete camadas PNG locais.'
