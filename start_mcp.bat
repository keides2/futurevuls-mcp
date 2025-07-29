@echo off
REM =============================================================================
REM FutureVuls MCP Server Startup Script (Windows - Node.js)
REM =============================================================================

echo FutureVuls MCP Server (Node.js) starting...

REM Set current directory
cd /d "%~dp0"

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed.
    echo Please install Node.js 18.0 or higher and try again.
    echo Download: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
node --version

REM Check if node_modules exists
if not exist "node_modules" (
    echo Warning: node_modules not found.
    echo Please run setup_windows.bat first or run: npm install
    echo.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo Warning: .env file not found.
    echo Please copy .env.sample to .env and configure API token.
    echo Command: copy .env.sample .env
    echo.
    pause
    exit /b 1
)

REM Check if groups.json exists
if not exist "groups.json" (
    echo Warning: groups.json file not found.
    echo Please copy groups.json.template to groups.json and configure groups.
    echo Command: copy groups.json.template groups.json
    echo.
    pause
    exit /b 1
)

echo.
echo =============================================================================
echo Starting FutureVuls MCP Server (Node.js)
echo Press Ctrl+C to stop
echo =============================================================================
echo.

REM Start MCP server
node futurevuls-mcp.js

REM Error handling
if %ERRORLEVEL% neq 0 (
    echo.
    echo Error: MCP Server failed to start (Exit code: %ERRORLEVEL%)
    echo.
    echo Possible causes:
    echo - Node.js dependencies not installed
    echo - .env file not configured
    echo - groups.json file not configured
    echo - Invalid API token
    echo.
    echo Solutions:
    echo 1. Check README.md setup instructions
    echo 2. Run: npm install
    echo 3. Configure .env and groups.json files
    echo.
    pause
) else (
    echo.
    echo FutureVuls MCP Server stopped normally.
    echo.
    pause
)
