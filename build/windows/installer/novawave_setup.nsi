Unicode true

; ================================================================
;  NovaWave - Windows Installer
;  Compile:  makensis novawave_setup.nsi
;  Requires: NSIS 3.x  https://nsis.sourceforge.io
; ================================================================

; ---- App Info ----
!define APP_NAME        "NovaWave"
!define APP_VERSION     "3.0.6"
!define APP_PUBLISHER   "SnuggleDino"
!define APP_EXE         "novawave.exe"
!define UNINST_KEY      "Software\Microsoft\Windows\CurrentVersion\Uninstall\SnuggleDinoNovaWave"

; ---- Paths (relative to this .nsi file) ----
!define BINARY          "..\..\bin\novawave.exe"
!define README          "..\..\..\README.md"
!define ICON            "..\icon.ico"
!define OUTFILE         "..\..\bin\NovaWave-${APP_VERSION}-Setup.exe"

; ================================================================
;  MUI2 Setup
; ================================================================
!include "MUI2.nsh"
!include "x64.nsh"
!include "WinVer.nsh"

!define MUI_ICON                        "${ICON}"
!define MUI_UNICON                      "${ICON}"
!define MUI_ABORTWARNING
!define MUI_ABORTWARNING_TEXT           "Are you sure you want to cancel the NovaWave installation?"
!define MUI_FINISHPAGE_NOAUTOCLOSE

; Welcome page
!define MUI_WELCOMEPAGE_TITLE           "Welcome to NovaWave ${APP_VERSION}"
!define MUI_WELCOMEPAGE_TEXT            "This wizard will install NovaWave ${APP_VERSION} on your computer.$\r$\n$\r$\nNovaWave is a desktop music player - no ads, no clutter.$\r$\n$\r$\nClick Next to continue."

; Finish page - Launch + README checkboxes
!define MUI_FINISHPAGE_RUN              "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT         "Launch NovaWave"
!define MUI_FINISHPAGE_SHOWREADME       "$INSTDIR\README.md"
!define MUI_FINISHPAGE_SHOWREADME_TEXT  "Open README"
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED

; ---- Pages ----
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ================================================================
;  General
; ================================================================
Name                "${APP_NAME} ${APP_VERSION}"
OutFile             "${OUTFILE}"
InstallDir          "$PROGRAMFILES64\${APP_PUBLISHER}\${APP_NAME}"
InstallDirRegKey    HKLM "Software\${APP_PUBLISHER}\${APP_NAME}" "InstallDir"
ShowInstDetails     show
ShowUninstDetails   show
RequestExecutionLevel admin
ManifestDPIAware    true

; ---- Version resource ----
VIProductVersion    "3.0.6.0"
VIFileVersion       "3.0.6.0"
VIAddVersionKey     "ProductName"     "${APP_NAME}"
VIAddVersionKey     "CompanyName"     "${APP_PUBLISHER}"
VIAddVersionKey     "FileDescription" "${APP_NAME} Installer"
VIAddVersionKey     "ProductVersion"  "${APP_VERSION}"
VIAddVersionKey     "FileVersion"     "${APP_VERSION}"
VIAddVersionKey     "LegalCopyright"  "© 2026 ${APP_PUBLISHER}"

; ================================================================
;  Pre-install checks
; ================================================================
Function .onInit
    ; Require 64-bit Windows
    ${IfNot} ${IsNativeAMD64}
        MessageBox MB_ICONSTOP "NovaWave requires a 64-bit Windows system (x64)."
        Quit
    ${EndIf}

    ; Require Windows 10 or later
    ${IfNot} ${AtLeastWin10}
        MessageBox MB_ICONSTOP "NovaWave requires Windows 10 or later."
        Quit
    ${EndIf}
FunctionEnd

; ================================================================
;  Install
; ================================================================
Section "NovaWave" SEC_MAIN
    SectionIn RO  ; mandatory section

    SetShellVarContext all
    SetOutPath "$INSTDIR"

    ; Main executable
    File "${BINARY}"

    ; README (opened optionally from finish page)
    File "${README}"

    ; Start Menu shortcut
    CreateDirectory "$SMPROGRAMS\${APP_NAME}"
    CreateShortcut  "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" \
                    "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0

    ; Desktop shortcut
    CreateShortcut  "$DESKTOP\${APP_NAME}.lnk" \
                    "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0

    ; Uninstaller
    WriteUninstaller "$INSTDIR\uninstall.exe"

    ; Add/Remove Programs entry
    WriteRegStr   HKLM "${UNINST_KEY}" "DisplayName"          "${APP_NAME}"
    WriteRegStr   HKLM "${UNINST_KEY}" "DisplayVersion"        "${APP_VERSION}"
    WriteRegStr   HKLM "${UNINST_KEY}" "Publisher"             "${APP_PUBLISHER}"
    WriteRegStr   HKLM "${UNINST_KEY}" "DisplayIcon"           "$INSTDIR\${APP_EXE}"
    WriteRegStr   HKLM "${UNINST_KEY}" "InstallLocation"       "$INSTDIR"
    WriteRegStr   HKLM "${UNINST_KEY}" "UninstallString"       '"$INSTDIR\uninstall.exe"'
    WriteRegStr   HKLM "${UNINST_KEY}" "QuietUninstallString"  '"$INSTDIR\uninstall.exe" /S'
    WriteRegDWORD HKLM "${UNINST_KEY}" "NoModify"              1
    WriteRegDWORD HKLM "${UNINST_KEY}" "NoRepair"              1

    ; Save install dir
    WriteRegStr HKLM "Software\${APP_PUBLISHER}\${APP_NAME}" "InstallDir" "$INSTDIR"
SectionEnd

; ================================================================
;  Uninstall
; ================================================================
Section "Uninstall"
    SetShellVarContext all

    ; App files
    Delete "$INSTDIR\${APP_EXE}"
    Delete "$INSTDIR\README.md"
    Delete "$INSTDIR\uninstall.exe"
    RMDir  "$INSTDIR"
    RMDir  "$PROGRAMFILES64\${APP_PUBLISHER}"

    ; WebView2 user data
    RMDir /r "$AppData\novawave"

    ; Shortcuts
    Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
    RMDir  "$SMPROGRAMS\${APP_NAME}"
    Delete "$DESKTOP\${APP_NAME}.lnk"

    ; Registry
    DeleteRegKey HKLM "${UNINST_KEY}"
    DeleteRegKey HKLM "Software\${APP_PUBLISHER}\${APP_NAME}"
SectionEnd
