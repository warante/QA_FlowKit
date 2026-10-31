# Guía rápida de uso

Idioma: [English](getting-started.md) | **Español**

**Instala desde la terminal; configura y usa QA FlowKit dentro del CLI del modelo mediante comandos `/qa-*`.**
El agente ejecuta los scripts internos por ti. No necesitas salir de su sesión para configurar el contexto,
avanzar por las fases o lanzar las comprobaciones habituales.

## 1. Instalar — solo este paso en la terminal

Necesitas Node.js 22.18+; se recomienda Node.js 24. Desde el repositorio donde quieres usar QA FlowKit:

```bash
npx qa-flowkit
```

Selecciona el adaptador de tu agente cuando te lo pregunte. Durante la etapa RC puedes instalar con
`npx qa-flowkit@rc` si necesitas ese canal explícitamente. La instalación prepara el framework y el adaptador;
la configuración del proyecto se realiza después, dentro del modelo.

## 2. Configurar — dentro del CLI del modelo

Abre el mismo repositorio en tu agente y escribe:

```text
/qa-init
```

Usa `/qa-init`, no el comando `/init` propio del host. El agente te preguntará por el idioma, las prácticas del equipo,
el nombre del proyecto, el idioma Gherkin, la plantilla manual o de automatización, las fuentes y las herramientas.
También te ayudará a elegir cómo organizar los escenarios. Revisa la propuesta y aprueba los cambios antes de aplicarlos.

Si ya tienes una carpeta local con la forma de trabajar de tu equipo, puedes comenzar así:

```text
/qa-init --qa-context qa-ai-knowledge
```

El agente leerá esa carpeta como contexto, distinguirá lo documentado de las suposiciones y pedirá aprobación para
los valores inferidos. Gestionará `.qa-ai/qa-ai.config.yaml` y los artefactos de contexto aprobados.

## 3. Comprobar la configuración — dentro del CLI del modelo

```text
/qa-doctor
/qa-help
```

`/qa-doctor` revisa la instalación y configuración; `/qa-help` recomienda el siguiente paso según el estado del repositorio.
Si no aparecen los comandos recién instalados, vuelve a abrir la sesión del agente en el mismo repositorio.
Los hosts con el adaptador correspondiente, como Claude Code y OpenCode, ofrecen los comandos barra de proyecto.
En otros hosts sigue la skill o las instrucciones generadas: no todos tienen la misma sintaxis de comandos.

## 4. Trabajar con un requisito — dentro del CLI del modelo

Para recorrer el workflow guiado:

```text
/qa-full-flow
```

Indica la fuente del requisito y su RF oficial cuando el agente los solicite. El agente presentará un plan,
pedirá las aprobaciones necesarias, generará los artefactos y ejecutará los validadores correspondientes.
Revisa y responde dentro de la conversación; no tienes que manejar las fases internas desde otra terminal.

Si ya tienes un repositorio QA y solo quieres añadir pruebas para un requisito nuevo, utiliza esta alternativa:

```text
/qa-add-tests
```

No necesitas ejecutar ambos comandos para la misma tarea. Al terminar, consulta el resultado y lo que queda pendiente:

```text
/qa-status
/qa-help
```

## Comandos habituales

Todos se escriben **dentro del CLI del modelo**, no en la terminal del sistema:

| Comando                 | Uso                                                        |
| ----------------------- | ---------------------------------------------------------- |
| `/qa-init`              | Configuración guiada del proyecto                          |
| `/qa-doctor`            | Comprobar la salud de la configuración                     |
| `/qa-help`              | Recomendar el siguiente paso                               |
| `/qa-full-flow`         | Guiar el workflow QA configurado                           |
| `/qa-add-tests`         | Proponer pruebas para un requisito nuevo                   |
| `/qa-update-tests`      | Revisar cambios en pruebas existentes                      |
| `/qa-validate-features` | Validar los archivos Gherkin generados                     |
| `/qa-status`            | Resumir artefactos, comprobaciones y decisiones pendientes |
| `/qa-config`            | Importar o exportar un perfil de configuración             |

Para habilitar gobernanza enterprise después de configurar, pide `/qa-enable-enterprise`; consulta
[los tracks](qa-help.md). Las escrituras externas requieren aprobación independiente. Validar artefactos no demuestra
que se hayan ejecutado pruebas automatizadas ni creado una PR en GitHub.

## Ejemplo RF-101

Configura con `/qa-init` y elige la plantilla manual. Después, dentro del modelo:

```text
/qa-full-flow requirements/RF-101-login.md
```

Indica un archivo de requisitos existente o pega el requisito cuando te lo pida, confirma RF-101 y revisa el diseño.
El agente te guiará por la generación y validación. Las carpetas predeterminadas son `.qa-ai/output/` y `.qa-ai/features/`.

El replay automático con fixtures sirve para verificar el framework, **no es el recorrido de usuario ni una sesión
grabada del modelo**. El [vídeo histórico](demo.md) y el preview CLI anterior no representan este enfoque. La nueva
versión es una guía visual ilustrada de comandos barra, no una sesión grabada del modelo; se revisa por separado
antes de sustituir los medios publicados.

## Alternativas opcionales

Los scripts directos siguen disponibles para CI, diagnóstico, hosts sin comandos barra y mantenimiento.
Están separados en la [referencia de terminal y mantenimiento](terminal-setup-and-maintenance.md), no forman parte
del camino principal. Consulta también [la CLI](cli-reference.md) y [el workflow](workflow.md).
