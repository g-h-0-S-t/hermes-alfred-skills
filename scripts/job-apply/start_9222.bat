@echo off
REM Re-launch LinkedIn 9222 Chrome (CDP port 9222)
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="OPERATOR_HOME/chrome-cdp-profile"
