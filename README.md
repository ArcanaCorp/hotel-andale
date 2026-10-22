# Hotel Ándale

Aplicación móvil de gestión hotelera de ARCANA CORP. Opera sin conexión y guarda sus datos en el dispositivo mediante SQLite. Distribución inicial mediante APK; requiere activación de licencia.

## Funciones principales
- Habitaciones, tipos y tarifas por hora o por noche.
- Reservas, huéspedes, check-in, check-out y limpieza.
- Cobros, devoluciones y movimientos de caja.
- Comprobante de reserva con código QR.
- Respaldos ZIP y restauración de información local.

## Desarrollo
```bash
npm ci
npm run test:unit
npx expo start --dev-client
```

La compilación APK utiliza EAS Build. Ver [guía de compilación](docs/android-build-release.md) cuando esté integrada en main.

## Instalación para clientes
1. Descargar el APK **solo del enlace oficial** proporcionado por ARCANA.
2. Verificar nombre de archivo, versión y origen del enlace.
3. Abrir el APK en Android; autorizar temporalmente la instalación desde esa fuente si el sistema lo solicita.
4. Finalizada la instalación, desactivar nuevamente el permiso para instalar aplicaciones desconocidas.
5. Abrir Hotel Ándale, activar la licencia y configurar el hotel.
6. Crear una habitación de prueba y hacer un respaldo inicial.

No desinstalar la app ni borrar sus datos antes de exportar un respaldo verificable.

## Operación diaria
- Al iniciar turno, comprobar habitaciones y abrir caja antes de recibir pagos.
- Crear reservas indicando fechas y tarifa; registrar adelantos cuando corresponda.
- Realizar check-in al recibir al huésped; confirmar cobros antes del check-out.
- Marcar limpieza terminada antes de volver a ocupar una habitación.
- Exportar respaldos con regularidad **fuera del teléfono**; las copias locales se pierden si el dispositivo se daña.

## Soporte
Para solicitar ayuda, indicar versión de app, modelo de Android, pantalla afectada, hora del problema y pasos para reproducirlo. Adjuntar captura **sin DNI, teléfonos ni datos personales**. Nunca enviar licencias, claves o bases de datos con información de huéspedes por canales no autorizados.

## Control de calidad
Ver [pruebas del ciclo de vida](tests/stay-lifecycle.test.mjs). Las pruebas automatizadas no sustituyen la validación de APK firmado, QR, pagos y restauración en dispositivos reales.
