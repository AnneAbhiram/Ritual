Add-Type -AssemblyName System.Drawing

function New-RitualIcon {
    param(
        [int]$Size,
        [string]$OutPath,
        [double]$BadgeScale
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    $c1 = [System.Drawing.Color]::FromArgb(255, 124, 140, 255)
    $c2 = [System.Drawing.Color]::FromArgb(255, 165, 139, 250)
    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45)
    $g.FillRectangle($brush, $rect)

    $badgeD = [int]($Size * $BadgeScale)
    $bx = ($Size - $badgeD) / 2
    $by = ($Size - $badgeD) / 2
    $badgeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(46, 255, 255, 255))
    $g.FillEllipse($badgeBrush, $bx, $by, $badgeD, $badgeD)

    $penW = [Math]::Max(6, [int]($Size * 0.045))
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penW)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $cx = $Size / 2.0
    $cy = $Size / 2.0
    $r = $badgeD * 0.30

    $p1 = New-Object System.Drawing.PointF(($cx - $r), ($cy + $r * 0.05))
    $p2 = New-Object System.Drawing.PointF(($cx - $r * 0.28), ($cy + $r * 0.85))
    $p3 = New-Object System.Drawing.PointF(($cx + $r * 1.05), ($cy - $r * 0.75))

    $g.DrawLines($pen, @($p1, $p2, $p3))

    $g.Flush()
    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

$root = Split-Path -Parent $PSScriptRoot
$iconsDir = Join-Path $root "icons"
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

New-RitualIcon -Size 192 -OutPath (Join-Path $iconsDir "icon-192.png") -BadgeScale 0.72
New-RitualIcon -Size 512 -OutPath (Join-Path $iconsDir "icon-512.png") -BadgeScale 0.72
New-RitualIcon -Size 512 -OutPath (Join-Path $iconsDir "icon-maskable-512.png") -BadgeScale 0.55

Write-Output "Icons written to $iconsDir"
