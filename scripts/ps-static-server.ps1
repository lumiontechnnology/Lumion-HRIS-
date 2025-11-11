param(
  [int]$Port = 3006,
  [string]$Root = '.'
)

$rootPath = Resolve-Path -Path $Root
$root = $rootPath.Path

function Get-ContentType([string]$Path){
  $ext = [System.IO.Path]::GetExtension($Path).ToLower()
  switch ($ext) {
    '.html' { 'text/html' }
    '.htm' { 'text/html' }
    '.css' { 'text/css' }
    '.js' { 'application/javascript' }
    '.mjs' { 'application/javascript' }
    '.json' { 'application/json' }
    '.png' { 'image/png' }
    '.jpg' { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.gif' { 'image/gif' }
    '.svg' { 'image/svg+xml' }
    '.ico' { 'image/x-icon' }
    '.txt' { 'text/plain' }
    default { 'application/octet-stream' }
  }
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  Write-Error "Failed to start listener on $prefix. $_"
  exit 1
}

Write-Host "Serving $root at $prefix"
Write-Host "Press Ctrl+C to stop."

while ($true) {
  try {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    $path = $req.Url.AbsolutePath.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($path)) { $path = 'index.html' }

    $safePath = $path -replace "[\\/]..[\\/]", ''
    $filePath = Join-Path $root $safePath

    if (Test-Path -Path $filePath -PathType Leaf) {
      try {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $res.ContentType = Get-ContentType -Path $filePath
        $res.ContentLength64 = $bytes.Length
        $res.StatusCode = 200
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } catch {
        $res.StatusCode = 500
        $writer = New-Object System.IO.StreamWriter($res.OutputStream)
        $writer.Write("500 Internal Server Error")
        $writer.Flush()
      }
    } else {
      $res.StatusCode = 404
      $writer = New-Object System.IO.StreamWriter($res.OutputStream)
      $writer.Write("404 Not Found")
      $writer.Flush()
    }

    $res.OutputStream.Close()
  } catch {
    if ($listener.IsListening -eq $false) { break }
  }
}

try { $listener.Stop() } catch {}