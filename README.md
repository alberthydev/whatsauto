# WhatsAuto
Sistema automático que viza auxiliar no trabalho de encaminhamento de mensagens para os pacientes que irão nas viagens ofertadas pela prefeitura do município de Videira.

## Como Funciona

O sistema da saúde gera um arquivo CSV, contendo informações sobre as viagens que irão ser feitas nos próximos dias, esse CSV é analisado na aplicação e então extrai os dados necessários para gerar a mensagem automática.

+ Nome do Paciente
+ Destino
+ Data da Saída
+ Hora da Saída

Além destas informações, o arquivo também contém informação de contato do paciente, essa informação será necessário para que a aplicação saiba para qual número deve enviar a mensagem automática.

+ DDD do paciênte;
+ Número do paciênte;

Depois de analisado essas informações, ele usa uma API para se comunicar com uma biblioteca em python para iniciar o envio das mensagens, o sistema possui falhas e não é muito seguro, porém, para
o contexto da aplicação, essas saídas podem ser implementadas. (O ideal sempre é usar uma api do próprio WhatsApp para fazer esta ingração, porém, da forma que foi implementado, a aplicação fica 
gratuíta e resolve o problema).
