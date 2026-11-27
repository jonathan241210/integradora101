# Servidor de BD MySQL 8.0 con Docker (mÃ¡quina remota)

GuÃ­a simple para levantar `arca_pruebas` en una **computadora aparte** (servidor remoto, no en la misma WiFi/LAN del equipo) y permitir que los desarrolladores se conecten desde su `.env`.

> **Alcance**: desarrollo/pruebas. No reemplaza Aiven, no es producciÃ³n y nunca se usa `arca_zoo`. No crear ni subir backups/secretos a Git.

## Archivos de esta carpeta

| Archivo | Uso |
|---|---|
| `docker-compose.yml` | Levanta MySQL 8.0 con Docker |
| `.env.example` | Plantilla de variables para Docker Compose |
| `import-backup.ps1` | Importa un backup `.sql` (lo haces cuando tengas el backup) |

## 1. Preparar la computadora servidor

Instalar:

- **Docker Desktop** (o Docker Engine)
- **Git** (opcional, para clonar/copiar archivos)
- **MySQL Workbench** (para probar la conexiÃ³n)

Verificar:

```powershell
docker --version
docker compose version
docker ps
```

## 2. Configurar y levantar MySQL

En esta carpeta (`docs/database/servidor-bd-docker/`):

1. Copia el ejemplo:

```powershell
Copy-Item .env.example .env
```

2. Edita `.env` y pon una contraseÃ±a fuerte en `MYSQL_ROOT_PASSWORD`.  
   Puedes generar una en: https://www.lastpass.com/es/features/password-generator

3. Levanta el contenedor:

```powershell
docker compose up -d
```

4. Verifica:

```powershell
docker compose ps
docker logs arca-mysql-local --tail 30
```

Espera a ver `ready for connections`.

> Al iniciar por primera vez, Docker crea automÃ¡ticamente el usuario **`root`** con `MYSQL_ROOT_PASSWORD` y la base `arca_pruebas`.

## 3. Crear usuario para desarrolladores

No compartas `root`. Crea un usuario dedicado para que el equipo se conecte desde la app.

Entra a MySQL:

```powershell
docker exec -it arca-mysql-local mysql -uroot -p
```

Escribe la contraseÃ±a `root` cuando la pida. Luego ejecuta:

```sql
-- Crea usuario para desarrolladores. Cambia la contraseÃ±a.
CREATE USER 'desarrollador'@'%' IDENTIFIED BY 'TU_PASSWORD_SEGURA';

-- Permisos sobre la BD de desarrollo/pruebas.
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, DROP, CREATE TEMPORARY TABLES ON arca_pruebas.* TO 'desarrollador'@'%';

FLUSH PRIVILEGES;

-- VerificaciÃ³n
SELECT user, host FROM mysql.user WHERE user = 'desarrollador';
SHOW GRANTS FOR 'desarrollador'@'%';
EXIT;
```

Notas:

- Cambia `TU_PASSWORD_SEGURA` por una contraseÃ±a fuerte.
- Si quieres limitar a una IP/origen especÃ­fico, reemplaza `'%'` por ese host/IP.
- Para solo lectura: `GRANT SELECT ON arca_pruebas.* TO 'desarrollador'@'%';`

## 4. Importar backup

El backup completo (`.sql`) es **un solo archivo** que incluye la **estructura** (tablas, índices, llaves, etc.) y los **datos** (`INSERT`). Al importarlo en una BD vacía, se reconstruye la base.

Cuando tengas el backup, coloca el archivo `.sql` en esta misma carpeta (`docs/database/servidor-bd-docker/`) y ejecuta:

```powershell
.\import-backup.ps1 -BackupPath ".\NOMBRE_DEL_BACKUP.sql"
```

El script pedirá la contraseña `root` si no la pasas, creará una copia temporal parcheada para compatibilidad local y la importará en `arca_pruebas`.

Verificación:

```powershell
docker exec arca-mysql-local mysql -uroot -p -e "SELECT COUNT(*) AS tablas FROM information_schema.tables WHERE table_schema='arca_pruebas';"
```

## 5. Hacer accesible la BD desde otra mÃ¡quina (remota) con Radmin VPN

Como la mÃ¡quina servidor estÃ¡ **lejos / no en la misma WiFi-LAN**, hay que crear una red virtual para que los desarrolladores se conecten como si estuvieran en la misma red. **No expongas MySQL 3306 directo a Internet sin protecciÃ³n**.

### Paso 5.1 — Crear red privada en Radmin VPN (en el servidor)

1. Instala **Radmin VPN** en la computadora servidor.
2. Abre Radmin VPN y crea una red privada:
   - **Network > Create network**
   - **Nombre de red**: `ARCA-NB`
   - **Contraseña**: genera una contraseña fuerte en [LastPass Password Generator](https://www.lastpass.com/es/features/password-generator) y úsala para la red
3. Verifica que el servidor quede dentro de esa red.
4. Anota la **IP de Radmin VPN** del servidor (normalmente empieza con `26.x.x.x`). Esa será la IP que usarán los devs como `DB_HOST`.

### Paso 5.2 — Conectar a los desarrolladores a la misma red

Sí: **cada desarrollador también debe instalar Radmin VPN y unirse a la misma red privada**.

En cada PC de desarrollador:

1. Instalar Radmin VPN.
2. Ir a **Network > Join network**.
3. Escribir el nombre de red (`ARCA-NB`) y la contraseña generada para la red.
4. Confirmar que aparece conectado y que ve la máquina servidor en la red.

> Si un desarrollador no está unido y conectado a esa red Radmin VPN, no podrá alcanzar la BD.

### Paso 5.3 — Permitir el puerto en el servidor

En la computadora servidor, permite el puerto `3306` en el firewall de Windows (al menos para la red privada/interfaz de Radmin VPN):

```powershell
New-NetFirewallRule -DisplayName "ARCA MySQL Radmin 3306" -Direction Inbound -Protocol TCP -LocalPort 3306 -Action Allow -Profile Private
```

Si Windows clasifica Radmin como red pública, ajusta la regla/perfil con cuidado o limita por alcance según la política del equipo. No abras el puerto a todo Internet.

### Paso 5.4 — Verificar conectividad

Desde una PC de desarrollador ya unida a Radmin VPN:

- Haz ping o prueba conexión a la IP Radmin del servidor.
- En Workbench, prueba con Hostname = IP Radmin del servidor, puerto `3306`, usuario `desarrollador`.

## 6. Configurar `.env` de la app en cada mÃ¡quina desarrollador

En la mÃ¡quina de cada dev, editar `apps/api/src/.env` (no commitear). Usa la **IP de Radmin VPN del servidor**:

```env
DB_CONNECTION=mysql
DB_HOST=26.x.x.x
DB_PORT=3306
DB_DATABASE=arca_pruebas
DB_USERNAME=desarrollador
DB_PASSWORD=TU_PASSWORD_SEGURA
DB_SSL_CA=
DB_TIMEZONE=+00:00
```

DespuÃ©s, en `apps/api/src`:

```powershell
php artisan config:clear
php artisan db:show
```

Si responde la conexiÃ³n a `arca_pruebas`, la app ya estÃ¡ usando la BD remota.

## 7. Probar con MySQL Workbench

Crear conexiÃ³n en Workbench:

| Campo | Valor |
|---|---|
| Connection Name | `ARCA BD Remota` |
| Hostname | IP Radmin VPN del servidor (ej. `26.x.x.x`) |
| Port | `3306` |
| Username | `desarrollador` |
| Password | contraseÃ±a de `desarrollador` |
| Default Schema | `arca_pruebas` |

Usar **Test Connection**.

## 8. Comandos útiles

```powershell
# Levantar
docker compose up -d

# Ver estado
docker compose ps

# Logs
docker logs arca-mysql-local --tail 50

# Detener
docker compose stop

# Iniciar de nuevo
docker compose start

# Bajar contenedor (mantiene volumen/datos)
docker compose down

# Borrar tambiÃ©n datos (CUIDADO)
docker compose down -v
```

## 9. Reglas importantes

- No usar `arca_zoo`.
- No commitear `.env`, contraseÃ±as, dumps ni certificados.
- No crear backup ahora; el import se hace cuando exista el archivo.
- No exponer `root` remotamente.
- Cualquier cambio de esquema sigue DBR + migraciÃ³n Laravel por el responsable de BD.
