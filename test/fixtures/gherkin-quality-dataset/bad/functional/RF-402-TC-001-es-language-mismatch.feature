# language: en
@rf:RF-402 @id:TC-402-001 @priority:medium @type:functional @manual:false
Caracteristica: Control de horario

Criterios de aceptación:
- La accion programada ocurre en una hora controlada.

Escenario: RF-402 TC-402-001 accion programada
  Dado que existe una hora controlada
  Cuando llega la hora configurada
  Entonces se muestra la accion pendiente
