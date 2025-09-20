#include <Arduino.h>
#include <WiFi.h>
#include <ESP32Encoder.h>
#include <Firebase_ESP_Client.h>

// ============ ENCODER ============
ESP32Encoder encoder;
const float mmPerPulse = 0.1;
float compEncoder = 0;
float ultimaMedicao = -1;

// ============ CONFIG Wi-Fi ============
const char *ssid = "";
const char *password = "";

// ============ CONFIG Firebase ============
#define API_KEY "AIzaSyDYzKk18gri7x4_p3BfbI9kizYNuqJYYF4"
#define DATABASE_URL "https://projeto-integrador-384cb-default-rtdb.firebaseio.com/"

// ============ USUÁRIO AUTH ============
#define USER_EMAIL "esp32@esp32.com"
#define USER_PASSWORD "esp32auth"

// ============ Objetos Firebase ============
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

String selectedBrocaID = "";

void setup()
{
  Serial.begin(115200);

  // ============ INICIA ENCODER ============
  pinMode(18, INPUT_PULLUP);
  pinMode(19, INPUT_PULLUP);
  encoder.attachHalfQuad(18, 19);
  encoder.clearCount();
  Serial.println("Encoder iniciado!");

  // ============ CONECTA Wi-Fi ============
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao WiFi");
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado!");

  // ============ CONFIGURA FIREBASE ============
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Espera autenticar
  Serial.println("Autenticando Firebase...");
  while (auth.token.uid == "")
  {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nAutenticado com sucesso!");
}

// ============ ENVIA DADOS PARA FIREBASE ============
void adicionarNovoCompParaBroca(String id, float novoComp)
{
  String caminho = "/Brocas/" + id;

  FirebaseJson json;
  json.set("novoComp", novoComp);

  if (Firebase.RTDB.updateNode(&fbdo, caminho.c_str(), &json))
  {
    Serial.println("Campo 'novoComp' atualizado com sucesso!");
  }
  else
  {
    Serial.print("Erro ao atualizar Firebase: ");
    Serial.println(fbdo.errorReason());
  }
}

void loop()
{
  // Atualiza a distância atual do encoder
  long count = encoder.getCount();
  compEncoder = count * mmPerPulse;

  Serial.printf("Contagem: %ld | Distância: %.2f mm\n", count, compEncoder);

  // Tenta ler ID da broca selecionada
  if (Firebase.RTDB.getString(&fbdo, "/BrocaSelecionadaID/id"))
  {
    selectedBrocaID = fbdo.stringData();
    Serial.print("ID da broca selecionada: ");
    Serial.println(selectedBrocaID);

    // Verifica se tem broca válida e distância mudou
    if (selectedBrocaID != "0" && abs(compEncoder - ultimaMedicao) > 0.1)
    {
      adicionarNovoCompParaBroca(selectedBrocaID, compEncoder);
      ultimaMedicao = compEncoder;
    }
  }
  else
  {
    Serial.print("Erro ao ler broca selecionada: ");
    Serial.println(fbdo.errorReason());
  }

  delay(5000); // Espera 2s antes da próxima verificação
}

// ===================== TESTE DOS RELÉS
// const int reles[] = {18, 19, 21, 22};
// const int num_reles = sizeof(reles) / sizeof(reles[0]);

// void setup() {
//   for (int i = 0; i < num_reles; i++) {
//     pinMode(reles[i], OUTPUT);
//     digitalWrite(reles[i], HIGH);
//   }

//   Serial.begin(115200);
//   Serial.println("Iniciando teste de relés...");
// }

// void loop() {
//   for (int i = 0; i < num_reles; i++) {
//     Serial.printf("Ligando relé na porta D%d\n", reles[i]);
//     digitalWrite(reles[i], LOW);
//     delay(1000);

//     Serial.printf("Desligando relé na porta D%d\n", reles[i]);
//     digitalWrite(reles[i], HIGH);
//     delay(500);
//   }

//   Serial.println("Ciclo completo. Repetindo em 2 segundos...\n");
//   delay(2000);
// }
