# language: es
@rf:RF-407 @id:TC-407-001 @priority:medium @type:functional @manual:false
Caracteristica: Guardado de preferencias

Criterios de aceptación:
- La aplicacion confirma que las preferencias se han guardado.

Escenario: RF-407 TC-407-001 guarda preferencias por selectores internos
  Dado que la persona usuaria abre el formulario de preferencias
  Cuando pulsa el selector CSS #savePreferenceButton.primary
  Entonces la variable interna savedPreferenceFlag es true
