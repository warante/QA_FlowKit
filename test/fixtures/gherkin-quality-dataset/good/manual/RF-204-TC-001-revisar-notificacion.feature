# language: es
@rf:RF-204 @id:TC-204-001 @priority:low @type:functional @manual:true
Caracteristica: Notificacion manual

Criterios de aceptación:
- Una persona usuaria ve una notificacion cuando hay una accion pendiente.

Escenario: RF-204 TC-204-001 la persona usuaria revisa una notificacion
  Dado que existe una accion pendiente para la persona usuaria
  Cuando abre el centro de notificaciones
  Entonces se muestra la notificacion de la accion pendiente
