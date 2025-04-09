@echo off
REM Ativa o ambiente virtual, se necessário (descomente a linha abaixo e ajuste o caminho)
REM call .\venv\Scripts\activate

REM Inicia a API Flask
start cmd /k "python .\api.py"

REM Aguarda 2 segundos para garantir que a API esteja em execução
timeout /t 2 > nul

REM Abre o arquivo index.html no navegador padrão
start "" "index.html"

REM Finaliza o script
exit