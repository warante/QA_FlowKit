# language: es
@rf:RF-205 @id:TC-205-001 @priority:high @type:e2e @manual:false
Caracteristica: Confirmacion de reserva

Criterios de aceptación:
- Una reserva completada muestra una confirmacion con referencia.

Escenario: RF-205 TC-205-001 la persona usuaria confirma una reserva
  Dado que la persona usuaria tiene una reserva pendiente con datos validos
  Cuando confirma la reserva
  Entonces se muestra una confirmacion con la referencia de reserva
