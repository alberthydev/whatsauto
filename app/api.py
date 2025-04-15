from flask import Flask, request, jsonify
from flask_cors import CORS
import pywhatkit as kit
import time
import pyautogui
from pynput import keyboard
import threading 
import sys

app = Flask(__name__)
CORS(app)  # Adicione esta linha para habilitar CORS

pause_state = {'paused': False}  # Variável global para controlar o estado de pausa
ctrl_pressed = False  # Variável global para rastrear o estado da tecla Ctrl

def on_press(key):
    global ctrl_pressed
    try:
        if key == keyboard.Key.ctrl_l or key == keyboard.Key.ctrl_r:  # Detecta quando qualquer tecla Ctrl é pressionada
            ctrl_pressed = True
        elif ctrl_pressed and (key == keyboard.KeyCode.from_char('ç') or str(key) == "'\\x1d'"):  # Detecta Ctrl+ç
            pause_state['paused'] = not pause_state['paused']  # Alterna o estado de pausa
            if pause_state['paused']:
                print("Aplicação pausada.")  # Log para pausa
            else:
                print("\nAplicação despausada.")  # Log para despausa
    except AttributeError:
        # Ignora teclas especiais que não possuem atributo 'char'
        pass
    except Exception as e:
        print(f"Erro ao capturar tecla: {e}")

def on_release(key):
    global ctrl_pressed
    if key == keyboard.Key.ctrl_l or key == keyboard.Key.ctrl_r:  # Detecta quando qualquer tecla Ctrl é liberada
        ctrl_pressed = False

def start_keyboard_listener():
    # Inicia o listener de teclado em uma thread separada
    with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
        listener.join()

@app.route('/pause', methods=['POST'])
def toggle_pause():
    action = request.json.get('action')
    if action == 'pause':
        pause_state['paused'] = True
    elif action == 'resume':
        pause_state['paused'] = False
    return jsonify({'paused': pause_state['paused']}), 200

@app.route('/status', methods=['GET'])
def get_status():
    print(f"Estado de pausa consultado: {pause_state['paused']}")  # Log para depuração
    return jsonify({'paused': pause_state['paused']}), 200

@app.route('/send_message', methods=['POST'])
def send_message():
    # Aguarda até que a pausa seja desativada
    animation = ["Aplicação pausada. Aguardando para continuar ", 
                 "Aplicação pausada. Aguardando para continuar  ", 
                 "Aplicação pausada. Aguardando para continuar   "]
    animation_index = 0

    while pause_state['paused']:
        sys.stdout.write(f"\r{animation[animation_index]}")  # Atualiza a linha no terminal
        sys.stdout.flush()
        animation_index = (animation_index + 1) % len(animation)  # Alterna entre os estados da animação
        time.sleep(0.5)  # Aguarda 0.5 segundos antes de atualizar

    sys.stdout.write("\r" + " " * len(animation[0]) + "\r")  # Limpa a linha após sair do loop
    sys.stdout.flush()

    data = request.json
    phone = data.get('phone')
    ddd = data.get('ddd')  
    message = data.get('message')
    
    if not phone or not ddd or not message:
        return jsonify({'error': 'Phone, DDD, and message are required'}), 400
    
    try:
        # Formata o número no padrão internacional
        full_phone_number = f"+55{ddd}{phone}"
        
        # Enviar mensagem instantaneamente
        kit.sendwhatmsg_instantly(full_phone_number, message)
        
        pyautogui.click(x=1513, y=849)  
        pyautogui.press('enter')

        time.sleep(3)
        
        pyautogui.hotkey('ctrl', 'w')
        
        return jsonify({'status': 'Message sent successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Iniciando API...")  # Mensagem para indicar que o servidor está iniciando
    threading.Thread(target=start_keyboard_listener, daemon=True).start()
    app.run(port=5000)
