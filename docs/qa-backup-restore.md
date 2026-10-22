# Validación de respaldo y restauración — Hotel Ándale

## Alcance
El respaldo ZIP contiene `manifest.json`, `database/hotel_andale.db` y archivos locales del hotel. La restauración comprueba formato, rutas, CRC, firma SQLite, integridad y tablas principales; guarda una copia de seguridad previa antes de sustituir la base. **Estas comprobaciones en código no equivalen a una restauración probada en otro dispositivo.**

## Preparación
1. Usar dos teléfonos Android de prueba (A y B), con versiones compatibles de Hotel Ándale. Nunca usar datos reales de clientes en esta prueba.
2. En A crear 2 tipos de habitación, 3 habitaciones, 2 huéspedes, 2 reservas (una con adelanto), una estadía con check-in, un pago y una habitación en limpieza. Anotar IDs, importes, estados y cantidades.
3. Configurar duración de noche distinta del valor por defecto, moneda y datos del hotel. Guardar una imagen local del hotel si está disponible.
4. Abrir Gestión → Respaldos, crear ZIP manual y exportarlo fuera del dispositivo. Confirmar que el ZIP existe y no está vacío.

## Restauración cruzada
5. Instalar la app en B y activar la licencia correspondiente al dispositivo. **No asumir que la licencia del equipo A se transfiere.**
6. Importar el ZIP mediante Gestión → Restaurar y revisar la información del respaldo antes de confirmar. Completar el reinicio que solicite la aplicación.
7. Comprobar habitaciones, estados, huéspedes, reservas, estadías, importes, pagos, caja, duración de noche, configuración y archivos locales contra la lista del paso 2.
8. Abrir el QR de una reserva restaurada y verificar que abre la reserva correcta; intentar un nuevo pago y comprobar el saldo.
9. Crear una nueva reserva en B y confirmar que se conserva después de cerrar y volver a abrir la aplicación.

## Casos negativos
- ZIP corrupto, ZIP sin manifest, SQLite inválida y archivo ajeno: debe rechazarse sin alterar la base actual.
- ZIP con rutas de extracción maliciosas: debe rechazarse.
- Fallo/interrupción durante restauración: verificar recuperación de la base anterior y ausencia de estado intermedio.
- Restauración desde versión de esquema anterior: comprobar migraciones y datos.
- Espacio insuficiente: debe mostrar error y conservar datos anteriores.
- Repetir restauración sobre datos existentes: confirmar que el usuario comprende que reemplaza los datos locales.

## Evidencia requerida para cerrar la tarea
- Modelo de ambos dispositivos, versión Android y APK.
- Capturas antes/después de los registros de ejemplo y de los totales de caja.
- Resultado de cada paso: PASA / FALLA / NO PROBADO.
- Registro de errores y enlace a incidencia para cada fallo.

**Estado inicial: NO PROBADO EN DISPOSITIVOS.**
