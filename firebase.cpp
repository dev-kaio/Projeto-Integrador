#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// ============ CONFIG Wi-Fi ============
const char *ssid = "";
const char *password = "";

// ============ CONFIG Firebase ============
#define API_KEY "AIzaSyDYzKk18gri7x4_p3BfbI9kizYNuqJYYF4"
#define DATABASE_URL "https://projeto-integrador-384cb-default-rtdb.firebaseio.com/"

// Usuário criado no Firebase Authentication
#define USER_EMAIL "esp32@esp32.com"
#define USER_PASSWORD "esp32auth"

// Objetos Firebase
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

String selectedBrocaID = "";
// Valor que virá da medição
float compEncoder = 0;

void setup()
{
    Serial.begin(115200);

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

void adicionarNovoCompParaBroca(String id, int novoComp)
{
    String caminho = "/Brocas/" + id;

    FirebaseJson json;
    json.set("novoComp", novoComp);

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

void loop()
{
    // Lê o ID da broca
    if (Firebase.RTDB.getString(&fbdo, "/BrocaSelecionadaID/Id"))
    {
        selectedBrocaID = fbdo.stringData();
        Serial.print("ID da broca selecionada: ");
        Serial.println(selectedBrocaID);

        if (!selectedBrocaID.equals("0"))
        {
            // Esperar a máquina parar para fazer alteração
            adicionarNovoCompParaBroca(selectedBrocaID, compEncoder);
        }
    }
    else
    {
        Serial.print("Erro ao ler: ");
        Serial.println(fbdo.errorReason());
    }

    delay(2000); // Aguarda 2 segundos para nova leitura
}
