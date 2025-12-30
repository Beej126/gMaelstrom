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
    [string] $reason,
    [ScriptBlock] $installCommand,
    [string] $versionMin,
    [ScriptBlock] $upgradeCommand, # provide empty scriptblock to use the $installCommand for upgrade
    [string] $versionParmName = "--version",
    [bool] $restart = $false
) {
    
    if (!($checkNames | Where-Object { Get-Command $_ -ErrorAction SilentlyContinue })) {
        $Host.UI.RawUI.FlushInputBuffer()
        Write-Host "`n'$checkNames' is not in path. purpose: $purpose. Attempt install? (y/n)" -NoNewline
        if ($Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown').Character -ne "y") { echo "  aborting."; exit }

        & $installCommand

        # relaunch script after install to pick up new PATH and continue on
        if ($restart) { 
            Start-Process -FilePath "pwsh" -ArgumentList "-File", "$PSCommandPath"
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



checkInstall "nvm" "preferred Node.js install manager" `
    { winget install -e --id CoreyButler.NVMforWindows --accept-source-agreements --accept-package-agreements } `
    -restart $true

checkInstall "node" "everybody loves raymond =)" `
    { nvm install latest; nvm use latest } `
    -versionMin "25" { }

checkInstall "pnpm" "much improved package manager. e.g. finally jsonc comments in package.json, yay!! =)" `
    { npm install -g pnpm }

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

Write-Host "Environment check complete. Starting dev runtime..."
pnpm run dev