# Guía de Contribución

Gracias por tu interés en contribuir a OSM Notes API. Este documento proporciona guías y estándares para contribuir al proyecto.

## Código de Conducta

Este proyecto adhiere a un Código de Conducta. Al participar, se espera que mantengas este código. Por favor reporta comportamientos inaceptables a los mantenedores del proyecto.

## ¿Cómo puedo contribuir?

### Reportar Bugs

Si encuentras un bug:

1. Verifica que no haya sido reportado ya en los [Issues](https://github.com/osmlatam/OSM-Notes-API/issues)
2. Si no existe, crea un nuevo issue con:
   - Descripción clara del problema
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Versión de Node.js y sistema operativo
   - Logs relevantes si aplica

### Sugerir Mejoras

Para sugerir nuevas funcionalidades:

1. Verifica que no haya sido sugerida ya
2. Crea un issue con:
   - Descripción clara de la funcionalidad
   - Caso de uso y justificación
   - Ejemplos de cómo se usaría

### Contribuir Código

#### Proceso de Desarrollo

1. **Fork** el repositorio
2. **Crea una rama** desde `main`:
   ```bash
   git checkout -b feature/nombre-de-tu-feature
   ```
3. **Desarrolla** tu cambio siguiendo los estándares del proyecto
4. **Escribe tests** para tu código (TDD preferido)
5. **Asegúrate** que todos los tests pasen:
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```
6. **Commit** tus cambios usando [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: agregar nueva funcionalidad X"
   ```
7. **Push** a tu fork:
   ```bash
   git push origin feature/nombre-de-tu-feature
   ```
8. **Abre un Pull Request** con descripción clara

#### Estándares de Código

- **TypeScript**: Usa TypeScript con strict mode
- **ESLint**: El código debe pasar `npm run lint` sin errores
- **Prettier**: El código debe estar formateado (`npm run format`)
- **Tests**: Nuevo código debe incluir tests (cobertura mínima 80%)
- **Documentación**: Documenta funciones públicas con JSDoc

#### Convenciones de Commits

Usa [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Formato, punto y coma, etc. (sin cambios de código)
- `refactor:` Refactorización de código
- `test:` Agregar o modificar tests
- `chore:` Cambios en build, dependencias, etc.

Ejemplos:
```bash
git commit -m "feat: agregar endpoint de búsqueda de usuarios"
git commit -m "fix: corregir validación de User-Agent"
git commit -m "docs: actualizar README con ejemplos"
```

#### Estructura de Pull Requests

Un buen PR incluye:

- **Título claro** que describe el cambio
- **Descripción** explicando qué y por qué
- **Referencias** a issues relacionados (closes #123)
- **Tests** que validen el cambio
- **Documentación** actualizada si aplica

#### Revisión de Código

- Los PRs requieren al menos una aprobación
- Los mantenedores revisarán:
  - Calidad del código
  - Cobertura de tests
  - Cumplimiento de estándares
  - Documentación

## Configuración del Entorno de Desarrollo

Ver [docs/INSTALLATION.md](docs/INSTALLATION.md) para instrucciones detalladas.

Resumen rápido:

```bash
# Clonar y configurar
git clone https://github.com/osmlatam/OSM-Notes-API.git
cd OSM-Notes-API
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env

# Ejecutar tests
npm test

# Desarrollo
npm run dev
```

## Preguntas

Si tienes preguntas sobre cómo contribuir, puedes:

- Abrir un issue con la etiqueta `question`
- Contactar a los mantenedores

## Reconocimiento

Todas las contribuciones son valiosas y serán reconocidas. ¡Gracias por ayudar a mejorar OSM Notes API!

