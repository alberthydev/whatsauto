function formatPhoneNumber(phone) {
    let ddd = '49'; // DDD padrão
    let phone1 = '';
    let phone2 = '';

    // Verifica se o telefone é válido
    if (!phone || typeof phone !== 'string') {
        return { ddd: '49', phone1: 'Sem telefone', phone2: 'Sem telefone secundário' };
    }

    if (phone.startsWith('(')) {
        ddd = phone.slice(1, 3);
        phone = phone.slice(4);
    } else if (phone.startsWith('9.')) {
        ddd = '49';
        phone = phone.replace('9.', '9');
    } else if (/^\d{2}/.test(phone)) {
        ddd = phone.slice(0, 2);
        phone = phone.slice(2);
    }

    // Remove tudo que não for número do restante do telefone
    const cleaned = phone.replace(/\D/g, '');
    phone1 = cleaned.slice(0, 9);

    // Extração do segundo telefone
    const remaining = cleaned.slice(9);
    if (remaining.length >= 8 && remaining.length <= 11 && /^[1-9]\d{7,10}$/.test(remaining)) {
        phone2 = remaining; // Apenas números válidos são aceitos
    } else {
        phone2 = "Sem telefone secundário"; // Marca como inválido
    }

    // Valida o DDD
    if (!/^\d{2}$/.test(ddd)) {
        ddd = '49'; // Define o DDD padrão se inválido
    }

    // Valida o telefone principal
    if (!/^\d{8,9}$/.test(phone1)) {
        phone1 = 'Sem telefone'; // Marca como inválido
    }

    return { ddd, phone1, phone2 };
}

function extractPhoneNumbers(phone) {
    // Remove espaços extras e divide por hífen ou barra
    const parts = phone.split(/\s*[-/]\s*/);
    const phones = parts.map(part => formatPhoneNumber(part));
    return phones;
}

function formatTimeWithPeriod(time) {
    const [hours, minutes] = time.split(':').map(Number);
    let period = 'h da manhã';
    let formattedHours = hours;

    if (hours >= 18 && hours <= 23) {
        period = 'h da noite';
        if (hours > 12) {
            formattedHours = hours - 12;
        }
    } else if (hours >= 12) {
        period = 'h da tarde';
        if (hours > 12) {
            formattedHours = hours - 12;
        }
    } else if (hours === 0) {
        formattedHours = 12;
        period = 'h da noite';
    }

    return `${formattedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}${period}`;
}

async function sendMessageToWhatsApp(phone, ddd, message) {
    const fullPhoneNumber = `${phone}`; // Apenas o número sem o DDD
    try {
        const response = await fetch('http://localhost:5000/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone: fullPhoneNumber, ddd: ddd, message: message }) // Inclui o DDD no payload
        });

        const data = await response.json();

        if (response.status === 403) {
            console.error('Application is paused. Cannot send messages.');
            isPaused = true; // Atualiza o estado local para pausado
            return; // Interrompe o envio de mensagens
        }

        if (data.status) {
            console.log(data.status);
        } else {
            console.error(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

document.getElementById("csvFile").addEventListener("change", function() {
    const fileCount = document.getElementById("fileCount");
    const files = this.files;
    if (files.length === 0) {
        fileCount.textContent = "Nenhum arquivo selecionado";
    } else {
        fileCount.textContent = `${files.length} arquivo(s) selecionado(s)`;
    }
});

function populateSecondaryTable(passageiros) {
    const secondaryTableContainer = document.getElementById('secondaryTableContainer');
    const secondaryTableBody = document.getElementById('secondaryTable').getElementsByTagName('tbody')[0];
    secondaryTableBody.innerHTML = ''; // Limpa a tabela antes de preencher

    let hasSecondaryPhones = false;

    passageiros.forEach((passageiro) => {
        if (passageiro.telefone2 !== "Sem telefone secundário") {
            hasSecondaryPhones = true;

            let telefone2 = passageiro.telefone2.replace(/\D/g, ''); // Remove caracteres não numéricos
            let ddd, formattedPhone;

            if (telefone2.length > 9) {
                ddd = telefone2.slice(0, 2); // Pega os dois primeiros números como DDD
                formattedPhone = telefone2.slice(2); // Remove os dois primeiros números do telefone
            } else {
                ddd = '49'; // DDD padrão
                formattedPhone = telefone2; // Usa o telefone como está
            }

            const fullPhone = `${ddd}${formattedPhone}`; // Concatena o DDD com o telefone

            const row = secondaryTableBody.insertRow();
            row.insertCell(0).textContent = passageiro.nome;
            row.insertCell(1).textContent = fullPhone;

            const actionsCell = row.insertCell(2);

            // Botão "Enviar Mensagem"
            const sendButton = document.createElement('button');
            sendButton.textContent = 'Enviar Mensagem';
            sendButton.addEventListener('click', async () => {
                showLoadingOverlay('Encaminhando mensagem...');
                const message = `Olá ${passageiro.nome},\nInformamos que sua viagem está agendada para:\nLocal de destino: ${passageiro.destino}\nData: ${passageiro.dataSaida}\nHora: ${passageiro.horaSaida}\nPor favor, confirme o recebimento desta mensagem.\n\nAtenciosamente, Equipe de Transporte.`;
                await sendMessageToWhatsApp(formattedPhone, ddd, message); // Envia o telefone sem o DDD
                showSuccessMessage();
            });
            actionsCell.appendChild(sendButton);

            // Botão "Editar DDD"
            const editButton = document.createElement('button');
            editButton.textContent = 'Editar DDD';
            editButton.addEventListener('click', () => {
                const newDdd = prompt('Digite o novo DDD:', ddd);
                if (newDdd && /^\d{2}$/.test(newDdd)) {
                    ddd = newDdd;
                    const updatedPhone = `${ddd}${formattedPhone}`;
                    row.cells[1].textContent = updatedPhone; // Atualiza o número na tabela
                } else {
                    alert('DDD inválido. Por favor, insira um DDD com 2 dígitos.');
                }
            });
            actionsCell.appendChild(editButton);
        }
    });

    // Mostra ou esconde a tabela secundária com base na existência de telefones secundários
    secondaryTableContainer.style.display = hasSecondaryPhones ? 'block' : 'none';
}

function createTableForDestination(destination, passageiros, fileHash) {
    const container = document.getElementById('tablesContainer');
    const tableContainer = document.createElement('div');
    tableContainer.classList.add('table-container');
    tableContainer.dataset.fileHash = fileHash; // Associar o hash do arquivo à tabela

    const title = document.createElement('h2'); // Alterado para <h2> para manter o padrão
    title.textContent = `${destination}`;
    title.classList.add('table-title'); // Classe para aplicar o padrão de cor
    tableContainer.appendChild(title);

    const table = document.createElement('table');
    table.classList.add('data-table');
    const thead = table.createTHead();
    const headerRow = thead.insertRow();

    // Adicionar cabeçalhos das colunas
    ['Nome', 'Tipo Viagem', 'Destino', 'Data Saída', 'Hora Saída', 'Telefone', 'Telefone Secundário'].forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    // Adicionar célula para o botão "X"
    const removeHeaderCell = document.createElement('th');
    removeHeaderCell.classList.add('remove-column'); // Adiciona a classe para o estilo
    const removeButton = document.createElement('button');
    removeButton.textContent = 'X';
    removeButton.classList.add('remove-table-button'); // Classe para estilizar o botão
    removeButton.addEventListener('click', () => {
        // Remover passageiros associados ao hash do arquivo
        allExtractedData.passageiros = allExtractedData.passageiros.filter(p => p.fileHash !== fileHash);
        tableContainer.remove(); // Remover a tabela do DOM
        populateSecondaryTable(allExtractedData.passageiros); // Atualizar tabela secundária
    });
    removeHeaderCell.appendChild(removeButton);
    headerRow.appendChild(removeHeaderCell);

    const tbody = table.createTBody();
    passageiros.forEach(passageiro => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = passageiro.nome;
        row.insertCell(1).textContent = passageiro.tipoViagem;
        row.insertCell(2).textContent = passageiro.destino;
        row.insertCell(3).textContent = passageiro.dataSaida;
        row.insertCell(4).textContent = passageiro.horaSaida;
        row.insertCell(5).textContent = `(${passageiro.ddd}) ${passageiro.telefone}`;
        row.insertCell(6).textContent = passageiro.telefone2;
    });

    tableContainer.appendChild(table);

    // Adicionar botão "Mensagem Personalizada"
    const customMessageButton = document.createElement('button');
    customMessageButton.textContent = 'Mensagem Personalizada';
    tableContainer.appendChild(customMessageButton);

    // Adicionar container para textarea e botões
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container');
    messageContainer.style.display = 'none'; // Inicialmente oculto

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Digite sua mensagem personalizada aqui (use {nome} para inserir o nome do paciente)...';
    messageContainer.appendChild(textarea);

    // Botão "Template"
    const templateButton = document.createElement('button');
    templateButton.textContent = 'Template'; // Define a cor amarela
    templateButton.addEventListener('click', () => {
        textarea.value = 'Atenção {nome}!\n\nO horário da viagem foi alterado para XX:XX.\nPor gentileza, confirme o recebimento do aviso do novo horário!';
    });
    messageContainer.appendChild(templateButton);

    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    okButton.addEventListener('click', async () => {
        const customMessage = textarea.value.trim();
        if (!customMessage) {
            alert('A mensagem personalizada não pode estar vazia.');
            return;
        }

        showLoadingOverlay('Encaminhando mensagens...'); // Exibe a div de carregamento

        try {
            for (const passageiro of passageiros) {
                const message = customMessage.replace('{nome}', passageiro.nome);
                await sendMessageToWhatsApp(passageiro.telefone, passageiro.ddd, message);
            }

            showSuccessMessage(); // Exibe a mensagem de sucesso após o envio
        } catch (error) {
            console.error('Erro ao enviar mensagens personalizadas:', error);
            hideLoadingOverlay(); // Oculta o overlay em caso de erro
        }
    });
    messageContainer.appendChild(okButton);

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancelar';
    cancelButton.addEventListener('click', () => {
        resetMessageContainer();
    });
    messageContainer.appendChild(cancelButton);

    tableContainer.appendChild(messageContainer);

    // Alternar entre o botão e o container de mensagem
    customMessageButton.addEventListener('click', () => {
        customMessageButton.style.display = 'none';
        messageContainer.style.display = 'block';
    });

    function resetMessageContainer() {
        textarea.value = '';
        messageContainer.style.display = 'none';
        customMessageButton.style.display = 'inline-block';
    }

    container.appendChild(tableContainer);
}

let allExtractedData = { passageiros: [] }; // Tornar global para acesso no botão de envio

const processedFileHashes = new Set(); // Armazena hashes dos arquivos processados

// Função para calcular o hash de um arquivo
async function calculateFileHash(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const processFile = (file, fileHash) => { // Define the processFile function
    return new Promise((resolve, reject) => {
        const extractedData = {
            destino: "Não informado",
            dataSaida: "Não informado",
            horaSaida: "Não informado",
            passageiros: []
        };

        Papa.parse(file, {
            skipEmptyLines: true,
            complete: function(result) {
                const data = result.data;
                let isPassengerSection = false;
                let phoneColumnIndex = -1;

                for (let i = 0; i < data.length; i++) {
                    let row = data[i];

                    if (Array.isArray(row)) {
                        // Detectar a coluna de telefone dinamicamente
                        if (i === 9) { // Supondo que a linha 9 seja o cabeçalho
                            phoneColumnIndex = detectPhoneColumn(row);
                            continue; // Pular para a próxima linha
                        }

                        // Percorre toda a linha para encontrar as palavras-chave
                        for (let j = 0; j < row.length; j++) {
                            if (row[j]?.includes("Local Destino:")) {
                                extractedData.destino = row[j].replace("Local Destino:", "").trim();
                            }
                            if (row[j]?.includes("Data Saída:")) {
                                extractedData.dataSaida = row[j].replace("Data Saída:", "").trim();
                            }
                            if (row[j]?.includes("Hora Saída:")) {
                                extractedData.horaSaida = formatTimeWithPeriod(row[j].replace("Hora Saída:", "").trim());
                            }
                        }

                        // Identificar quando começa a seção de passageiros
                        if (!isPassengerSection && i > 9 && row[0] && row[0] !== "") {
                            isPassengerSection = true;
                        }

                        // Ignorar cabeçalhos repetidos em páginas subsequentes
                        if (isPassengerSection && row[0] === "Passageiro") {
                            continue;
                        }

                        // Filtrar apenas linhas válidas de passageiros
                        if (isPassengerSection && row[0] && row[0] !== "Total de Passageiros:" && isValidPassengerRow(row)) {
                            let phone = getPhoneFromRow(row, phoneColumnIndex);
                            const { ddd, phone1, phone2 } = formatPhoneNumber(phone);
                            const fullPhoneNumber = `${phone1}`;
                            const telefone2 = phone2.length >= 8 ? phone2 : "Sem telefone secundário";

                            const tipoViagem = row[18]?.trim() || row[21]?.trim() || row[20]?.trim() || row[22]?.trim() || "Ida/Volta";

                            extractedData.passageiros.push({
                                nome: row[0] || "Nome não informado",
                                telefone: fullPhoneNumber || "Sem telefone",
                                telefone2: telefone2,
                                tipoViagem: tipoViagem,
                                destino: extractedData.destino,
                                dataSaida: extractedData.dataSaida,
                                horaSaida: extractedData.horaSaida,
                                ddd: ddd,
                                fileHash: fileHash // Use the fileHash passed as a parameter
                            });
                        }

                        // Parar de coletar passageiros ao encontrar "Total de Passageiros"
                        if (isPassengerSection && row[0] === "Total de Passageiros:") {
                            isPassengerSection = false; // Permitir continuar em páginas subsequentes
                        }
                    }
                }

                resolve(extractedData);
            },
            error: function(error) {
                reject(error);
            }
        });
    });
};

const processAllFiles = async (files) => { // Accept files as a parameter
    const newPassengers = []; // Store passengers from new files

    for (const file of files) {
        const fileHash = await calculateFileHash(file);
        if (processedFileHashes.has(fileHash)) {
            console.warn(`Arquivo duplicado ignorado: ${file.name}`);
            continue; // Ignore duplicate files
        }
        processedFileHashes.add(fileHash);

        const extractedData = await processFile(file, fileHash); // Use processFile here
        newPassengers.push(...extractedData.passageiros);

        // Create a table for each destination
        createTableForDestination(extractedData.destino, extractedData.passageiros, fileHash);
    }

    // Merge new passengers with existing ones
    allExtractedData.passageiros.push(...newPassengers);

    // Update the secondary table
    populateSecondaryTable(allExtractedData.passageiros);
};

document.getElementById("loadButton").addEventListener("click", function() {
    const fileInput = document.getElementById("csvFile");
    const files = fileInput.files; // Declare and assign files here

    if (files.length === 0) {
        console.error("Nenhum arquivo selecionado.");
        return;
    }

    processAllFiles(files); // Pass files as an argument
});

document.getElementById("clearButton").addEventListener("click", function() {
    location.reload();
});

function showLoadingOverlay(message) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    const loadingOkButton = document.getElementById('loadingOkButton');
    const loadingSpinner = document.getElementById('loadingSpinner');

    loadingMessage.textContent = message;
    loadingOkButton.classList.add('hidden'); // Hide the "Ok" button initially
    loadingSpinner.classList.remove('hidden'); // Ensure the spinner is visible
    loadingOverlay.classList.add('visible'); // Show the overlay
}

function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.remove('visible'); // Hide the overlay
}

function showSuccessMessage() {
    const loadingMessage = document.getElementById('loadingMessage');
    const loadingOkButton = document.getElementById('loadingOkButton');
    const loadingSpinner = document.getElementById('loadingSpinner');

    loadingMessage.textContent = 'Todas as mensagens foram enviadas!';
    loadingOkButton.classList.remove('hidden'); // Show the "Ok" button
    loadingSpinner.classList.add('hidden'); // Hide the spinner
}

// Add event listener to the "Ok" button to hide the overlay
document.getElementById('loadingOkButton').addEventListener('click', hideLoadingOverlay);

document.getElementById("sendMessagesButton").addEventListener("click", async function() {
    if (allExtractedData.passageiros.length === 0) {
        console.error("Nenhum passageiro para enviar mensagens.");
        return;
    }

    showLoadingOverlay('Encaminhando mensagem...');
    await sendMessages(allExtractedData.passageiros, false); // Envio sem pausa
});

window.addEventListener("scroll", () => {
    const navbar = document.querySelector(".navbar");
    if (window.scrollY > 0) {
        navbar.classList.add("scrolled");
    } else {
        navbar.classList.remove("scrolled");
    }
});

// Função para detectar dinamicamente a coluna de telefone
function detectPhoneColumn(headerRow) {
    for (let i = 0; i < headerRow.length; i++) {
        const cell = headerRow[i]?.toLowerCase();
        if (cell && (cell.includes("telefone") || cell.includes("contato") || cell.match(/\d{4}-\d{4}/))) {
            return i; // Retorna o índice da coluna de telefone
        }
    }
    return -1; // Retorna -1 se nenhuma coluna de telefone for encontrada
}

// Função para obter o telefone de uma linha
function getPhoneFromRow(row, phoneColumnIndex) {
    if (phoneColumnIndex !== -1 && row[phoneColumnIndex]?.trim()) {
        return row[phoneColumnIndex];
    }

    const possiblePhoneIndexes = [12, 13, 14, 17];
    for (const index of possiblePhoneIndexes) {
        if (row[index]?.trim() && row[index].match(/\d{4}-\d{4}/)) {
            return row[index];
        }
    }

    return "";
}

// Função para validar se a linha é de um passageiro
function isValidPassengerRow(row) {
    const nome = row[0]?.trim();
    return nome && isNaN(nome) && !nome.toLowerCase().includes("roteiro") && !nome.toLowerCase().includes("finalidade");
}

// Atualize a função sendMessages para remover lógica de pausa
async function sendMessages(passageiros) {
    console.log('Iniciando envio de mensagens...'); // Log inicial

    for (const passageiro of passageiros) {
        const message = createMessage(passageiro); // Use a função para criar a mensagem

        try {
            console.log(`Enviando mensagem para: ${passageiro.nome}`); // Log para depuração
            console.log(`Mensagem: ${message}`); // Log para verificar a mensagem gerada
            await sendMessageToWhatsApp(passageiro.telefone, passageiro.ddd, message);
            passageiro.encaminhada = 1; // Marca como enviada
        } catch (error) {
            console.error(`Erro ao enviar mensagem para ${passageiro.nome}:`, error);
        }
    }

    showSuccessMessage(); // Exibe mensagem de sucesso após o envio
}

function createMessage(passageiro) {
    return `Olá ${passageiro.nome},\nInformamos que sua viagem está agendada para:\nLocal de destino: ${passageiro.destino}\nData: ${passageiro.dataSaida}\nHora: ${passageiro.horaSaida}\nPor favor, confirme o recebimento desta mensagem.\n\nAtenciosamente, Equipe de Transporte.`;
}
