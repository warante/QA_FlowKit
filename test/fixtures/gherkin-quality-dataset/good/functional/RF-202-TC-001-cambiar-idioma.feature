# language: es
@rf:RF-202 @id:TC-202-001 @priority:medium @type:functional @manual:false
Caracteristica: Cambio de idioma

Criterios de aceptación:
- La aplicacion guarda el idioma elegido por la persona usuaria.

Escenario: RF-202 TC-202-001 la persona usuaria cambia el idioma
  Dado que la persona usuaria esta en la configuracion de idioma
  Cuando selecciona un idioma disponible
  Entonces la aplicacion confirma el idioma seleccionado
