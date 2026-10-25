!include "nsDialogs.nsh"

!ifdef BUILD_UNINSTALLER
Var /GLOBAL DeleteLocalData
Var /GLOBAL DeleteLocalDataCheckbox
!endif

!macro customUnWelcomePage
  !insertmacro MUI_UNPAGE_WELCOME
  UninstPage custom un.ShowDataChoice un.SaveDataChoice
!macroend

!ifdef BUILD_UNINSTALLER
Function un.ShowDataChoice
  StrCpy $DeleteLocalData 0
  nsDialogs::Create 1018
  Pop $0
  ${if} $0 == error
    Abort
  ${endIf}

  ${NSD_CreateLabel} 0 0 100% 32u "Os dados do SMLurker serão mantidos para uma futura instalação, a menos que você marque a opção abaixo."
  Pop $0
  ${NSD_CreateCheckbox} 0 42u 100% 24u "Apagar dados locais, configurações e lista de canais."
  Pop $DeleteLocalDataCheckbox
  nsDialogs::Show
FunctionEnd

Function un.SaveDataChoice
  ${NSD_GetState} $DeleteLocalDataCheckbox $DeleteLocalData
FunctionEnd
!endif

!macro customUnInstall
  ${ifNot} ${isUpdated}
    RMDir /r "$LOCALAPPDATA\smlurker-updater"
    ${if} $DeleteLocalData == ${BST_CHECKED}
      RMDir /r "$APPDATA\SMLurker"
    ${endIf}
  ${endIf}
!macroend
