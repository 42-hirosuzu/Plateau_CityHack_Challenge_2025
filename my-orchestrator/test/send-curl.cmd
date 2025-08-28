@echo off
REM Send test JSON to local server (Windows CMD)
REM Requires curl.exe (Windows 10+ has it built-in)
setlocal
set HERE=%~dp0
curl.exe -s -X POST "http://localhost:3000/ingest" -H "Content-Type: application/json" --data-binary "@%HERE%data.json"
echo.
endlocal
