// Fechas y horas en Buenos Aires. Todo el cálculo pasa por Intl con la zona fija: nunca depende de
// la zona del navegador. Las funciones reciben `ahora` (inyectable) en vez de leer el reloj, así los
// tests son deterministas. Argentina no tiene horario de verano: el offset es -03:00 todo el año.
export const ZONA_BA = "America/Argentina/Buenos_Aires";
const OFFSET_BA = "-03:00";

const partesFormato = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_BA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function partes(instante: Date | string) {
  const fecha = typeof instante === "string" ? new Date(instante) : instante;
  const mapa: Record<string, string> = {};
  for (const p of partesFormato.formatToParts(fecha)) mapa[p.type] = p.value;
  return mapa;
}

/** Fecha calendario (`YYYY-MM-DD`) del instante en Buenos Aires. */
export function fechaBA(instante: Date | string): string {
  const p = partes(instante);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Hora (`HH:mm`, 24 h) del instante en Buenos Aires. */
export function horaBA(instante: Date | string): string {
  const p = partes(instante);
  return `${p.hour}:${p.minute}`;
}

/** Hoy en Buenos Aires. */
export function hoyBA(ahora: Date): string {
  return fechaBA(ahora);
}

/** Año calendario de Buenos Aires (cambia a medianoche BA, no UTC). */
export function anioBA(ahora: Date): number {
  return Number(fechaBA(ahora).slice(0, 4));
}

function aUtc(fecha: string): Date {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

/** Suma (o resta) días a una fecha `YYYY-MM-DD`; cruza meses y años. */
export function sumarDias(fecha: string, dias: number): string {
  const d = aUtc(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Día de la semana de una fecha `YYYY-MM-DD`: 1 = lunes … 7 = domingo (igual que la disponibilidad). */
export function diaSemana(fecha: string): number {
  const d = aUtc(fecha).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Instante ISO con offset de BA para una fecha y hora locales (`HH:mm`). */
export function instanteBA(fecha: string, hora: string): string {
  return `${fecha}T${hora}:00${OFFSET_BA}`;
}

/** Minutos que faltan para `inicio` desde `ahora` (negativo si ya empezó). */
export function minutosHasta(inicio: string, ahora: Date): number {
  return Math.floor((new Date(inicio).getTime() - ahora.getTime()) / 60000);
}

/** Horas que faltan para `inicio` desde `ahora` (negativo si ya empezó). */
export function horasHasta(inicio: string, ahora: Date): number {
  return (new Date(inicio).getTime() - ahora.getTime()) / 3600000;
}
