Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param(
        [int]$size,
        [string]$path
    )
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.TextRenderingHint = 'AntiAliasGridFit'
    $g.Clear([System.Drawing.Color]::Transparent)

    # Blue background
    $bgColor = [System.Drawing.Color]::FromArgb(37, 99, 235)
    $bgBrush = New-Object System.Drawing.SolidBrush($bgColor)
    $fillRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $g.FillRectangle($bgBrush, $fillRect)

    # Draw code symbol
    $penWidth = [Math]::Max(1, [int]($size * 0.06))
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penWidth)
    $left = [int]($size * 0.20)
    $right = [int]($size * 0.80)
    $midX = [int]($size * 0.50)
    $top = [int]($size * 0.30)
    $bottom = [int]($size * 0.70)
    $midY = [int]($size * 0.50)

    $g.DrawLine($pen, $midX, $top, $left, $midY)
    $g.DrawLine($pen, $midX, $bottom, $left, $midY)
    $g.DrawLine($pen, $midX, $top, $right, $midY)
    $g.DrawLine($pen, $midX, $bottom, $right, $midY)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

$dir = 'd:\projects\html_editor\icons'
New-Item -ItemType Directory -Path $dir -Force | Out-Null
Create-Icon -size 16 -path "$dir\icon16.png"
Create-Icon -size 48 -path "$dir\icon48.png"
Create-Icon -size 128 -path "$dir\icon128.png"
Write-Output 'Icons created successfully'
