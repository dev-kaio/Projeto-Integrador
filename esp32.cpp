#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// ============ CONFIG Wi-Fi ============
const char *ssid = "K";
const char *password = "kaiolito";

// ============ CONFIG Firebase ============
#define API_KEY "AIzaSyDYzKk18gri7x4_p3BfbI9kizYNuqJYYF4"
#define DATABASE_URL "https://projeto-integrador-384cb-default-rtdb.firebaseio.com/"

// Usuário criado no Firebase Authentication
#define USER_EMAIL "esp32@esp32.com"
#define USER_PASSWORD "esp32auth"

// Pinos usados
#define PINO_D12 12 // rele 1 (Motor)
#define PINO_D13 13 // rele 2 (Motor)
#define PINO_D18 18 // fim de curso 1
#define PINO_D19 19 // fim de curso 2
#define PINO_D25 25 // lado 1 encoder
#define PINO_D26 26 // lado 2 encoder

// Objetos Firebase
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

String selectedBrocaID = "";
String estadoAtual = "";
// Valor que virá da medição
float compEncoder = 0;

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

  // Conectar ao Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao WiFi");
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConectado ao WiFi!");

  // Autenticação Firebase
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  // API Key e URL do banco
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Inicia Firebase
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Espera autenticar
  Serial.println("Autenticando...");
  while (auth.token.uid == "")
  {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nAutenticado com sucesso!");
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
  // Arrumar timestamp
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
      Serial.print("Encoder: ");
      Serial.println(compEncoder);

      switch (estadoAtual.charAt(0))
      {
      case 'i': // estado "iniciando"
                // Dar partida na máquina, esperar encoder medir
        Serial.println("Iniciando máquina...");

        digitalWrite(PINO_D12, LOW);
        Serial.println(digitalRead(PINO_D18)); // Algo está travando
        if (digitalRead(PINO_D18) == HIGH)
        {
          digitalWrite(PINO_D12, HIGH);
          Serial.println("Parando Máquina");
          delay(2000);
          alterarEstado("parado");
        }
        break;

      case 'p': // estado "parado"
        // salvar medicao no banco
        Serial.println("Máquina parada. Salvando medição...");
        if (Firebase.RTDB.getString(&fbdo, "/BrocaSelecionadaID/id"))
        {
          selectedBrocaID = fbdo.stringData();
          Serial.print("ID da broca selecionada: ");
          Serial.println(selectedBrocaID);

          if (!selectedBrocaID.equals("0"))
          {
            adicionarNovoCompParaBroca(selectedBrocaID, compEncoder);
            delay(2000);
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
        // retornar medidor
        // ou fc2 ou delay
        Serial.println("Retornando máquina...");

        digitalWrite(PINO_D13, LOW);

        if (digitalRead(PINO_D19) == HIGH)
        {
          Serial.println("Parando Máquina");
          digitalWrite(PINO_D13, HIGH);
          delay(2000);
          alterarEstado("finalizado");
        }
        break;

      case 'f': // estado "finalizado"
        Serial.println("Processo finalizado. Aguardando nova ordem...");
        delay(3000);
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
// Botao de reinício no site

// void loop()
// {
//   if (Firebase.RTDB.get(&fbdo, "/EstadoMaquina/estadoAtual"))
//   {
//     if (fbdo.dataType() == "json")
//     {
//       FirebaseJson &json = fbdo.to<FirebaseJson>();
//       FirebaseJsonData jsonData;
//       json.get(jsonData, "estado");

//       estadoAtual = jsonData.to<String>();
//       Serial.print("Estado Atual: ");
//       Serial.println(estadoAtual);
//       Serial.print("Encoder:");
//       Serial.println(compEncoder);

//       if (estadoAtual.equals("iniciando"))
//       {
//         // Dar partida na máquina, esperar encoder medir

//         // if (medidor alcancar broca) -> fc1
//         alterarEstado("parado");
//       }

//       else if (estadoAtual.equals("parado"))
//       {
//         // salvar medicao no banco
//         if (Firebase.RTDB.getString(&fbdo, "/BrocaSelecionadaID/id"))
//         {
//           selectedBrocaID = fbdo.stringData();
//           Serial.print("ID da broca selecionada: ");
//           Serial.println(selectedBrocaID);

//           if (!selectedBrocaID.equals("0"))
//           {
//             adicionarNovoCompParaBroca(selectedBrocaID, compEncoder);
//             alterarEstado("concluido");
//           }
//         }
//         else
//         {
//           Serial.print("Erro ao ler: ");
//           Serial.println(fbdo.errorReason());
//         }
//       }
//       else if (estadoAtual.equals("concluido"))
//       {
//         // retornar medidor
//         //ou fc2 ou delay
//         alterarEstado("finalizado");
//       }
//     }
//     else
//     {
//       Serial.println("Esperado JSON, mas não veio como JSON.");
//     }
//   }
//   else
//   {
//     Serial.print("Erro ao obter estadoAtual: ");
//     Serial.println(fbdo.errorReason());
//   }
//   delay(1000);
// }
