@echo off
REM =============================================================================
REM FutureVuls MCP Server Setup Script (Windows - Node.js)
REM =============================================================================

echo.
echo =========================================================
echo FutureVuls MCP Server (Node.js) setup starting...
echo =========================================================
echo.

REM Set current directory
cd /d "%~dp0"

REM Check Node.js installation
echo [1/5] Checking Node.js environment...
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed.
    echo Please install Node.js 18.0 or higher and try again.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)
node --version

REM Check npm
echo [1.5/5] Checking npm availability...
rem Try to locate npm first
where npm >nul 2>&1
if errorlevel 1 (
    echo npm was not found in PATH. Trying Corepack activation...
    call corepack --version >nul 2>&1
    if errorlevel 1 (
        echo Corepack not available. Trying to add default Node.js path...
        if exist "C:\\Program Files\\nodejs\\npm.cmd" (
            set "PATH=C:\\Program Files\\nodejs;%PATH%"
            echo Added C:\\Program Files\\nodejs to PATH for this session.
        ) else (
            echo Could not find npm.cmd in default Node.js directory.
        )
    ) else (
        echo Enabling Corepack and activating npm...
    call corepack enable >nul 2>&1
    call corepack prepare npm@latest --activate >nul 2>&1
    )
)

rem Show detected npm path (if any)
where npm 2>nul | findstr /i "npm" >nul 2>&1 && (
    for /f "usebackq delims=" %%A in (`where npm`) do echo Detected npm: %%A
)

call npm --version >nul 2>&1
if errorlevel 1 (
    echo Error: npm is not available.
    echo Please check Node.js installation.
    pause
    exit /b 1
)
call npm --version

REM Install Node.js dependencies
echo.
echo [2/5] Installing Node.js dependencies...
call npm install

REM Create configuration files
echo.
echo [3/5] Creating configuration files...

if not exist ".env" (
    copy .env.sample .env
    echo .env file created.
    echo IMPORTANT: Edit .env file to set FUTUREVULS_API_TOKEN.
) else (
    echo .env file already exists.
)

if not exist "groups.json" (
    copy groups.json.template groups.json
    echo groups.json file created.
    echo IMPORTANT: Edit groups.json file to set actual group information.
) else (
    echo groups.json file already exists.
)

REM Create Claude Desktop config template copy
echo.
echo [4/5] Setting up Claude Desktop configuration...
if not exist "%APPDATA%\Claude\claude_desktop_config.json" (
    if not exist "%APPDATA%\Claude" mkdir "%APPDATA%\Claude"
    copy claude_desktop_config.json.template "%APPDATA%\Claude\claude_desktop_config.json"
    echo Claude Desktop config file created.
    echo IMPORTANT: Edit %APPDATA%\Claude\claude_desktop_config.json to set FUTUREVULS_API_TOKEN.
) else (
    echo Claude Desktop config file already exists.
)

REM Setup confirmation
echo.
echo [5/5] Setup completion check...
echo.
echo =========================================================
echo Setup completed successfully!
echo =========================================================
echo.
echo Please follow these steps:
echo.
echo 1. Edit .env file to set API token
echo    - Open .env with Notepad or VS Code
echo    - Change FUTUREVULS_API_TOKEN=your_actual_token_here to actual token
echo    - Also set FUTUREVULS_ORG_TOKEN=your_actual_org_token_here (required for organization features)
echo.
echo 2. Edit groups.json file to set group information
echo    - Open groups.json with Notepad or VS Code
echo    - Change template content to actual group information
echo.
echo 3. Edit Claude Desktop configuration
echo    - Edit %%APPDATA%%\Claude\claude_desktop_config.json
echo    - Confirm command is 'futurevuls-mcp' and set FUTUREVULS_API_TOKEN and FUTUREVULS_ORG_TOKEN
echo    - Follow README.md instructions
echo    - (npm global command is recommended)
echo.
echo 4. Test MCP server startup
echo    - Double-click start_mcp.bat to start
echo.
echo For detailed instructions, refer to README.md.
echo.

REM Ask to open config files
set /p open_config="Do you want to edit configuration files now? (y/n): "
if /i "%open_config%"=="y" (
    echo Opening .env file...
    notepad .env
    echo Opening groups.json file...
    notepad groups.json
    echo Opening Claude Desktop config file...
    notepad "%APPDATA%\Claude\claude_desktop_config.json"
)

echo.
echo Exiting setup script.
pause
