# language: es
@rf:RF-203 @id:TC-203-001 @priority:high @type:api @manual:false
Caracteristica: Consulta de saldo por API

Criterios de aceptación:
- El servicio devuelve el saldo disponible de una cuenta autenticada.

Escenario: RF-203 TC-203-001 cliente autenticado consulta saldo
  Dado que el cliente autenticado tiene una cuenta con saldo disponible
  Cuando solicita el saldo de la cuenta
  Entonces la respuesta contiene el saldo disponible de esa cuenta
