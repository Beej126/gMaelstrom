function Test-SemVer {
    param (
        [Parameter(Mandatory=$true)][string]$MinVersion,
        [Parameter(Mandatory=$true)][string]$CheckVersion
    )
    # Split and convert to int arrays
    $minParts = @([string]$MinVersion -split '\.') | ForEach-Object { [int]$_ }
    $chkParts = @([string]$CheckVersion -split '\.') | ForEach-Object { [int]$_ }
    $maxLen = [Math]::Max($minParts.Count, $chkParts.Count)
    for ($i = $minParts.Count; $i -lt $maxLen; $i++) { $minParts += 0 }
    for ($i = $chkParts.Count; $i -lt $maxLen; $i++) { $chkParts += 0 }
    for ($i = 0; $i -lt $maxLen; $i++) {
        if ($chkParts[$i] -gt $minParts[$i]) { return $true }
        if ($chkParts[$i] -lt $minParts[$i]) { return $false }
    }
    return $true # Versions are equal
}

function checkInstall(
    [string[]] $checkNames,
    [string] $purpose,
    [ScriptBlock] $installCommand,
    [string] $versionMin,
    [ScriptBlock] $upgradeCommand, # provide empty scriptblock to use the $installCommand for upgrade
    [string] $versionParmName = "--version",
    [bool] $restart = $false
) {
    
    if (!($checkNames | Where-Object { Get-Command $_ -ErrorAction SilentlyContinue })) {
        $Host.UI.RawUI.FlushInputBuffer()
        Write-Host "`n'$($checkNames -join " or ")' is not in path. purpose: $purpose. Attempt install? (y/n)" -NoNewline
        if ($Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown').Character -ne "y") { echo "  aborting."; exit }
        Write-Host ""

        & $installCommand

        # relaunch script after install to pick up new PATH and continue on
        if ($restart) {
            Write-Host "`nRestarting script to pick up new env vars..."
            Write-Host "unfortunately there's no straightforward way to re-launch new terminals inside vscode without being tied to vscode."
            Write-Host "once this script finally completes, close and re-run inside vscode terminal if that is preferred."
            Start-Process -FilePath "pwsh" -WorkingDirectory $PWD.Path -ArgumentList "-File", "$PSCommandPath"
            exit
        }
    }

    if ($versionMin) {

        $versionOutput = & $checkNames $versionParmName 2>&1
        $checkVersion = ($versionOutput | Select-String -Pattern '\d+(\.\d+)+').Matches[0].Value

        if (!(Test-SemVer -MinVersion $versionMin -CheckVersion $checkVersion)) {

            Write-Host "$checkNames currently $checkVersion, must be >= $versionMin." -NoNewline

            if ($upgradeCommand) {
                Write-Host "` Attempt upgrade? (y/n)" -NoNewline
                if ($Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown').Character -ne "y") { echo "  aborting."; exit }
                Write-Host ""

                # if $upgradeCommand is empty, use $installCommand
                & ($upgradeCommand.ToString().Trim() -eq '' ? $installCommand : $upgradeCommand)

                if ($restart) { 
                    Start-Process -FilePath "pwsh" -ArgumentList "-File", "$PSCommandPath"
                    exit
                }
                else { return }
            }

            Write-Host "  aborting."
            exit
        }
    }
}

function gitHubDlAndInstall(
    [string] $latestUrl,
    [string] $msiRegex
) {
    $msiUrl = ((iwr $latestUrl | ConvertFrom-Json).assets | Where-Object name -match $msiRegex).browser_download_url
    iwr -Uri $msiUrl -OutFile "$env:TEMP\volta.msi"
    Start-Process "$env:temp\volta.msi" -Wait
    # remove-item "$env:TEMP\volta.msi"
}



# volta is considered the latest/greatest node version manager circa Q1 2026 (i.e. instead of NVM, etc)
#   and it also manages pnpm installation and versions
#   pnpm can do some node version management but not project folder specific versions like volta does (pnpm still installs node versions only globally)
# but voltas MSI installer seems to be broken on some key initial pathing...
#   it installs initial shims to c:\program files\volta
#   so that DOES needs to be in path and apparently it adds this to the SYSTEM path
#   but additional package installs go to the USER path at %LOCALAPPDATA%\volta\bin
#   and the installer adds this to the USER path so it resolves BEHIND the c:\program files\volta path!!!
#   so with a clean install volta gives warnings about c:\program files\volta overshadowing %LOCALAPPDATA%\volta\bin arrrg!
#   the best thing to do right now seems to be removing pnpm.* from c:\program files\volta...
# winget has a volta package but it is often out of date, so we download the latest from github releases directly
# dir "$env:ProgramFiles\Volta" | % { if ($_.Name -notlike "volta*" -and $_.Name -notlike "node*") { mv $_ "$env:ProgramFiles\Volta\hide\" } } `
checkInstall "volta" "volta is latest/greatest node & pnpm manager" `
  { gitHubDlAndInstall "https://api.github.com/repos/volta-cli/volta/releases/latest" "windows-x86_64\.msi"; `
    mkdir "$env:ProgramFiles\Volta\hide" -ErrorAction SilentlyContinue; `
    mv "$env:ProgramFiles\Volta\pnpm.*" "$env:ProgramFiles\Volta\hide\"; `
  } `
  -restart $true

# checkInstall "node" "might be needed for components but not directly yet" { volta install node@lts; volta pin node@lts }
checkInstall "pnpm" "required package manager for this project" { volta install pnpm }


checkInstall "openssl" "for local https dev server cert gen" `
    { winget install -e --id Git.Git --interactive --accept-source-agreements --accept-package-agreements } `
    -restart $true

if (!(Test-Path "localhost-key.pem") -or !(Test-Path "localhost-cert.pem")) {
    Write-Host "`nGenerating self-signed certs for https dev server..."
    & openssl req -x509 -newkey rsa:4096 -sha256 -days 825 -nodes `
        -keyout localhost-key.pem `
        -out localhost-cert.pem `
        -subj "/CN=localhost" `
        -addext "subjectAltName=DNS:localhost"
}

$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("localhost-cert.pem")
if (!(Get-ChildItem -Path Cert:\LocalMachine\Root | Where-Object { $_.Thumbprint -eq $cert.Thumbprint })) {

    checkInstall @("sudo", "gsudo") "elevation for adding cert to trusted store" `
        { winget install --id gerardog.gsudo } `
        -restart $true

    gsudo Import-Certificate -FilePath .\localhost-cert.pem -CertStoreLocation Cert:\LocalMachine\Root
}

if (
    !(Test-Path "node_modules") -or
    !(Test-Path "pnpm-lock.yaml") -or
    ([Math]::Abs(((Get-Item "package.json").LastWriteTime - (Get-Item "pnpm-lock.yaml").LastWriteTime).TotalSeconds) -gt 1)
) {
    Write-Host "Running pnpm install to ensure dependencies are up to date..."
    pnpm install
    touch pnpm-lock.yaml package.json
}

Write-Host "Environment check complete. Starting dev runtime..."
volta run pnpm -- run dev