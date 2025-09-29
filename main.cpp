#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// ============ CONFIG Wi-Fi ============
const char *ssid = "K";
const char *password = "kaiolito";

// ============ CONFIG Firebase ============
#define API_KEY "AIzaSyDYzKk18gri7x4_p3BfbI9kizYNuqJYYF4"
#define DATABASE_URL "projeto-integrador-384cb-default-rtdb.firebaseio.com"

// Pinos usados
#define PINO_D12 12 // rele 1 (Motor)
#define PINO_D13 13 // rele 2 (Motor)
#define PINO_D18 18 // fim de curso 1
#define PINO_D19 19 // fim de curso 2
#define PINO_D25 25 // lado 1 encoder
#define PINO_D26 26 // lado 2 encoder

// Objetos Firebase
FirebaseData fbdo;
FirebaseConfig config;

String selectedBrocaID = "";
String estadoAtual = "";
float compEncoder = 0;

// Encoder
// Contador de pulsos do encoder (precisa ser 'volatile' porque é usado dentro de interrupção)
volatile long encoderPulsos = 0;

// Distância que a rosca sem fim avança a cada rotação (em milímetros)
// Exemplo: se for 2mm por volta da rosca
const float AVANCO_ROSCA_MM = 2.0;

// Número de pulsos gerados pelo encoder a cada rotação completa
// Isso depende do encoder — por exemplo, um encoder de 400 PPR (Pulses Per Revolution)
const int PULSOS_POR_ROTACAO = 400;

// Calculamos quantos milímetros são percorridos por pulso do encoder
// Basta dividir o avanço da rosca pela quantidade de pulsos por rotação
const float MM_POR_PULSO = AVANCO_ROSCA_MM / PULSOS_POR_ROTACAO;
// Exemplo: 2.0 / 400 = 0.005 mm por pulso

// Essa flag controla se devemos contar os pulsos ou não
// Só ativamos quando a máquina estiver na etapa de medição
bool contandoEncoder = false;

// Função de interrupção: é chamada automaticamente quando o encoder gera um pulso
// void IRAM_ATTR encoderISR()
// {
//   // Só conta se estivermos na etapa correta (evita pulsos em momentos errados)
//   if (contandoEncoder)
//   {
//     // Lê o canal B do encoder para saber o sentido do movimento
//     if (digitalRead(PINO_D25) == HIGH)
//     {
//       encoderPulsos++; // Avanço
//     }
//     else
//     {
//       encoderPulsos--; // Recuo
//     }
//   }
// }
void IRAM_ATTR encoderISR()
{
  encoderPulsos++; // só incrementa, ignorando o sentido
}

void setup()
{
  Serial.begin(115200);

  // Definindo tipo dos pinos (entrada/saída)
  pinMode(PINO_D12, OUTPUT);
  pinMode(PINO_D13, OUTPUT);
  pinMode(PINO_D18, INPUT_PULLDOWN);
  pinMode(PINO_D19, INPUT_PULLDOWN);
  pinMode(PINO_D25, INPUT);
  pinMode(PINO_D26, INPUT);

  // Desativando todos inicialmente
  digitalWrite(PINO_D12, HIGH);
  digitalWrite(PINO_D13, HIGH);
  digitalWrite(PINO_D18, LOW);
  digitalWrite(PINO_D19, LOW);
  digitalWrite(PINO_D25, HIGH);
  digitalWrite(PINO_D26, HIGH);

  attachInterrupt(digitalPinToInterrupt(PINO_D26), encoderISR, RISING);

  // Conectar ao Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao WiFi");
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConectado ao WiFi!");

  // Configuração do Firebase (sem autenticação)
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.signer.test_mode = true; // <- adiciona isso

  Serial.println("Inicializando Firebase...");
  Firebase.begin(&config, nullptr); // <- sem auth
  Firebase.reconnectWiFi(true);

  Serial.println("Firebase iniciado (sem autenticação).");
}

void adicionarNovoCompParaBroca(String id, float novoComp)
{
  String caminho = "/Brocas/" + id;

  FirebaseJson json;
  json.set("novoComp", String(novoComp) + " mm");

  if (Firebase.RTDB.updateNode(&fbdo, caminho.c_str(), &json))
  {
    Serial.println("Campo novoComp atualizado com sucesso!");
  }
  else
  {
    Serial.print("Erro ao atualizar novoComp: ");
    Serial.println(fbdo.errorReason());
  }
}

void alterarEstado(String estado)
{
  String caminho = "/EstadoMaquina/estadoAtual";

  FirebaseJson json;
  json.set("estado", estado);
  unsigned long timestamp = millis() / 1000;
  json.set("atualizadoEm", (String)timestamp);

  if (Firebase.RTDB.updateNode(&fbdo, caminho.c_str(), &json))
  {
    Serial.println("Estado Atual atualizado com sucesso!");
  }
  else
  {
    Serial.print("Erro ao atualizar Estado Atual: ");
    Serial.println(fbdo.errorReason());
  }
}

void loop()
{
  if (Firebase.RTDB.get(&fbdo, "/EstadoMaquina/estadoAtual"))
  {
    if (fbdo.dataType() == "json")
    {
      FirebaseJson &json = fbdo.to<FirebaseJson>();
      FirebaseJsonData jsonData;
      json.get(jsonData, "estado");

      estadoAtual = jsonData.to<String>();
      Serial.print("Estado Atual: ");
      Serial.println(estadoAtual);

      Serial.print("Encoder Pulsos: ");
      Serial.println(encoderPulsos);

      if (digitalRead(PINO_D18) == HIGH)
      {
        digitalWrite(PINO_D12, HIGH);
        contandoEncoder = false;
      }
      else if (digitalRead(PINO_D19) == HIGH)
      {
        digitalWrite(PINO_D13, HIGH);
        contandoEncoder = false;
      }

      switch (estadoAtual.charAt(0))
      {
      case 'i': // estado "iniciando"
        Serial.println("Iniciando máquina...");

        encoderPulsos = 0;      // Zera o contador de pulsos antes de iniciar a medição
        contandoEncoder = true; // Habilita a contagem de pulsos (ativa a flag na ISR)

        digitalWrite(PINO_D12, LOW);
        Serial.println(digitalRead(PINO_D18));

        if (digitalRead(PINO_D18) == HIGH)
        {
          digitalWrite(PINO_D12, HIGH);
          contandoEncoder = false; // Para de contar os pulsos do encoder
          Serial.println("Parando Máquina");
          delay(2000);
          alterarEstado("parado");
        }
        break;

      case 'p': // estado "parado"
        Serial.println("Máquina parada. Salvando medição...");
        contandoEncoder = false; // Desabilita a contagem do encoder
        delay(100);              // Garante que nenhuma interrupção esteja rodando

        long pulsos;
        noInterrupts();         // Garante leitura segura do encoderPulsos
        pulsos = encoderPulsos; // Copia o valor dos pulsos
        interrupts();           // Reabilita as interrupções

        // Calcula o comprimento percorrido com base nos pulsos registrados
        // Cada pulso representa uma fração de milímetro (definido por MM_POR_PULSO)
        // Usamos abs() para garantir que o valor seja positivo
        compEncoder = abs(pulsos) * MM_POR_PULSO;

        // Imprime os dados no monitor serial
        Serial.print("Pulsos contados: ");
        Serial.println(pulsos);
        Serial.print("Comprimento medido: ");
        Serial.print(compEncoder);
        Serial.println(" mm");

        if (Firebase.RTDB.getString(&fbdo, "/BrocaSelecionadaID/id"))
        {
          selectedBrocaID = fbdo.stringData();
          Serial.print("ID da broca selecionada: ");
          Serial.println(selectedBrocaID);

          if (!selectedBrocaID.equals("0"))
          {
            adicionarNovoCompParaBroca(selectedBrocaID, compEncoder);
            delay(1000);
            alterarEstado("c");
          }
        }
        else
        {
          Serial.print("Erro ao ler ID da broca: ");
          Serial.println(fbdo.errorReason());
        }
        break;

      case 'c': // estado "concluido"
        Serial.println("Retornando máquina...");
        digitalWrite(PINO_D13, LOW);

        if (digitalRead(PINO_D19) == HIGH)
        {
          digitalWrite(PINO_D13, HIGH);
          Serial.println("Parando Máquina");
          delay(1000);
          alterarEstado("finalizado");
        }
        break;

      case 'f': // estado "finalizado"
        Serial.println("Processo finalizado. Aguardando nova ordem...");
        delay(3000);
        break;

      case 'r': // reiniciando
        Serial.println("Reiniciando máquina.");
        digitalWrite(PINO_D13, LOW);

        if (digitalRead(PINO_D19) == HIGH)
        {
          digitalWrite(PINO_D13, HIGH);
          Serial.println("Parando Máquina");
          delay(1000);
          alterarEstado("finalizado");
        }
        break;

      default:
        Serial.println("Estado não reconhecido.");
        delay(1000);
        break;
      }
    }
    else
    {
      Serial.println("Esperado JSON, mas não veio como JSON.");
    }
  }
  else
  {
    Serial.print("Erro ao obter estadoAtual: ");
    Serial.println(fbdo.errorReason());
  }

  delay(500);
}
