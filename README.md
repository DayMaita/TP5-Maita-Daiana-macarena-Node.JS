# Trabajo práctico 05

## Descripción

Aplicación web para consultar salas de estudio y realizar reservas temporales. El proyecto se centra en el pipeline de middleware de Express.

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm start
```

También se puede comprobar la sintaxis con:

```bash
npm run check
```

## Rutas

- `GET /` Inicio.
- `GET /estado` Estado del servicio en JSON.
- `GET /reservas` Listado.
- `GET /reservas/nueva` Formulario.
- `GET /reservas/:id` Detalle.
- `POST /reservas` Alta temporal en memoria.

## Pipeline de middleware

```text
POST /reservas
  ↓ morgan("dev")
  ↓ identificarSolicitud
  ↓ medirDuracion
  ↓ expressLayouts
  ↓ express.urlencoded
  ↓ reservasRouter
  ↓ prepararAreaReservas
  ↓ validarReserva
  ↓ crearReserva
  ↓ 302 /reservas
  ↓ finish: ID + estado + duración
```

### POST inválido

```text
POST /reservas
  ↓ morgan("dev")
  ↓ identificarSolicitud
  ↓ medirDuracion
  ↓ expressLayouts
  ↓ express.urlencoded
  ↓ reservasRouter
  ↓ prepararAreaReservas
  ↓ validarReserva
  ↓ 400 + render reservas/nueva
  ↓ fin del ciclo
```

El POST inválido termina en `validarReserva`.

## Alcance de cada función

- `morgan("dev")`: middleware de terceros que registra las solicitudes.
- `identificarSolicitud`: middleware personalizado global que genera un ID consecutivo y lo guarda en `res.locals.solicitudId`.
- `medirDuracion`: middleware personalizado global que registra el evento `finish` y mide cuánto tardó la respuesta.
- `expressLayouts`: integra el layout principal de EJS.
- `express.static`: sirve recursos estáticos.
- `express.urlencoded`: permite recibir datos de formularios.
- `express.json`: permite recibir JSON.
- `prepararAreaReservas`: middleware del router; agrega `res.locals.seccion` solamente al área de reservas.
- `validarReserva`: middleware de ruta; normaliza y valida los datos del POST.
- `crearReserva`: handler final que agrega la reserva a memoria y redirige.

## Validación

El servidor comprueba:

- estudiante no vacío;
- email no vacío y con `@`;
- sala perteneciente a `salasPermitidas`;
- fecha obligatoria;
- turno permitido;
- personas enteras entre 1 y 6.

Si hay errores, responde `400`, conserva los valores recibidos y muestra un mensaje con `role="alert"`.

## Pruebas manuales

| Caso | Resultado esperado |
|---|---|
| Inicio | 200 |
| Estado | 200 JSON |
| Listado | 200 y 4 reservas iniciales |
| Formulario | 200 |
| Detalle válido | 200 |
| Detalle inexistente | 404 HTML |
| Campos vacíos | 400 |
| Sala no permitida | 400 |
| Turno no permitido | 400 |
| Email sin @ | 400 |
| Personas 0 | 400 |
| Personas 7 | 400 |
| Reserva válida | 302 y luego 200 |
| URL inexistente | 404 |
| Reinicio | Vuelven las reservas iniciales |

En cada prueba se debe revisar también el registro de Morgan y la línea `[MEDICION]` de la terminal.

## Origen de los datos iniciales

Las cuatro reservas iniciales del catálogo fueron creadas específicamente para este trabajo práctico y están declaradas directamente en `src/index.js`. No fueron importadas desde una base de datos ni desde un archivo externo. Esto permite respaldar que los datos iniciales son propios del proyecto y cumplen con la indicación de mantenerlos en memoria.

## Persistencia temporal

Las reservas se almacenan únicamente en el arreglo `reservas` de `src/index.js`. No se utiliza una base de datos ni archivos para guardar altas. Por eso, al reiniciar el servidor se pierde cualquier reserva creada durante la ejecución y vuelven a quedar únicamente las cuatro reservas iniciales.

## Diferencias entre tipos de middleware

El middleware incorporado es provisto por Express, por ejemplo `express.urlencoded`, `express.json` y `express.static`.

El middleware de terceros es instalado mediante npm y agregado al proyecto, como `morgan`.

El middleware personalizado es una función creada para resolver una necesidad específica de esta aplicación, como `identificarSolicitud`, `medirDuracion` y `prepararAreaReservas`.

## Cuándo se utiliza `next()`

`next()` se utiliza cuando un middleware terminó su tarea y debe permitir que la solicitud continúe hacia el siguiente middleware o handler. No se utiliza cuando el middleware ya generó la respuesta final, por ejemplo cuando `validarReserva` responde `400`.

## Por qué los parsers aparecen antes de la validación

`express.urlencoded` debe ejecutarse antes de `validarReserva` porque el validador necesita acceder a `req.body`. Sin el parser, los datos enviados por el formulario no estarían preparados para ser comprobados.

## Diferencia entre alcance global, de router y de ruta

Un middleware global se ejecuta para las solicitudes que pasan por `app.use`, como `identificarSolicitud`.

Un middleware de router se aplica solamente al router montado bajo `/reservas`, como `prepararAreaReservas`.

Un middleware de ruta se aplica a una ruta concreta, como `validarReserva` en `POST /reservas`.

## Motivo del evento `finish`

El evento `finish` permite medir la duración real hasta que Express termina de enviar la respuesta. Por eso `medirDuracion` registra el tiempo inicial, instala el listener y calcula los milisegundos cuando finaliza la respuesta.

## Resultado del montaje del router

Con `app.use("/reservas", reservasRouter)`, las rutas internas del router se combinan con ese prefijo. Por ejemplo, `reservasRouter.get("/")` queda disponible como `GET /reservas` y `reservasRouter.get("/nueva")` queda como `GET /reservas/nueva`.

## Diferencia entre POST 302 y GET posterior

El POST válido crea la reserva y responde con una redirección `302` hacia `/reservas`. Luego el navegador realiza un GET a `/reservas` y recibe el listado actualizado. Esto separa la creación del recurso de la visualización del listado.

## Por qué las altas desaparecen al reiniciar

Las reservas nuevas están guardadas solamente en memoria, dentro del arreglo `reservas`. Al detener y volver a iniciar Node.js, la memoria del proceso se reinicia y solamente se vuelven a cargar las cuatro reservas escritas al comienzo del archivo.

## Comprobación final

Antes de entregar:

1. Ejecutar `npm run check`.
2. Ejecutar `npm start`.
3. Recorrer las páginas y enlaces.
4. Probar respuestas 200, 302, 400 y 404.
5. Confirmar que ninguna solicitud queda cargando.
6. Confirmar que no hay errores de cabeceras enviadas.
7. Comprobar que `req.body` existe antes de validar.
8. Verificar el ID y la medición en la terminal.
9. Reiniciar y comprobar la memoria temporal.
10. Confirmar que `package-lock.json` se genera con `npm install` y que `node_modules` está excluido de Git.
