@echo off

which winget 1>nul 2>&1 || (
	echo,
	echo winget.exe not in path for installing caddy
	echo,
	echo obtain winget here: https://apps.microsoft.com/detail/9nblggh4nns1
	echo,
	echo aborting.
	echo,
	pause
	exit /b 1
)

winget install -e --id=CaddyServer.Caddy -i --accept-package-agreements --accept-source-agreements

