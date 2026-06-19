# language: es
@rf:RF-406 @id:TC-406-001 @priority:high @type:functional @manual:false
Caracteristica: Gestion completa de cuenta

Criterios de aceptación:
- La persona usuaria puede actualizar una preferencia de cuenta.

Escenario: RF-406 TC-406-001 actualiza toda la cuenta
  Dado que la persona usuaria tiene una cuenta activa
  Cuando cambia el nombre, la direccion, el idioma y las notificaciones
  Entonces la cuenta completa, el perfil publico y todas las preferencias quedan actualizadas
