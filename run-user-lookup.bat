@echo off
echo Running Azure AD user lookup...
powershell -ExecutionPolicy Bypass -File "C:\Projects\ECI-SoundScribe\get-user-emails.ps1"
pause
