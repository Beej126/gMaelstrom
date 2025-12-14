@echo off

title "gMaelstrom dev"

which npm 1>nul 2>&1 || (
	echo,
	echo npm not found in path. aborting.
	echo,
	echo my favorite approach to installing node+npm on windows:
	echo    https://github.com/coreybutler/nvm-windows 
	echo,
	echo pro tip:
	echo   after npm is installed,
	echo   edit your PATH to have %%appdata%%/npm ahead of %ProgramFiles%\nodejs
	echo   so under powershell consoles npm.ps1 takes precedence over npm.cmd
	echo   which among other things, avoids the obnoxious "Terminate batch job (Y/N)?"
	echo,
	pause
	exit /b 0
)

if not exist node_modules\nul (
	echo running 'npm install'. just a sec...
	call npm install
)

npm run dev
