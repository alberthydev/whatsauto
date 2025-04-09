@echo off
echo Verificando versao do Python...
python --version
if %errorlevel% neq 0 (
    echo Python não encontrado! Baixando e instalando...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.2/python-3.12.2-amd64.exe' -OutFile 'python_installer.exe'}"
    start /wait python_installer.exe /quiet InstallAllUsers=1 PrependPath=1
    del python_installer.exe
    echo Python instalado!
) else (
    echo Atualizando Python...
    python -m pip install --upgrade pip
)

echo Instalando dependencias...
pip install -r "%~dp0\..\requirements.txt"
echo Concluido!
pause