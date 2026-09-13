param(
  [Parameter(Mandatory = $true)]
  [string]$FfmpegPath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $FfmpegPath)) {
  throw "FFmpeg não encontrado em: $FfmpegPath"
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $projectRoot "assets\windows-file-organizer\media"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$fontPath = (Join-Path $env:WINDIR "Fonts\segoeui.ttf").Replace("\", "/").Replace(":", "\:")
$boldFontPath = (Join-Path $env:WINDIR "Fonts\segoeuib.ttf").Replace("\", "/").Replace(":", "\:")

$dragFilter = @"
drawbox=x=0:y=0:w=iw:h=ih:color=0x0b8ed8:t=fill,
drawbox=x=0:y=430:w=iw:h=110:color=0x0874b8:t=fill,
drawbox=x=670:y=150:w=190:h=170:color=0xffffff@0.80:t=fill,
drawbox=x=705:y=188:w=120:h=82:color=0xf4b52e:t=fill,
drawbox=x=690:y=232:w=150:h=76:color=0xffd75c:t=fill,
drawtext=fontfile='$boldFontPath':text='PASTA':x=735:y=325:fontsize=26:fontcolor=white,
drawbox=x='if(lt(t,1),130,if(lt(t,3),130+(t-1)*285,700))':y='if(lt(t,1),210,if(lt(t,3),210-(t-1)*18,174))':w=100:h=120:color=0xffffff@0.96:t=fill,
drawbox=x='if(lt(t,1),140,if(lt(t,3),140+(t-1)*285,710))':y='if(lt(t,1),225,if(lt(t,3),225-(t-1)*18,189))':w=80:h=18:color=0x2f7bd3:t=fill,
drawtext=fontfile='$boldFontPath':text='ARQUIVO':x='if(lt(t,1),137,if(lt(t,3),137+(t-1)*285,707))':y='if(lt(t,1),345,if(lt(t,3),345-(t-1)*18,309))':fontsize=21:fontcolor=white,
drawbox=x=660:y=140:w=210:h=190:color=0xffffff@0.25:t=8:enable='between(t,2.4,3.35)',
drawtext=fontfile='$fontPath':text='Clique, segure, arraste e solte':x=(w-text_w)/2:y=42:fontsize=34:fontcolor=white,
drawtext=fontfile='$fontPath':text='A pasta fica destacada quando está pronta para receber o arquivo.':x=(w-text_w)/2:y=485:fontsize=22:fontcolor=white
"@
$dragFilter = $dragFilter.Replace([Environment]::NewLine, "")

$propertiesFilter = @"
drawbox=x=0:y=0:w=iw:h=ih:color=0x108dcc:t=fill,
drawbox=x=0:y=430:w=iw:h=110:color=0x0874b8:t=fill,
drawbox=x=130:y=165:w=95:h=115:color=0xffffff@0.96:t=fill,
drawbox=x=140:y=180:w=75:h=18:color=0x5d7fa5:t=fill,
drawtext=fontfile='$boldFontPath':text='Meu arquivo':x=118:y=300:fontsize=23:fontcolor=white,
drawbox=x=270:y=125:w=220:h=250:color=0xf8fbff@0.98:t=fill:enable='between(t,1,2.5)',
drawtext=fontfile='$fontPath':text='Abrir':x=292:y=150:fontsize=22:fontcolor=0x24384c:enable='between(t,1,2.5)',
drawtext=fontfile='$fontPath':text='Recortar':x=292:y=195:fontsize=22:fontcolor=0x7b8794:enable='between(t,1,2.5)',
drawtext=fontfile='$fontPath':text='Copiar':x=292:y=240:fontsize=22:fontcolor=0x7b8794:enable='between(t,1,2.5)',
drawtext=fontfile='$fontPath':text='Renomear':x=292:y=285:fontsize=22:fontcolor=0x7b8794:enable='between(t,1,2.5)',
drawbox=x=282:y=322:w=196:h=42:color=0xddebf7:t=fill:enable='between(t,1,2.5)',
drawtext=fontfile='$boldFontPath':text='Propriedades':x=292:y=330:fontsize=21:fontcolor=0x173d61:enable='between(t,1,2.5)',
drawbox=x=235:y=76:w=540:h=386:color=0xf9fcff:t=fill:enable='gte(t,2.5)',
drawbox=x=235:y=76:w=540:h=52:color=0xeaf2f8:t=fill:enable='gte(t,2.5)',
drawtext=fontfile='$boldFontPath':text='Propriedades de Meu arquivo':x=260:y=91:fontsize=22:fontcolor=0x18334f:enable='gte(t,2.5)',
drawbox=x=270:y=196:w=470:h=74:color=0xe3f2ff:t=fill:enable='gte(t,2.5)',
drawbox=x=270:y=196:w=470:h=74:color=0x0b5ed7:t=4:enable='gte(t,2.5)',
drawtext=fontfile='$boldFontPath':text='Tipo de arquivo\:':x=290:y=214:fontsize=23:fontcolor=0x38536d:enable='gte(t,2.5)',
drawtext=fontfile='$boldFontPath':text='Documento de Texto (.txt)':x=470:y=214:fontsize=23:fontcolor=0x0b3f75:enable='gte(t,2.5)',
drawtext=fontfile='$fontPath':text='Local\:  Área de Trabalho':x=290:y=304:fontsize=22:fontcolor=0x38536d:enable='gte(t,2.5)',
drawtext=fontfile='$fontPath':text='Tamanho\:  6 KB':x=290:y=350:fontsize=22:fontcolor=0x38536d:enable='gte(t,2.5)',
drawtext=fontfile='$fontPath':text='Botão direito  →  Propriedades  →  Tipo de arquivo':x=(w-text_w)/2:y=486:fontsize=24:fontcolor=white
"@
$propertiesFilter = $propertiesFilter.Replace([Environment]::NewLine, "")

function New-LessonMedia {
  param(
    [string]$Name,
    [string]$Filter,
    [double]$PosterSecond
  )
  $videoPath = Join-Path $outputDir "$Name.webm"
  $posterPath = Join-Path $outputDir "$Name.webp"
  & $FfmpegPath -hide_banner -loglevel error -y -f lavfi -i "color=c=0x0b8ed8:s=960x540:r=24:d=5" -vf $Filter -c:v libvpx-vp9 -crf 38 -b:v 0 -pix_fmt yuv420p -an $videoPath
  if ($LASTEXITCODE -ne 0) { throw "Falha ao criar $Name.webm" }
  & $FfmpegPath -hide_banner -loglevel error -y -ss $PosterSecond -i $videoPath -frames:v 1 -quality 78 $posterPath
  if ($LASTEXITCODE -ne 0) { throw "Falha ao criar $Name.webp" }
}

New-LessonMedia -Name "drag-file" -Filter $dragFilter -PosterSecond 2.2
New-LessonMedia -Name "open-properties" -Filter $propertiesFilter -PosterSecond 3.4

Get-ChildItem -LiteralPath $outputDir | Select-Object Name, Length
