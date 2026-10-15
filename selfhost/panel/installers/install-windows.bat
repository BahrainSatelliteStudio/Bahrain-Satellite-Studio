@echo off
chcp 65001 >nul
:: Bahrain Satellite Panel - Windows Server installer (offline)
net session >nul 2>&1 || (echo Run as Administrator / شغّل كمسؤول & pause & exit /b 1)
set SRC=%~dp0..
set DEST=C:\bhsat-panel
set /p PORT=Port [8090]: 
if "%PORT%"=="" set PORT=8090
set /p AUSER=Admin username [admin]: 
if "%AUSER%"=="" set AUSER=admin

mkdir "%DEST%" 2>nul
mkdir "%DEST%\data" 2>nul
xcopy /E /I /Y "%SRC%\public" "%DEST%\public" >nul
copy /Y "%SRC%\server.js" "%DEST%\" >nul
copy /Y "%SRC%\runtime\node-win-x64.exe" "%DEST%\node.exe" >nul
echo {"port": %PORT%} > "%DEST%\data\config.json"

> "%DEST%\start.bat" echo @echo off
>> "%DEST%\start.bat" echo cd /d %DEST%
>> "%DEST%\start.bat" echo set PANEL_ADMIN_USER=%AUSER%
>> "%DEST%\start.bat" echo :loop
>> "%DEST%\start.bat" echo node.exe server.js
>> "%DEST%\start.bat" echo timeout /t 3 ^>nul
>> "%DEST%\start.bat" echo goto loop

schtasks /Create /F /TN "BHSAT Panel" /SC ONSTART /RU SYSTEM /TR "\"%DEST%\start.bat\"" >nul
netsh advfirewall firewall add rule name="BHSAT Panel" dir=in action=allow protocol=TCP localport=%PORT% >nul
schtasks /Run /TN "BHSAT Panel" >nul
timeout /t 4 >nul
echo.
echo ==============================================
echo  Installed: http://localhost:%PORT%
type "%DEST%\data\initial-login.txt" 2>nul
echo  Starts automatically with Windows (Task: BHSAT Panel)
echo ==============================================
pause
