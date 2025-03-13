# HIPAG-BLYNK-01

Sistema de controle de lavadoras e secadoras usando Blynk IoT.

## Autenticação

Todas as requisições precisam incluir o token de autenticação no header:
```
X-Token: 1be10a9c20528183b64e3c69564db6958eab7f434ee94350706adb4efc261869
```

## Estrutura do Projeto

- `HIPAG-BLYNK-01.ino`: Código do ESP8266 que se comunica com o Blynk
- `api/`: API Node.js que fornece endpoints para controle das máquinas
- `api/README.md`: Documentação detalhada da API

## Endpoints da API

### Verificar Hardware Blynk
```
GET /api/hardware?token=P90q6DQC3navgp6g5amdKKyiVzExUKKZ
```
- Verifica se o ESP8266 está online no Blynk
- Retorna 200 se online, 500 se offline

### Verificar Status de Máquina
```
GET /api/status?token=P90q6DQC3navgp6g5amdKKyiVzExUKKZ&machine=432
```
- **machine** pode ser:
  - Lavadoras: 432, 543, 654
  - Secadoras: 765, 876, 987
- Opcionalmente pode incluir `store` para verificar ar condicionado
- Retorna status online/offline da máquina

### Liberar Lavadora
```
GET /api/release?token=P90q6DQC3navgp6g5amdKKyiVzExUKKZ&machine=432&softener=floral&dosage=1
```

#### Parâmetros para Lavadoras (432, 543, 654):
- `softener`:
  - `nosmell`: Sem amaciante
  - `floral`: Amaciante floral
  - `sport`: Amaciante sport
- `dosage`: 
  - `1`: Dosagem simples
  - `2`: Dosagem dupla

### Liberar Secadora
```
GET /api/release?token=P90q6DQC3navgp6g5amdKKyiVzExUKKZ&machine=765&timmer=45
```

#### Parâmetros para Secadoras (765, 876, 987):
- `timmer`:
  - `15`: 15 minutos (1 liberação)
  - `30`: 30 minutos (2 liberações)
  - `45`: 45 minutos (3 liberações)

## Códigos de Resposta

- 200: Sucesso
- 400: Parâmetros inválidos
- 401: Token inválido ou não fornecido
- 500: Erro interno ou máquina offline

## Configuração do ESP8266

O ESP8266 controla:
- 3 Lavadoras:
  - V1: Lavadora 1 (432)
  - V2: Lavadora 2 (543)
  - V3: Lavadora 3 (654)
- 3 Secadoras:
  - V4: Secadora 1 (765)
  - V5: Secadora 2 (876)
  - V6: Secadora 3 (987)
- Status:
  - V7: Verifica lavadoras
  - V8: Verifica secadoras
  - V11/V21/V31: Status lavadoras
  - V41/V51/V61: Status secadoras

### Fluxo de Liberação

#### Lavadoras:
1. Verifica status via V7
2. Se online:
   - Envia comando para V1/V2/V3
   - ESP8266 envia os comandos necessários:
     - `/lb`: Liberação
     - `/softener1` ou `/softener2`: Amaciante
     - `/am01-1`, `/am01-2`, `/am02-1`, `/am02-2`: Programas

#### Secadoras:
1. Verifica status via V8
2. Se online:
   - Envia comando para V4/V5/V6
   - ESP8266 envia `/lb` de acordo com o tempo:
     - 15min: 1 GET
     - 30min: 2 GETs
     - 45min: 3 GETs

## Como Executar

1. **ESP8266**:
   - Abra `HIPAG-BLYNK-01.ino` no Arduino IDE
   - Configure suas credenciais do Blynk
   - Faça o upload para o ESP8266

2. **API**:
   ```bash
   cd api
   npm install
   npm start
   ```
   A API estará disponível em http://localhost:3000

## Exemplos de Uso

```bash
# Verificar se hardware está online
curl "http://localhost:3000/api/hardware?token=P90q6DQC3navgp6g5amdKKyiVzExUKKZ"

# Verificar status da lavadora 432
curl "http://localhost:3000/api/status?token=P90q6DQC3navgp6g5amdKKyiVzExUKKZ&machine=432"

# Liberar lavadora 432 com amaciante floral dosagem simples
curl "http://localhost:3000/api/release?token=P90q6DQC3navgp6g5amdKKyiVzExUKKZ&machine=432&softener=floral&dosage=1"

# Liberar secadora 765 por 45 minutos
curl "http://localhost:3000/api/release?token=P90q6DQC3navgp6g5amdKKyiVzExUKKZ&machine=765&timmer=45"
```

## Dependências

### ESP8266
- Biblioteca Blynk
- ESP8266WiFi
- ESP8266HTTPClient
- ESP8266Ping

### API Node.js
- Express
- Axios
- dotenv
