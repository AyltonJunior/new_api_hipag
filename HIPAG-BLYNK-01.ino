#define BLYNK_TEMPLATE_ID "TMPL2_CYxDRwp"
#define BLYNK_TEMPLATE_NAME "HIPAG BLYNK"
#define BLYNK_AUTH_TOKEN "P90q6DQC3navgp6g5amdKKyiVzExUKKZ"

#define BLYNK_PRINT Serial

#include <ESP8266WiFi.h>
#include <BlynkSimpleEsp8266.h>
#include <WiFiClient.h>
#include <ESP8266Ping.h>  // Biblioteca para verificar conectividade via ping
#include <ESP8266HTTPClient.h>  // Caminho correto para ESP8266

// Função para verificar o status de um dispositivo usando ping
bool isDeviceOnline(const char* host) {
  Serial.printf("Verificando status de %s...\n", host);
  
  // Tenta o ping 2 vezes antes de considerar offline
  if (Ping.ping(host, 2)) {
    Serial.printf("Dispositivo %s está ONLINE\n", host);
    return true;
  }
  
  Serial.printf("Dispositivo %s está OFFLINE\n", host);
  return false;
}

// Funções individuais para cada lavadora
void checkLavadora1Status() {
  Serial.println("\n=== Status Lavadora 1 ===");
  bool lavOnline = isDeviceOnline("192.168.0.101");
  bool dosOnline = isDeviceOnline("192.168.0.151");
  
  Serial.printf("Lavadora 1 (192.168.0.101): %s\n", lavOnline ? "ONLINE" : "OFFLINE");
  Serial.printf("Dosadora 1 (192.168.0.151): %s\n", dosOnline ? "ONLINE" : "OFFLINE");
  
  String statusUrl = String("/external/api/update?token=") + BLYNK_AUTH_TOKEN + "&v11=" + ((lavOnline && dosOnline) ? "1" : "0");
  sendHttpGetRequest("ny3.blynk.cloud", statusUrl.c_str());
}

void checkLavadora2Status() {
  Serial.println("\n=== Status Lavadora 2 ===");
  bool lavOnline = isDeviceOnline("192.168.0.102");
  bool dosOnline = isDeviceOnline("192.168.0.152");
  
  Serial.printf("Lavadora 2 (192.168.0.102): %s\n", lavOnline ? "ONLINE" : "OFFLINE");
  Serial.printf("Dosadora 2 (192.168.0.152): %s\n", dosOnline ? "ONLINE" : "OFFLINE");
  
  String statusUrl = String("/external/api/update?token=") + BLYNK_AUTH_TOKEN + "&v21=" + ((lavOnline && dosOnline) ? "1" : "0");
  sendHttpGetRequest("ny3.blynk.cloud", statusUrl.c_str());
}

void checkLavadora3Status() {
  Serial.println("\n=== Status Lavadora 3 ===");
  bool lavOnline = isDeviceOnline("192.168.0.103");
  bool dosOnline = isDeviceOnline("192.168.0.153");
  
  Serial.printf("Lavadora 3 (192.168.0.103): %s\n", lavOnline ? "ONLINE" : "OFFLINE");
  Serial.printf("Dosadora 3 (192.168.0.153): %s\n", dosOnline ? "ONLINE" : "OFFLINE");
  
  String statusUrl = String("/external/api/update?token=") + BLYNK_AUTH_TOKEN + "&v31=" + ((lavOnline && dosOnline) ? "1" : "0");
  sendHttpGetRequest("ny3.blynk.cloud", statusUrl.c_str());
}

// Funções individuais para cada secadora
void checkSecadora1Status() {
  Serial.println("\n=== Status Secadora 1 ===");
  bool secadoraOnline = isDeviceOnline("192.168.0.104");
  
  Serial.printf("Secadora 1 (192.168.0.104): %s\n", secadoraOnline ? "ONLINE" : "OFFLINE");
  
  String statusUrl = String("/external/api/update?token=") + BLYNK_AUTH_TOKEN + "&v41=" + (secadoraOnline ? "1" : "0");
  sendHttpGetRequest("ny3.blynk.cloud", statusUrl.c_str());
}

void checkSecadora2Status() {
  Serial.println("\n=== Status Secadora 2 ===");
  bool secadoraOnline = isDeviceOnline("192.168.0.105");
  
  Serial.printf("Secadora 2 (192.168.0.105): %s\n", secadoraOnline ? "ONLINE" : "OFFLINE");
  
  String statusUrl = String("/external/api/update?token=") + BLYNK_AUTH_TOKEN + "&v51=" + (secadoraOnline ? "1" : "0");
  sendHttpGetRequest("ny3.blynk.cloud", statusUrl.c_str());
}

void checkSecadora3Status() {
  Serial.println("\n=== Status Secadora 3 ===");
  bool secadoraOnline = isDeviceOnline("192.168.0.106");
  
  Serial.printf("Secadora 3 (192.168.0.106): %s\n", secadoraOnline ? "ONLINE" : "OFFLINE");
  
  String statusUrl = String("/external/api/update?token=") + BLYNK_AUTH_TOKEN + "&v61=" + (secadoraOnline ? "1" : "0");
  sendHttpGetRequest("ny3.blynk.cloud", statusUrl.c_str());
}

// Função para verificar status das lavadoras e dosadoras
void checkLaundryStatus() {
  checkLavadora1Status();
  delay(100);
  checkLavadora2Status();
  delay(100);
  checkLavadora3Status();
  delay(100);
}

// Função para verificar status das secadoras
void checkDryersStatus() {
  checkSecadora1Status();
  delay(100);
  checkSecadora2Status();
  delay(100);
  checkSecadora3Status();
  delay(100);

  // No final, envia o status geral para V8=0
  String finalUrl = String("/external/api/update?token=") + BLYNK_AUTH_TOKEN + "&v8=0";
  Serial.println("GET request enviado para ny3.blynk.cloud" + finalUrl);
  sendHttpGetRequest("ny3.blynk.cloud", finalUrl.c_str());
}

// Função para enviar requisição HTTP GET
void sendHttpGetRequest(const char* host, const char* endpoint) {
  WiFiClient client;
  HTTPClient http;
  
  String url = "http://";
  url += host;
  url += endpoint;
  
  http.begin(client, url);
  int httpCode = http.GET();
  
  if (httpCode > 0) {
    String payload = http.getString();
    Serial.println(payload);
  }
  
  http.end();
}

// Função genérica para processar botões
void processButton(const char* lavIP, const char* dosIP, const char* endpoint1, const char* endpoint2, const char* endpoint3) {
  // PRIMEIRO: Envia comando de liberação
  sendHttpGetRequest(lavIP, endpoint1);
  
  // DEPOIS: Envia comandos de amaciante se necessário
  if (endpoint2 != nullptr) {
    sendHttpGetRequest(dosIP, endpoint2);
  }
  if (endpoint3 != nullptr) {
    sendHttpGetRequest(dosIP, endpoint3);
  }
}

// Configurações dos botões
BLYNK_WRITE(V1) {
  int buttonState = param.asInt();

  if (buttonState == 0) {
    processButton("192.168.0.101", "192.168.0.151", "/lb", "/softener0", nullptr);
  } else if (buttonState == 1) {
    processButton("192.168.0.101", "192.168.0.151", "/lb", "/softener1", "/am01-1");
  } else if (buttonState == 2) {
    processButton("192.168.0.101", "192.168.0.151", "/lb", "/softener1", "/am01-2");
  } else if (buttonState == 3) {
    processButton("192.168.0.101", "192.168.0.151", "/lb", "/softener2", "/am02-1");
  } else if (buttonState == 4) {
    processButton("192.168.0.101", "192.168.0.151", "/lb", "/softener2", "/am02-2");
  }
}

BLYNK_WRITE(V2) {
  int buttonState = param.asInt();

  if (buttonState == 0) {
    processButton("192.168.0.102", "192.168.0.152", "/lb", "/softener0", nullptr);
  } else if (buttonState == 1) {
    processButton("192.168.0.102", "192.168.0.152", "/lb", "/softener1", "/am01-1");
  } else if (buttonState == 2) {
    processButton("192.168.0.102", "192.168.0.152", "/lb", "/softener1", "/am01-2");
  } else if (buttonState == 3) {
    processButton("192.168.0.102", "192.168.0.152", "/lb", "/softener2", "/am02-1");
  } else if (buttonState == 4) {
    processButton("192.168.0.102", "192.168.0.152", "/lb", "/softener2", "/am02-2");
  }
}

BLYNK_WRITE(V3) {
  int buttonState = param.asInt();

  if (buttonState == 0) {
    processButton("192.168.0.103", "192.168.0.153", "/lb", "/softener0", nullptr);
  } else if (buttonState == 1) {
    processButton("192.168.0.103", "192.168.0.153", "/lb", "/softener1", "/am01-1");
  } else if (buttonState == 2) {
    processButton("192.168.0.103", "192.168.0.153", "/lb", "/softener1", "/am01-2");
  } else if (buttonState == 3) {
    processButton("192.168.0.103", "192.168.0.153", "/lb", "/softener2", "/am02-1");
  } else if (buttonState == 4) {
    processButton("192.168.0.103", "192.168.0.153", "/lb", "/softener2", "/am02-2");
  }
}

BLYNK_WRITE(V4) {
  int buttonState = param.asInt();
  int repetitions = 0;
  
  if (buttonState == 15) {
    repetitions = 1;
  } else if (buttonState == 30) {
    repetitions = 2;
  } else if (buttonState == 45) {
    repetitions = 3;
  }

  for (int i = 0; i < repetitions; i++) {
    sendHttpGetRequest("192.168.0.104", "/lb");
    delay(500);
  }
}

BLYNK_WRITE(V5) {
  int buttonState = param.asInt();
  int repetitions = 0;
  
  if (buttonState == 15) {
    repetitions = 1;
  } else if (buttonState == 30) {
    repetitions = 2;
  } else if (buttonState == 45) {
    repetitions = 3;
  }

  for (int i = 0; i < repetitions; i++) {
    sendHttpGetRequest("192.168.0.105", "/lb");
    delay(500);
  }
}

BLYNK_WRITE(V6) {
  int buttonState = param.asInt();
  int repetitions = 0;
  
  if (buttonState == 15) {
    repetitions = 1;
  } else if (buttonState == 30) {
    repetitions = 2;
  } else if (buttonState == 45) {
    repetitions = 3;
  }

  for (int i = 0; i < repetitions; i++) {
    sendHttpGetRequest("192.168.0.106", "/lb");
    delay(500);
  }
}

// Handler para o botão V7 - Verificar status das lavadoras e dosadoras
BLYNK_WRITE(V7) {
  static bool isProcessing = false;
  int buttonState = param.asInt();
  
  if (isProcessing) return; // Evita processamento recursivo
  isProcessing = true;
  
  if (buttonState == 0) {
    checkLaundryStatus();
  } else if (buttonState == 1) {
    checkLavadora1Status();
  } else if (buttonState == 2) {
    checkLavadora2Status();
  } else if (buttonState == 3) {
    checkLavadora3Status();
  }
  
  isProcessing = false;
}

// Handler para o botão V8 - Verificar status das secadoras
BLYNK_WRITE(V8) {
  int buttonState = param.asInt();
  if (buttonState == 0) {
    checkDryersStatus();
  } else if (buttonState == 1) {
    checkSecadora1Status();
  } else if (buttonState == 2) {
    checkSecadora2Status();
  } else if (buttonState == 3) {
    checkSecadora3Status();
  }
}

// Handler para comandos do ar condicionado (V10)
BLYNK_WRITE(V10) {
  int powerValue = param.asInt();
  
  if (powerValue == 1) {
    Serial.println("Enviando comando LOW para ar condicionado");
    sendHttpGetRequest("192.168.0.110", "/airon1");
  } 
  else if (powerValue == 2) {
    Serial.println("Enviando comando MID para ar condicionado");
    sendHttpGetRequest("192.168.0.110", "/airon2");
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.begin("brisa-1929431", "fi4r5hyd");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi conectado!");
  Serial.print("IP do dispositivo: ");
  Serial.println(WiFi.localIP());
  Blynk.begin(BLYNK_AUTH_TOKEN, "brisa-1929431", "fi4r5hyd");
}

void loop() {
  Blynk.run();
}
