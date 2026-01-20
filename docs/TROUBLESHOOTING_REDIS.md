# Troubleshooting Redis Connection Issues

## Error: "Connection refused"

Si obtienes `Could not connect to Redis at 192.168.0.7:6379: Connection refused`, sigue estos pasos:

## Paso 1: Verificar si Redis está instalado

```bash
# Verificar si Redis está instalado
which redis-server
which redis-cli

# Si no está instalado, instalar:
sudo apt-get update
sudo apt-get install redis-server
```

## Paso 2: Verificar si Redis está corriendo

```bash
# Verificar estado del servicio
sudo systemctl status redis-server

# O si usa otro nombre:
sudo systemctl status redis

# Ver procesos de Redis
ps aux | grep redis
```

## Paso 3: Iniciar Redis si no está corriendo

```bash
# Iniciar Redis
sudo systemctl start redis-server

# Habilitar para que inicie automáticamente
sudo systemctl enable redis-server

# Verificar que está corriendo
sudo systemctl status redis-server
```

## Paso 4: Verificar configuración de Redis

Redis por defecto solo escucha en `localhost` (127.0.0.1). Para conectarse desde otra máquina o IP, necesitas configurarlo:

```bash
# Editar configuración de Redis
sudo vi /etc/redis/redis.conf

# O en algunos sistemas:
sudo vi /etc/redis.conf
```

**Buscar y modificar**:

```conf
# Línea original (solo localhost):
bind 127.0.0.1

# Cambiar a (escuchar en todas las interfaces):
bind 0.0.0.0

# O específicamente en tu IP:
bind 192.168.0.7
```

**También verificar**:

```conf
# Asegurar que no está en modo protegido (o configurar contraseña)
protected-mode no

# O si quieres seguridad, usar contraseña:
requirepass your_secure_password_here
```

**Reiniciar Redis después de cambios**:

```bash
sudo systemctl restart redis-server
```

## Paso 5: Verificar firewall

```bash
# Verificar si el puerto 6379 está abierto
sudo ufw status

# Si está bloqueado, abrir el puerto:
sudo ufw allow 6379/tcp

# O específicamente desde tu red:
sudo ufw allow from 192.168.0.0/24 to any port 6379
```

## Paso 6: Probar conexión local primero

```bash
# Probar conexión local (debe funcionar)
redis-cli ping
# Esperado: PONG

# Probar con contraseña si está configurada
redis-cli -a your_password ping
```

## Paso 7: Probar conexión remota

```bash
# Desde la misma máquina pero usando la IP
redis-cli -h 192.168.0.7 -p 6379 ping

# Con contraseña
redis-cli -h 192.168.0.7 -p 6379 -a your_password ping

# O usando variables de entorno
export REDIS_HOST=192.168.0.7
export REDIS_PORT=6379
export REDIS_PASSWORD=your_password
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

## Paso 8: Verificar qué está escuchando Redis

```bash
# Ver en qué IPs y puertos está escuchando Redis
sudo netstat -tlnp | grep redis
# O
sudo ss -tlnp | grep redis

# Debe mostrar algo como:
# tcp  0  0  0.0.0.0:6379  0.0.0.0:*  LISTEN  pid/redis-server
```

## Solución Rápida: Usar localhost si Redis está en la misma máquina

Si Redis está corriendo en la misma máquina que la API, usa `localhost` en lugar de la IP:

```env
# .env
REDIS_HOST=localhost  # En lugar de 192.168.0.7
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

## Solución Alternativa: Deshabilitar Redis (si no lo necesitas)

**Redis es opcional**. Si no lo necesitas ahora, simplemente déjalo deshabilitado:

```env
# .env
REDIS_HOST=  # Vacío = Redis deshabilitado
# La API funcionará con rate limiting en memoria
```

## Verificación Final

```bash
# 1. Verificar que Redis está corriendo
sudo systemctl status redis-server

# 2. Verificar que escucha en el puerto correcto
sudo netstat -tlnp | grep 6379

# 3. Probar conexión local
redis-cli ping

# 4. Probar conexión remota (si aplica)
redis-cli -h 192.168.0.7 -p 6379 ping

# 5. Probar con contraseña (debe responder PONG)
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
# Esperado: PONG (el warning sobre contraseña es solo informativo)

# 6. Verificar desde la API
curl http://localhost:3000/health | jq .redis
# Debe mostrar: "status": "up"
```

## ✅ Conexión Exitosa

Si `redis-cli ping` responde `PONG`, Redis está funcionando correctamente. El warning sobre usar contraseña en la línea de comandos es solo informativo (por seguridad, la contraseña queda en el historial) pero no afecta la funcionalidad.

## Comandos Útiles

```bash
# Ver logs de Redis
sudo journalctl -u redis-server -f

# Ver configuración actual
redis-cli CONFIG GET bind
redis-cli CONFIG GET protected-mode
redis-cli CONFIG GET requirepass

# Reiniciar Redis
sudo systemctl restart redis-server

# Detener Redis
sudo systemctl stop redis-server
```

## Checklist de Diagnóstico

- [ ] Redis está instalado (`which redis-server`)
- [ ] Redis está corriendo (`sudo systemctl status redis-server`)
- [ ] Redis escucha en la IP correcta (`sudo netstat -tlnp | grep redis`)
- [ ] Firewall permite conexiones al puerto 6379 (`sudo ufw status`)
- [ ] Conexión local funciona (`redis-cli ping`)
- [ ] Configuración de Redis permite conexiones remotas (`bind 0.0.0.0` o IP específica)
- [ ] Contraseña configurada correctamente (si aplica)

---

**Nota**: Si después de todos estos pasos Redis sigue sin funcionar, puedes simplemente dejar `REDIS_HOST` vacío en `.env` y la API funcionará normalmente con rate limiting en memoria.
