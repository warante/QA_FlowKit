# language: es
@rf:RF-403 @id:TC-403-001 @type:functional @manual:false
Caracteristica: Datos de cliente

Criterios de aceptación:
- La aplicacion muestra los datos del cliente activo.

Escenario: RF-403 TC-403-001 consulta datos de cliente
  Dado que existe el cliente real 12345678
  Cuando se consultan sus datos
  Entonces se muestran los datos del cliente
