# Generación y distribución del APK

## Requisitos
- Acceso a la cuenta Expo/EAS del proyecto.
- `EXPO_TOKEN` configurado como secreto del repositorio GitHub para builds desde Actions.
- Credenciales de firma Android configuradas en EAS. La primera configuración puede requerir intervención del propietario.
- `npm ci` y `npm run test:unit` exitosos.

## Build
En GitHub → Actions → **Validación y APK** → Run workflow. El job `android-apk` se ejecuta manualmente y utiliza `eas.json` perfil `preview`, distribución interna y salida APK. Se requiere verificar en el panel EAS que el APK final está **firmado** y puede instalarse.

Alternativa local: `npx eas-cli build --platform android --profile preview`.

## Aceptación
1. Descargar el APK generado por EAS desde un enlace autenticado.
2. Instalar en un Android sin la app, abrir, activar licencia y registrar una habitación.
3. Actualizar una instalación anterior **sin borrar datos** y comprobar migraciones.
4. Verificar instalación con Android compatible, QR, cámara, almacenamiento, respaldo y restauración.
5. Documentar versión, fecha, hash SHA-256 del APK, firmante y resultado.
6. Compartir exclusivamente desde canal oficial de ARCANA; no publicar enlaces sin validar el origen.

**No se ha ejecutado un build ni se dispone de APK verificado en este PR.**
