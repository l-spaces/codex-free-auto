$ErrorActionPreference = 'Stop'

try {
  # Chrome 可执行文件路径（优先使用当前用户目录安装）
  $chromePath = Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'
  if (-not (Test-Path -LiteralPath $chromePath)) {
    throw "未找到 Chrome 可执行文件：$chromePath"
  }

  # 独立用户数据目录，避免污染日常浏览器配置
  $profile = Join-Path $env:TEMP 'codex-chrome-debug-profile'
  if (-not (Test-Path -LiteralPath $profile)) {
    New-Item -ItemType Directory -Path $profile | Out-Null
  }

  # 远程调试参数：9222 端口 + 独立用户目录 + 空白页启动
  $arguments = @(
    '--remote-debugging-port=9222',
    "--user-data-dir=$profile",
    'about:blank'
  )

  Start-Process -FilePath $chromePath -ArgumentList $arguments | Out-Null

  Write-Host '[OK] Chrome 已启动（远程调试模式）。'
  Write-Host "Chrome 路径：$chromePath"
  Write-Host "用户数据目录：$profile"
  Write-Host '调试地址：http://127.0.0.1:9222'
  Write-Host '验证命令：Invoke-RestMethod http://127.0.0.1:9222/json/version | Select-Object Browser,webSocketDebuggerUrl'
} catch {
  Write-Error ("[ERROR] 启动失败：{0}" -f $_.Exception.Message)
  exit 1
}
