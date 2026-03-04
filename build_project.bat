@echo off
set "PATH=%~dp0temp_node\node-v20.18.0-win-x64;%PATH%"
echo Building project...
npm run build
