# Signs the native addon with a trusted code-signing certificate.
# Requirements:
#   - Windows SDK (signtool.exe) installed and on PATH
#   - A code-signing certificate (.pfx) — OV/EV from a trusted CA,
#     or Azure Trusted Signing identity.
#
# Usage (PowerShell):
#   $env:CERT_PFX = "C:\path\to\cert.pfx"
#   $env:CERT_PASS = "password"
#   powershell -ExecutionPolicy Bypass -File scripts/sign.ps1
#
# A timestamp is applied so the signature stays valid after the cert expires.

$ErrorActionPreference = "Stop"

$Pfx = $env:CERT_PFX
$Password = $env:CERT_PASS

if (-not $Pfx) {
    Write-Error "CERT_PFX environment variable is not set (path to .pfx)."
    exit 1
}
if (-not (Test-Path $Pfx)) {
    Write-Error "Certificate not found: $Pfx"
    exit 1
}

$signtool = Get-Command signtool.exe -ErrorAction SilentlyContinue
if (-not $signtool) {
    Write-Error "signtool.exe not found. Install the Windows SDK (or Visual Studio with SDK)."
    exit 1
}

# RFC3161 timestamp authority (keeps signature valid after cert expiry)
$TS = "http://timestamp.digicert.com"

$targets = @(
    "target/release/inter_op.dll",
    "target/release/inter_op.node",
    "crates/node-bridge/index.node"
)

foreach ($t in $targets) {
    if (Test-Path $t) {
        Write-Output "Signing $t ..."
        & signtool.exe sign /f "$Pfx" /p "$Password" /tr $TS /td sha256 /fd sha256 "$t"
        if ($LASTEXITCODE -ne 0) { Write-Error "Signing failed for $t"; exit $LASTEXITCODE }
    } else {
        Write-Warning "Skipping (not found): $t"
    }
}

Write-Output "Done. Verify with: signtool verify /pa target/release/inter_op.node"
