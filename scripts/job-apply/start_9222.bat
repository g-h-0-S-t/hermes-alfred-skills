@echo off
REM Re-launch LinkedIn LINKEDIN_PORT Chrome (CDP port LINKEDIN_PORT)
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=LINKEDIN_PORT --user-data-dir="XXXXXXX/chrome-profile"
