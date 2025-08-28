# Send test JSON to local server (PowerShell)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Invoke-RestMethod -Uri "http://localhost:3000/ingest" -Method Post -ContentType "application/json" -InFile "$here\data.json"
