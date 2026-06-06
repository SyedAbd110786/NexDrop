@echo off
title NexDrop Launcher
cd /d "%~dp0"

echo ==============================================
echo           NexDrop Quick Launcher
echo ==============================================
echo.
echo [1/2] Starting server on port 5000...
echo.
echo [2/2] Opening NexDrop in your browser...
echo.
echo Click 'Allow' if Windows Defender asks for Firewall access.
echo ==============================================

:: Open browser in background
start "" "http://localhost:5000"

:: Run the Express/Socket.IO backend server
node server/src/server.js
