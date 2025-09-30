#include <WiFi.h>
#include <WebServer.h>

// -------- Access Point --------
const char *ssid = "MaquinaESP";
const char *password = "ProjetoVencedor";

// -------- Pinos --------
#define PINO_D12 12
#define PINO_D13 13
#define PINO_D18 18
#define PINO_D19 19
#define PINO_D25 25
#define PINO_D26 26

// -------- Encoder --------
float distanciaFinal = 0.0;
volatile long encoderPulsos = 0;
const float AVANCO_ROSCA_MM = 2.0;
const int PULSOS_POR_ROTACAO = 400;
const float MM_POR_PULSO = AVANCO_ROSCA_MM / PULSOS_POR_ROTACAO;

bool contandoEncoder = false;

// -------- Estado da Máquina --------
enum EstadoMaquina
{
  PARADO,
  EXECUTANDO_AVANCO,
  EXECUTANDO_RECUO,
  PARADO_EMERGENCIA,
  REINICIANDO
};

EstadoMaquina estadoAtual = PARADO;

// -------- Web Server --------
WebServer server(80);

// -------- Encoder ISR --------
void IRAM_ATTR encoderISR()
{
  if (contandoEncoder)
  {
    encoderPulsos++;
  }
}

// -------- HTML + JS --------
const char *htmlPage = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Painel da Máquina</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 20px; }
    button { font-size: 2.5em; padding: 10px 20px; margin: 10px; }
    #status { font-size: 3em; margin: 20px; }
  </style>
</head>
<body>
  <h1>ToolSave - Controle da Máquina</h1>
  <div id="status">Status: ---</div>
  <div id="distancia">Distância: ---</div>
  <button onclick="sendCmd('start')">Iniciar Ciclo</button>
  <button onclick="sendCmd('stop')">Parar</button>
  <button onclick="sendCmd('restart')">Reiniciar</button>

  <script>
    function sendCmd(cmd) {
      fetch('/' + cmd);
    }

    function atualizarStatus() {
      fetch('/status')
        .then(response => response.json())
        .then(data => {
          document.getElementById('status').innerText = "Status: " + data.estado;
          document.getElementById('distancia').innerText = "Distância: " + data.distancia + " mm";
        });
    }

    setInterval(atualizarStatus, 1000);
  </script>
</body>
</html>
)rawliteral";

// -------- Handlers --------
void handleRoot()
{
  server.send(200, "text/html", htmlPage);
}

void handleStart()
{
  if (estadoAtual == PARADO || estadoAtual == REINICIANDO)
  {
    estadoAtual = EXECUTANDO_AVANCO;
    Serial.println("Ciclo iniciado via web.");
  }
  server.send(200, "text/plain", "OK");
}

void handleStop()
{
  estadoAtual = PARADO_EMERGENCIA;
  contandoEncoder = false;
  digitalWrite(PINO_D12, HIGH);
  digitalWrite(PINO_D13, HIGH);
  Serial.println("Parada de emergência.");
  server.send(200, "text/plain", "OK");
}

void handleRestart()
{
  estadoAtual = REINICIANDO;
  contandoEncoder = false;
  Serial.println("Reiniciando máquina...");
  server.send(200, "text/plain", "OK");
}

void handleStatus()
{
  String estadoStr;
  switch (estadoAtual)
  {
  case PARADO:
    estadoStr = "Parado";
    break;
  case EXECUTANDO_AVANCO:
    estadoStr = "Executando (Avanço)";
    break;
  case EXECUTANDO_RECUO:
    estadoStr = "Executando (Recuo)";
    break;
  case PARADO_EMERGENCIA:
    estadoStr = "Parado (Emergência)";
    break;
  case REINICIANDO:
    estadoStr = "Reiniciando";
    break;
  }

  String json = "{";
  json += "\"estado\":\"" + estadoStr + "\",";
  json += "\"distancia\":\"" + String(distanciaFinal, 2) + "\"";
  json += "}";

  server.send(200, "application/json", json);
}

// -------- Setup --------
void setup()
{
  Serial.begin(115200);

  pinMode(PINO_D12, OUTPUT);
  pinMode(PINO_D13, OUTPUT);
  pinMode(PINO_D18, INPUT_PULLDOWN);
  pinMode(PINO_D19, INPUT_PULLDOWN);
  pinMode(PINO_D25, INPUT);
  pinMode(PINO_D26, INPUT_PULLUP); // <== MUDANÇA AQUI para pullup no encoder

  digitalWrite(PINO_D12, HIGH);
  digitalWrite(PINO_D13, HIGH);

  attachInterrupt(digitalPinToInterrupt(PINO_D26), encoderISR, RISING); // <== MUDANÇA: CHANGE para pegar todas mudanças

  WiFi.softAP(ssid, password);
  Serial.print("Access Point criado. IP: ");
  Serial.println(WiFi.softAPIP()); // Deve ser 192.168.4.1

  // Rotas
  server.on("/", handleRoot);
  server.on("/start", handleStart);
  server.on("/stop", handleStop);
  server.on("/restart", handleRestart);
  server.on("/status", handleStatus);
  server.begin();
  Serial.println("Servidor Web iniciado.");
}

// -------- Loop principal --------
void loop()
{
  server.handleClient();

  // Segurança: desliga motor se não estiver executando
  if (estadoAtual != EXECUTANDO_AVANCO && estadoAtual != EXECUTANDO_RECUO && estadoAtual != REINICIANDO)
  {
    digitalWrite(PINO_D12, HIGH);
    digitalWrite(PINO_D13, HIGH);
    contandoEncoder = false;
  }

  // Segurança extra: para se atingiu fim de curso
  if (digitalRead(PINO_D18) == HIGH)
    digitalWrite(PINO_D12, HIGH);
  if (digitalRead(PINO_D19) == HIGH)
    digitalWrite(PINO_D13, HIGH);

  switch (estadoAtual)
  {
  case EXECUTANDO_AVANCO:
    if (!contandoEncoder)
    {
      Serial.println("Movendo para frente...");
      encoderPulsos = 0;
      contandoEncoder = true;
      digitalWrite(PINO_D12, LOW);
    }

    if (digitalRead(PINO_D18) == HIGH)
    {
      digitalWrite(PINO_D12, HIGH);
      noInterrupts();
      long pulsosCopy = encoderPulsos;
      interrupts();

      float distanciaBruta = abs(pulsosCopy) * MM_POR_PULSO;
      distanciaFinal = 125 - distanciaBruta;
      contandoEncoder = false;
      delay(2000); // Breve pausa (opcional)
      estadoAtual = EXECUTANDO_RECUO;
    }
    break;

  case EXECUTANDO_RECUO:
    contandoEncoder = false;

    digitalWrite(PINO_D13, LOW);

    if (digitalRead(PINO_D19) == HIGH)
    {
      digitalWrite(PINO_D13, HIGH);
      contandoEncoder = false;
      Serial.println("Ciclo completo.");
      estadoAtual = PARADO;
    }
    break;

  case PARADO_EMERGENCIA:
    Serial.println("Parada de emergência acionada.");
    digitalWrite(PINO_D12, HIGH);
    digitalWrite(PINO_D13, HIGH);
    contandoEncoder = false;
    estadoAtual = PARADO;
    break;

  case REINICIANDO:
    encoderPulsos = 0;
    digitalWrite(PINO_D12, HIGH);
    digitalWrite(PINO_D13, LOW);
    if (digitalRead(PINO_D19) == HIGH)
    {
      digitalWrite(PINO_D13, HIGH);
      Serial.println("Máquina reiniciada.");
      estadoAtual = PARADO;
    }
    break;

  case PARADO:
    // Espera apenas
    break;
  }
}
