@echo off
rem Publica/atualiza o repositorio catalogo-imoveis no GitHub usando o login que ja existe neste Windows.
rem Duplo clique. Na primeira vez: cria o repositorio publico, envia tudo e liga o GitHub Pages.
setlocal EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

where git >nul 2>nul || (echo Git nao encontrado. Instale em https://git-scm.com/download/win e rode de novo. & pause & exit /b 1)
set TEMGH=0
where gh >nul 2>nul && set TEMGH=1

if !TEMGH!==1 (
  gh auth status >nul 2>nul || gh auth login --web --git-protocol https
  for /f "delims=" %%u in ('gh api user -q .login') do set GHUSER=%%u
)

if not exist .git git init -b main
git config user.name >nul 2>nul || git config user.name "Natalie"
if defined GHUSER (git config user.email >nul 2>nul || git config user.email "!GHUSER!@users.noreply.github.com")
git config user.email >nul 2>nul || (set /p EMAIL=Email para os commits: & git config user.email "!EMAIL!")

if exist ..\Painel_imoveis\dados_painel.json (
  where python >nul 2>nul && python scripts\copiar_do_painel.py ..
)

git add -A
git commit -m "Atualiza catalogo de imoveis" >nul 2>nul && echo Commit criado. || echo Nada novo para commitar.

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  if !TEMGH!==1 (
    gh repo create catalogo-imoveis --public --source . --remote origin --description "Catalogo de imoveis em Goiania (painel + planilha)"
  ) else (
    echo Crie um repositorio VAZIO chamado catalogo-imoveis em https://github.com/new
    set /p GHUSER=Seu usuario do GitHub: 
    git remote add origin https://github.com/!GHUSER!/catalogo-imoveis.git
  )
)

git push -u origin main || (echo Falha no push. Veja a mensagem acima. & pause & exit /b 1)

if !TEMGH!==1 (
  gh api -X POST repos/!GHUSER!/catalogo-imoveis/pages -f build_type=workflow >nul 2>nul
  gh api -X PUT repos/!GHUSER!/catalogo-imoveis/pages -f build_type=workflow >nul 2>nul
  echo.
  echo Pronto. Em 1-2 minutos o site fica em: https://!GHUSER!.github.io/catalogo-imoveis/
) else (
  echo.
  echo Pronto. Se for a primeira vez: no GitHub, Settings ^> Pages ^> Source: GitHub Actions.
)
pause
