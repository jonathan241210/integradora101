# Estándares de Integración API · `apps/mobile`

- **Estado:** Propuesta / Vigente para el equipo móvil
- **Fecha:** 2026-10-17
- **Responsables:** Víctor Adrián, Aksel
- **Specs relacionadas:** `mobile-003` (catálogo y caché), `mobile-004` (cuenta), `mobile-005` (progreso), `mobile-006` (QR), `mobile-007` (mapa)
- **ADRs de referencia:** [ADR 0004](../../../docs/adr/0004-mobile-react-native.md) (React Native/Expo), [ADR 0011](../../../docs/adr/0011-visitor-identity-and-mobile-session.md) (Identidad visitante y sesión)

---

## 1. Propósito y regla de oro

Este documento establece los **estándares técnicos y de arquitectura** para conectar la aplicación móvil (`apps/mobile`) con la API central Laravel (`apps/api`). 

Su objetivo es garantizar que tanto **Víctor** como **Aksel** desarrollen sus respectivas features de forma consistente, desacoplada y sin colisiones de código.

> [!IMPORTANT]
> **Regla de oro (Constitución Principio III):**
> Ninguna pantalla (`screens/`), componente (`components/`) o ruta (`app/`) puede realizar llamadas HTTP directas (`fetch`, `axios` o similares).
> **Todo acceso a la API debe seguir estrictamente el patrón MVVM a través de Repositorios y el paquete `@arca/api-client`.**

---

## 2. Flujo de datos y arquitectura (MVVM)

La aplicación sigue el flujo unidireccional desacoplado:

```mermaid
flowchart LR
  subgraph Presentacion [Capa de Presentación]
    Route[Expo Router (app/)] --> Screen[Screen (screens/)]
    Route --> VM[ViewModel Hook (viewmodels/)]
    Screen -->|Eventos / Acciones| Route
  end

  subgraph Dominio [Capa de Datos y Dominio]
    VM --> Repo[Repository Interface (repositories/)]
    Repo --> Impl[Repository Implementation]
  end

  subgraph Red [Capa de Red e Infraestructura]
    Impl --> Client[@arca/api-client]
    Impl --> Cache[AsyncStorage / Cache]
    Client --> API[Laravel API v1]
  end
```

### Responsabilidades por capa:
1. **Screen / View:** Solo dibuja la interfaz. Recibe `data`, `isLoading`, `error` y funciones de acción por `props`. No sabe si los datos vienen de la red, de un mock o de una base de datos local.
2. **ViewModel (Hook `use*ViewModel`):** Gestiona el estado de la pantalla (`loading`, `error`, `empty`, `offline`). Llama a los métodos del Repositorio.
3. **Repository (`repositories/*`):** Abstrae la fuente de datos. Implementa la lógica de caché offline (leer de caché local si la red falla) y normaliza los modelos de la API a los modelos de UI de la app.
4. **`@arca/api-client`:** Cliente HTTP tipado compartido. Maneja la URL base, cabeceras, serialización y el token de autenticación.

---

## 3. Configuración y variables de entorno

### Variable de entorno obligatoria
En Expo, toda variable de entorno pública debe llevar el prefijo `EXPO_PUBLIC_`:

```bash
# Archivo apps/mobile/.env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1  # Emulador Android local
# EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1 # Simulador iOS / Web
# EXPO_PUBLIC_API_URL=https://api-dev.tulancingo.gob.mx/api/v1 # Servidor compartido
```

### Cabeceras HTTP estándar
Todas las peticiones enviadas por `@arca/api-client` deben incluir:

| Cabecera | Valor | Propósito |
|---|---|---|
| `Accept` | `application/json` | Exige respuestas JSON a Laravel. |
| `Content-Type` | `application/json` | En peticiones con payload (`POST`, `PUT`, `PATCH`). |
| `X-App-Platform` | `mobile-android` / `mobile-ios` | Auditoría e identificación de métricas en API. |
| `Authorization` | `Bearer <token>` | **Solo en endpoints autenticados** de visitante. |

---

## 4. Reparto de responsabilidades y tipos de endpoints

Para evitar duplicidad y mantener claras las dependencias, el trabajo entre Víctor y Aksel se divide según el tipo de acceso:

| Tipo | Responsable | Features / Specs | Endpoints previstos | Autenticación |
|---|---|---|---|---|
| **Catálogo Público** | **Víctor** | `mobile-003` (Animales, Eventos) | `GET /species`, `GET /species/{id}`, `GET /events` | Ninguna (Público / Anónimo) |
| **Mapa y Geolocalización** | **Víctor** | `mobile-007` (Recintos, Puntos de interés) | `GET /enclosures`, `GET /map/locations` | Ninguna (Público) |
| **Cuenta del Visitante** | **Aksel** | `mobile-004` (Registro, Login, Perfil) | `POST /visitor/register`, `POST /visitor/login`, `POST /visitor/refresh-token`, `GET /visitor/profile` | Bearer Token (Sanctum) + Refresh Token |
| **Progreso y Colección** | **Aksel** | `mobile-005` (Colección, Puntos, Misiones) | `GET /visitor/collection`, `GET /visitor/achievements`, `GET /visitor/missions` | Bearer Token obligatorio |
| **Escaneo QR** | **Aksel** | `mobile-006` (Cámara y validación QR) | `POST /visitor/scans` (idempotente) | Bearer Token obligatorio |

---

## 5. Contrato de respuestas y manejo de errores

### 5.1 Respuestas exitosas (`200 OK`, `201 Created`)
La API Laravel utiliza **API Resources**. Las respuestas llegan envueltas en un objeto `data`:

```json
// GET /api/v1/species
{
  "data": [
    {
      "id": 1,
      "name": "Jaguar",
      "scientific_name": "Panthera onca",
      "category": "mammal",
      "image_url": "https://.../jaguar.webp"
    }
  ]
}
```

### 5.2 Nomenclatura (camelCase vs snake_case)
- **API (Laravel):** Retorna atributos en `snake_case` (`scientific_name`, `image_url`).
- **Mobile (TypeScript):** Usa `camelCase` (`scientificName`, `imageUrl`).
- **Regla:** El Repositorio o el cliente API es responsable de mapear las claves de `snake_case` a `camelCase` al construir los modelos de dominio móvil (`src/models/index.ts`). **Nunca expongas `snake_case` a las pantallas de UI.**

### 5.3 Errores estándar y su traducción a UI

Toda respuesta de error debe transformarse en una instancia de error tipada (`AppError`):

```typescript
export interface AppError {
  code: 'NETWORK_ERROR' | 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'SERVER_ERROR';
  message: string;        // Mensaje amigable en español para el usuario
  details?: Record<string, string[]>; // Errores por campo (422)
}
```

Mapeo de códigos HTTP a mensajes en español:
- **`0` / Sin conexión:** *"No hay conexión a internet. Mostrando información guardada."*
- **`401 Unauthorized`:** *"Tu sesión ha caducado. Por favor, inicia sesión nuevamente."* (Dispara refresh token o cierre de sesión).
- **`404 Not Found`:** *"El recurso solicitado no fue encontrado."*
- **`422 Unprocessable Content`:** Mensaje de validación devuelto por la API.
- **`500 Server Error`:** *"Tuvimos un problema al conectar con el servidor. Intenta de nuevo más tarde."*

---

## 6. Los 5 estados obligatorios en la UI

Toda pantalla móvil que dependa de datos asíncronos debe implementar explícitamente en su ViewModel y Vista estos 5 estados:

```typescript
export type ViewState = 'loading' | 'success' | 'empty' | 'error' | 'offline';
```

1. **`loading`:** Muestra esqueletos de carga (`SkeletonCard`) o un indicador visual mientras se resuelve la petición.
2. **`success`:** Renderiza el contenido con los datos obtenidos.
3. **`empty`:** Se activa cuando `data` es un arreglo vacío (`[]`). Muestra una ilustración o texto descriptivo (ej. *"No hay eventos programados para este día"*).
4. **`error`:** Ocurre ante un fallo 500 o de servicio. Muestra un mensaje amigable y un botón **"Reintentar"** (`onRetry`).
5. **`offline`:** Se activa cuando no hay red pero existen datos previos en caché local. Muestra los datos antiguos junto con un banner o pastilla discreta: *"Modo sin conexión"*.

---

## 7. Estrategia de Caché y Modo Offline

Dado que en el zoológico la señal móvil puede ser irregular, la aplicación aplica dos estrategias según la naturaleza de la información:

### 7.1 Lectura de Catálogo y Mapa (Víctor · `mobile-003`, `mobile-007`)
- **Estrategia:** *Stale-While-Revalidate* con respaldo en `AsyncStorage`.
- **Flujo:**
  1. El Repositorio revisa si existen datos en caché local.
  2. Si existen, los entrega inmediatamente a la UI para que la pantalla cargue sin demoras.
  3. En segundo plano, consulta la API: si hay datos actualizados, actualiza la caché y refresca la UI silenciosamente.
  4. Si la consulta de red falla, conserva los datos de la caché y conmuta al estado `offline`.

### 7.2 Progreso y Escaneos QR (Aksel · `mobile-005`, `mobile-006`)
- **Estrategia:** Cola local persistente (*Offline Sync Queue*).
- **Flujo (según ADR 0011):**
  1. Si el visitante escanea un QR sin señal, el escaneo se guarda en una cola local en `AsyncStorage`.
  2. En cuanto se detecta conexión a internet, la cola se vacía llamando a `POST /visitor/scans`.
  3. La API es idempotente gracias a `visitor_scans.qr_code_hash`, evitando duplicación de puntos.

---

## 8. Patrón de transición de Mocks a API Real

Actualmente, `apps/mobile/src/repositories/index.ts` expone interfaces con implementaciones mock.

Para conectar la API sin romper las pruebas ni el trabajo en curso:

### Paso 1: Mantener la interfaz intacta
```typescript
// src/repositories/animalRepository.ts
export interface AnimalRepository {
  getAllAnimals(): Promise<Animal[]>;
  getAnimalById(id: string): Promise<Animal | null>;
  getFeaturedAnimals(): Promise<Animal[]>;
}
```

### Paso 2: Crear la implementación real con API
```typescript
// src/repositories/apiAnimalRepository.ts
import { apiClient } from '@arca/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animal } from '../models';
import { AnimalRepository } from './animalRepository';

export class ApiAnimalRepository implements AnimalRepository {
  private readonly CACHE_KEY = '@arca:animals_cache';

  async getAllAnimals(): Promise<Animal[]> {
    try {
      // 1. Llamada mediante el cliente API
      const response = await apiClient.get<SpeciesApiResponse[]>('/species');
      const animals = response.data.map(mapSpeciesToAnimalModel);
      
      // 2. Guardar en caché para uso offline
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(animals));
      return animals;
    } catch (error) {
      // 3. Fallback a caché local si la red falla
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
      throw error;
    }
  }
  // ...
}
```

### Paso 3: Proveedor de dependencias / Factory
En `src/repositories/index.ts`, centralizar qué implementación se entrega:
```typescript
const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

export const animalRepository: AnimalRepository = USE_MOCKS
  ? new MockAnimalRepository()
  : new ApiAnimalRepository();
```
Esto permite alternar instantáneamente entre datos simulados y la API real tanto en emuladores como en pruebas automatizadas.

---

## 9. Pruebas automatizadas (Jest)

Conforme a la **Constitución (Principio IV)**, cada criterio de aceptación (`CA-xx`) debe contar con al menos una prueba automatizada:

- **Los tests de UI y ViewModels no hacen peticiones reales de red.** Se usa un `MockRepository` en las pruebas de Jest.
- **Los tests de Repositorios API** prueban la llamada al cliente simulado (`jest.spyOn(apiClient, 'get')`) y la correcta persistencia/lectura en `AsyncStorage`.

---

## 10. Checklist de revisión para PRs entre Víctor y Aksel

Antes de abrir o aprobar un PR de integración móvil:
- [ ] ¿La llamada a la red se hace dentro de un Repositorio (nunca en la pantalla)?
- [ ] ¿Las claves de respuesta están mapeadas a `camelCase` en los modelos de UI?
- [ ] ¿La pantalla maneja los estados `loading`, `empty`, `error` y `offline`?
- [ ] ¿Los textos y mensajes de error están en español comprensible?
- [ ] ¿No se versionaron secretos, tokens de prueba ni contraseñas en el código?
- [ ] ¿Los tests unitarios de Jest corren en verde (`npm test`)?
