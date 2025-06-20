@echo off
echo,

which caddy 1>nul 2>&1 || (
	if "%1" == "second_try" (echo caddy.exe still not found in path. aborting & echo, & pause & exit /b 1)
	echo 'caddy.exe' a free, highly secure web server, not found in path. launching installer...
	echo,
	call "caddy winget" || (echo, & echo caddy install error. aborting. & echo, & pause & exit /b 1)

	rem %%0 launches this same script again
	rem using 'start' launches completely new process which inherits latest PATH after caddy install
	start "caddy" %0 second_try

	exit /b 0
)

start https://localhost

rem using 'start' caddy just provides slightly cleaner CTRL+C interaction
start "gMaelstrom web server" caddy run --watch

exit /b 0