# language: es
@rf:RF-201 @id:TC-201-001 @priority:high @type:functional @manual:false
Caracteristica: Inicio de sesion correcto

Criterios de aceptación:
- Una persona usuaria registrada puede acceder a su cuenta con credenciales validas.

Escenario: RF-201 TC-201-001 la persona usuaria inicia sesion
  Dado que la persona usuaria tiene credenciales validas y activas
  Cuando inicia sesion con esas credenciales
  Entonces se muestra la pagina principal de la cuenta
