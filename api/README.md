# HIPAG Blynk API

API para controle de lavadoras e secadoras através do Blynk IoT.

## Endpoints

### Verificar Hardware Blynk

```
GET /api/hardware
```

Verifica se o hardware Blynk está online.

**Parâmetros:**
- `token` (obrigatório): Token de autenticação do Blynk

**Exemplo:**
```
GET /api/hardware?token=P90q6DQC3navgp6g5amdKKyiVzExUKKZ
```

**Respostas:**
- 200: Hardware online
- 500: Hardware offline ou erro
- 400: Token não fornecido

### Verificar Status

```
GET /api/status
```

Verifica o status de uma máquina (lavadora ou secadora).

**Parâmetros:**
- `token` (obrigatório): Token de autenticação do Blynk
- `machine` (obrigatório): Número da máquina
  - Lavadoras: 432, 543, 654
  - Secadoras: 765, 876, 987

**Exemplo Lavadora:**
```
GET /api/status?token=P90q6DQC3navgp6g5amdKKyiVzExUKKZ&machine=432
```

**Exemplo Secadora:**
```
GET /api/status?token=P90q6DQC3navgp6g5amdKKyiVzExUKKZ&machine=765
```

**Respostas:**
- 200: Máquina online
- 500: Máquina offline
- 400: Parâmetros inválidos

### Liberar Máquina

```
GET /api/release
```

Libera uma máquina (lavadora ou secadora) para uso.

#### Para Lavadoras (432, 543, 654)

**Parâmetros:**
- `token` (obrigatório): Token de autenticação do Blynk
- `machine` (obrigatório): Número da lavadora (432, 543, 654)
- `softener`: Tipo de amaciante
  - `nosmell`: Sem amaciante
  - `floral`: Amaciante floral
  - `sport`: Amaciante sport
- `dosage`: Nível de dosagem (1 ou 2), obrigatório se usar amaciante

**Exemplos:**

1. Sem amaciante:
```
GET /api/release?token=P90q6DQC3navgp6g5amdKKyiVzExUKKZ&machine=432&softener=nosmell
```

2. Floral dosagem simples:
```
GET /api/release?token=P90q6DQC3navgp6g5amdKKyiVzExUKKZ&machine=432&softener=floral&dosage=1
```

3. Sport dosagem dupla:
```
GET /api/release?token=P90q6DQC3navgp6g5amdKKyiVzExUKKZ&machine=432&softener=sport&dosage=2
```

#### Para Secadoras (765, 876, 987)

**Parâmetros:**
- `token` (obrigatório): Token de autenticação do Blynk
- `machine` (obrigatório): Número da secadora (765, 876, 987)
- `timmer` (obrigatório): Tempo em minutos (15, 30 ou 45)

**Exemplo:**
```
GET /api/release?token=P90q6DQC3navgp6g5amdKKyiVzExUKKZ&machine=765&timmer=45
```

**Respostas:**
- 200: Comando enviado com sucesso
- 500: Máquina offline ou erro ao enviar comando
- 400: Parâmetros inválidos

## Códigos de Erro

### 400 Bad Request
- Token não fornecido
- Número da máquina inválido
- Amaciante inválido (lavadoras)
- Dosagem inválida (lavadoras)
- Tempo inválido (secadoras)

### 500 Internal Server Error
- Máquina offline
- Erro ao enviar comando para o Blynk

## Mapeamento de Máquinas

### Lavadoras
- 432: Lavadora 1
- 543: Lavadora 2
- 654: Lavadora 3

### Secadoras
- 765: Secadora 1
- 876: Secadora 2
- 987: Secadora 3

## Programas de Lavagem

### Sem Amaciante
- Envia apenas comando de liberação para a lavadora

### Com Amaciante Floral
1. Dosagem Simples:
   - Libera lavadora
   - Amaciante floral nível 1
   - Programa floral 1

2. Dosagem Dupla:
   - Libera lavadora
   - Amaciante floral nível 2
   - Programa floral 2

### Com Amaciante Sport
1. Dosagem Simples:
   - Libera lavadora
   - Amaciante sport nível 1
   - Programa sport 1

2. Dosagem Dupla:
   - Libera lavadora
   - Amaciante sport nível 2
   - Programa sport 2

## Tempos de Secagem

- 15 minutos: 1 liberação
- 30 minutos: 2 liberações
- 45 minutos: 3 liberações
