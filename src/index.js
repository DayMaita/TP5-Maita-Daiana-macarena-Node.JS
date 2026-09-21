const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", __dirname + "/../views");

const salasPermitidas = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
const turnosPermitidos = ["Mañana", "Tarde", "Noche"];

let reservas = [
  { id: 1, estudiante: "Ana López", email: "ana@example.com", sala: "Sala Norte", fecha: "2026-09-22", turno: "Mañana", personas: 2 },
  { id: 2, estudiante: "Bruno Díaz", email: "bruno@example.com", sala: "Sala Sur", fecha: "2026-09-22", turno: "Tarde", personas: 4 },
  { id: 3, estudiante: "Carla Pérez", email: "carla@example.com", sala: "Sala Multimedia", fecha: "2026-09-23", turno: "Noche", personas: 3 },
  { id: 4, estudiante: "Diego Ruiz", email: "diego@example.com", sala: "Sala Norte", fecha: "2026-09-24", turno: "Tarde", personas: 1 }
];

let siguienteId = 5;
let siguienteSolicitud = 1;

function identificarSolicitud(req, res, next) {
  const numero = String(siguienteSolicitud++).padStart(4, "0");
  const solicitudId = `BIB-${numero}`;
  res.locals.solicitudId = solicitudId;
  next();
}

function medirDuracion(req, res, next) {
  const inicio = process.hrtime.bigint();

  res.on("finish", () => {
    const fin = process.hrtime.bigint();
    const duracionMs = Number(fin - inicio) / 1e6;
    console.log(
      `[MEDICION] ID=${res.locals.solicitudId} METODO=${req.method} URL=${req.originalUrl} ESTADO=${res.statusCode} DURACION=${duracionMs.toFixed(2)}ms`
    );
  });

  next();
}

app.use(morgan("dev"));
app.use(identificarSolicitud);
app.use(medirDuracion);
app.use(expressLayouts);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/", (req, res) => {
  res.render("inicio", {
    titulo: "Inicio",
    mensaje: "Sistema de consulta y reserva temporal de salas de estudio."
  });
});

app.get("/estado", (req, res) => {
  res.json({
    servicio: "activo",
    reservas: reservas.length,
    solicitudId: res.locals.solicitudId
  });
});

const reservasRouter = express.Router();

function prepararAreaReservas(req, res, next) {
  res.locals.seccion = "Reservas de salas";
  next();
}

reservasRouter.use(prepararAreaReservas);

function validarReserva(req, res, next) {
  const datos = {
    estudiante: String(req.body.estudiante || "").trim(),
    email: String(req.body.email || "").trim(),
    sala: String(req.body.sala || "").trim(),
    fecha: String(req.body.fecha || "").trim(),
    turno: String(req.body.turno || "").trim(),
    personas: Number(req.body.personas)
  };

  const errores = [];

  if (!datos.estudiante) errores.push("El estudiante es obligatorio.");
  if (!datos.email) errores.push("El email es obligatorio.");
  else if (!datos.email.includes("@")) errores.push("El email debe contener @.");
  if (!datos.sala) errores.push("La sala es obligatoria.");
  else if (!salasPermitidas.includes(datos.sala)) errores.push("La sala seleccionada no está permitida.");
  if (!datos.fecha) errores.push("La fecha es obligatoria.");
  if (!datos.turno) errores.push("El turno es obligatorio.");
  else if (!turnosPermitidos.includes(datos.turno)) errores.push("El turno seleccionado no está permitido.");
  if (!Number.isInteger(datos.personas) || datos.personas < 1 || datos.personas > 6) {
    errores.push("La cantidad de personas debe ser un número entero entre 1 y 6.");
  }

  if (errores.length > 0) {
    return res.status(400).render("reservas/nueva", {
      titulo: "Nueva reserva",
      error: errores.join(" "),
      valores: {
        estudiante: datos.estudiante,
        email: datos.email,
        sala: datos.sala,
        fecha: datos.fecha,
        turno: datos.turno,
        personas: req.body.personas || ""
      },
      salasPermitidas,
      turnosPermitidos
    });
  }

  req.reservaValidada = datos;
  next();
}

function crearReserva(req, res) {
  const nuevaReserva = {
    id: siguienteId++,
    ...req.reservaValidada
  };

  reservas.push(nuevaReserva);
  res.redirect("/reservas");
}

reservasRouter.get("/", (req, res) => {
  res.render("reservas/lista", {
    titulo: "Reservas",
    reservas
  });
});

reservasRouter.get("/nueva", (req, res) => {
  res.render("reservas/nueva", {
    titulo: "Nueva reserva",
    error: null,
    valores: {},
    salasPermitidas,
    turnosPermitidos
  });
});

reservasRouter.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const reserva = reservas.find((item) => item.id === id);

  if (!reserva) {
    return res.status(404).render("no-encontrado", {
      titulo: "Reserva no encontrada",
      mensaje: "La reserva solicitada no existe."
    });
  }

  res.render("reservas/detalle", {
    titulo: `Reserva #${reserva.id}`,
    reserva
  });
});

reservasRouter.post("/", validarReserva, crearReserva);

app.use((req, res) => {
  res.status(404).render("no-encontrado", {
    titulo: "Página no encontrada",
    mensaje: "La dirección solicitada no existe."
  });
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});