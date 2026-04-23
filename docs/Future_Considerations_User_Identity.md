# Future Considerations: User Identity History

## Context

El API ya expone endpoints inferidos para relacionar `username` con múltiples `user_id`:

- `GET /notes-api/v1/users/by-username/{username}/user-ids`
- `GET /notes-api/v1/users/{user_id}/history-inferred`

Al mismo tiempo, en Ingestion ya existe una implementación con tablas nuevas para identidad canónica de usuario (historial de recreación/cambio de `user_id`), pero esa versión aún no está desplegada en producción.

## Goal

Permitir que el API evolucione hacia una fuente canónica de identidad **sin** introducir dependencia runtime sobre tablas o datos que todavía no existen en la versión productiva actual de Ingestion/Analytics.

## Non-Goals

- No romper endpoints actuales.
- No forzar despliegue coordinado “all-at-once” entre API, Ingestion y Analytics.
- No asumir que las tablas canónicas existen en todos los entornos.

## Current API Strategy (Safe by Default)

Mientras Ingestion/Analytics no estén desplegados con el nuevo modelo:

1. Mantener los endpoints inferidos como comportamiento principal.
2. Evitar queries directas a tablas canónicas nuevas en el flujo normal.
3. Dejar explícito en respuesta que los datos son inferidos (`inferred: true`).

## Future API Design (When Canonical Data Is Available)

Cuando el nuevo modelo esté en producción, el API debe soportar dos estrategias:

- `inferred` (actual)
- `canonical` (nuevo)

Se recomienda un selector por configuración:

- `USER_HISTORY_SOURCE=inferred|canonical|auto`

Semántica sugerida:

- `inferred`: usa únicamente lógica actual.
- `canonical`: usa únicamente tablas canónicas (falla si no están disponibles).
- `auto`: intenta canónico; si no está disponible, cae a inferido.

## Contract Evolution

### Keep

- `GET /users/by-username/{username}/user-ids`
- `GET /users/{user_id}/history-inferred`

### Add (future)

- `GET /users/{user_id}/history`
- `GET /users/by-username/{username}/history`

Estos endpoints nuevos deben devolver:

- origen de datos (`source: canonical|inferred`)
- nivel de confianza (`confidence`)
- eventos explícitos de identidad (por ejemplo `user_id_changed`, `recreated`, `renamed`)

## Rollout Plan

### Phase 1 - API ready, no dependency

- Mantener comportamiento inferido como default.
- Introducir código para estrategia dual detrás de feature flag.
- Tests para `inferred` y fallback de `auto`.

### Phase 2 - Canonical available in production

- Habilitar `auto` en entornos de staging.
- Validar paridad y diferencias entre resultados inferred vs canonical.
- Ajustar documentación pública con limitaciones y semántica final.

### Phase 3 - Canonical first

- Cambiar default a `auto` o `canonical` según estabilidad.
- Mantener endpoints inferidos para backward compatibility por una ventana definida.
- Marcar endpoints inferidos como legacy/deprecated en OpenAPI (sin removerlos de inmediato).

## Reliability and Error Handling

Para evitar fallas por dependencia prematura:

- Si `USER_HISTORY_SOURCE=canonical` y faltan tablas/datos canónicos:
  - responder con error claro (`503` recomendado) o fallback controlado según política.
- Si `USER_HISTORY_SOURCE=auto`:
  - loggear fallback a inferido con métrica operativa.

Métricas sugeridas:

- `user_history_source_canonical_count`
- `user_history_source_inferred_count`
- `user_history_fallback_count`

## Testing Considerations

Agregar cobertura para:

- inferido puro
- canónico puro
- `auto` con canónico disponible
- `auto` con fallback a inferido
- errores por canónico no disponible

Además, mantener pruebas de contrato OpenAPI para ambos grupos de endpoints.

## Risks

- Diferencias funcionales entre inferred y canonical durante transición.
- Confusión de clientes si no se comunica claramente el `source`.
- Acoplamiento accidental a tablas nuevas antes de despliegue productivo.

## Decision

Hasta que Ingestion/Analytics desplieguen el modelo canónico en producción:

- el API seguirá operando con la estrategia inferida por defecto;
- cualquier soporte canónico debe quedar protegido por configuración y fallback explícito;
- la evolución de contrato se hará de forma aditiva, no disruptiva.
