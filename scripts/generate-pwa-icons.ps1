Add-Type -AssemblyName System.Drawing

function Create-PwaIcon($srcPath, $destPath, $width, $height, $padding) {
    $srcImg = [System.Drawing.Image]::FromFile($srcPath)
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    # Background color #0B2545 (enp-blue-deep)
    $bgColor = [System.Drawing.Color]::FromArgb(255, 11, 37, 69)
    $g.Clear($bgColor)
    
    $availW = $width - ($padding * 2)
    $availH = $height - ($padding * 2)
    $ratio = [Math]::Min($availW / $srcImg.Width, $availH / $srcImg.Height)
    $destW = [int]($srcImg.Width * $ratio)
    $destH = [int]($srcImg.Height * $ratio)
    $destX = [int](($width - $destW) / 2)
    $destY = [int](($height - $destH) / 2)
    
    $g.DrawImage($srcImg, $destX, $destY, $destW, $destH)
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $srcImg.Dispose()
    Write-Host "Generated $destPath ($width x $height)"
}

$src = Resolve-Path "apps/web/public/logo-enp-transparent.png"
Create-PwaIcon $src "apps/web/public/pwa-192x192.png" 192 192 24
Create-PwaIcon $src "apps/web/public/pwa-512x512.png" 512 512 64
Create-PwaIcon $src "apps/web/public/pwa-maskable-512x512.png" 512 512 80
Create-PwaIcon $src "apps/web/public/apple-touch-icon.png" 180 180 20

