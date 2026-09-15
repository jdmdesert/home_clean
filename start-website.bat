@echo off
title Steadfast & Co. Cleaning
cd /d "%~dp0"
echo.
echo  Steadfast & Co. Cleaning is starting...
echo.
echo  Open this address in your browser:
echo  http://127.0.0.1:8080
echo.
echo  Keep this window open while using the estimator.
echo  Press Ctrl+C to stop the website.
echo.
set PORT=8080
python server.py
if errorlevel 1 (
  echo.
  echo  The website could not start. Confirm that Python is installed.
  pause
)
