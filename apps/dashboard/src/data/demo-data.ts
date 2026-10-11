export const demoMetrics = [
  { label: "Animales", value: "248", detail: "Registrados en el zoológico", icon: "paw" },
  { label: "Boletos vendidos", value: "1,847", detail: "Acumulado del mes", icon: "ticket" },
  { label: "Ingresos", value: "$184,700", detail: "Importe ficticio de muestra", icon: "coins" },
];

export const demoRevenue = [
  { day: "Lun", amount: "$12,400", height: 34 },
  { day: "Mar", amount: "$28,900", height: 54 },
  { day: "Mié", amount: "$26,600", height: 48 },
  { day: "Jue", amount: "$53,700", height: 72 },
  { day: "Vie", amount: "$75,200", height: 90 },
  { day: "Sáb", amount: "$81,500", height: 96 },
  { day: "Dom", amount: "$63,000", height: 78 },
];

export const demoNews = [
  {
    title: "Nace cría de jaguar en el zoológico",
    summary: "El nacimiento forma parte del programa de conservación de especies nativas.",
    date: "12 mar 2026",
    status: "Publicada",
    tone: "success" as const,
    color: "green",
  },
  {
    title: "Nuevo recinto para aves rapaces",
    summary: "Un espacio renovado con áreas de vuelo y descanso para las aves.",
    date: "08 mar 2026",
    status: "Publicada",
    tone: "success" as const,
    color: "blue",
  },
  {
    title: "Jornada de adopción simbólica",
    summary: "Actividad de sensibilización para conocer el cuidado animal.",
    date: "02 mar 2026",
    status: "Borrador",
    tone: "neutral" as const,
    color: "slate",
  },
];

export const demoEvents = [
  {
    title: "Noche de safari nocturno",
    status: "Programado",
    tone: "info" as const,
    date: "20 mar 2026",
    time: "19:00 – 22:00",
    place: "Sendero principal",
    color: "blue",
  },
  {
    title: "Taller infantil de conservación",
    status: "En curso",
    tone: "success" as const,
    date: "22 mar 2026",
    time: "11:00 – 13:00",
    place: "Aula ambiental",
    color: "green",
  },
  {
    title: "Alimentación de felinos",
    status: "Finalizado",
    tone: "neutral" as const,
    date: "15 mar 2026",
    time: "16:00 – 17:00",
    place: "Zona de felinos",
    color: "slate",
  },
  {
    title: "Carrera 5K por la fauna",
    status: "Cancelado",
    tone: "danger" as const,
    date: "28 feb 2026",
    time: "07:00 – 10:00",
    place: "Explanada sur",
    color: "red",
  },
];

export const demoSales = [
  { date: "21/09/2026", time: "10:35", adults: "2", children: "3", tickets: "5", total: "$98.60", status: "Completada" },
  { date: "21/09/2026", time: "09:12", adults: "4", children: "1", tickets: "5", total: "$116.20", status: "Completada" },
  { date: "20/09/2026", time: "17:48", adults: "1", children: "0", tickets: "1", total: "$25.00", status: "Cancelada" },
  { date: "20/09/2026", time: "14:20", adults: "3", children: "2", tickets: "5", total: "$107.40", status: "Completada" },
  { date: "19/09/2026", time: "11:03", adults: "2", children: "2", tickets: "4", total: "$82.40", status: "Completada" },
  { date: "19/09/2026", time: "09:27", adults: "0", children: "4", tickets: "4", total: "$64.80", status: "Completada" },
  { date: "18/09/2026", time: "12:15", adults: "3", children: "3", tickets: "6", total: "$123.60", status: "Completada" },
  { date: "18/09/2026", time: "09:52", adults: "2", children: "1", tickets: "3", total: "$66.20", status: "Cancelada" },
];

export type DemoEnclosure = {
  id: string;
  name: string;
  description: string;
  status: "Abierto" | "Cerrado";
};

export const demoEnclosures: DemoEnclosure[] = [
  {
    id: "felinos",
    name: "Zona de felinos",
    description: "Área demostrativa para jaguares y otros felinos.",
    status: "Abierto",
  },
  {
    id: "aves",
    name: "Aviario principal",
    description: "Recinto ficticio de aves de distintas regiones.",
    status: "Abierto",
  },
  {
    id: "reptiles",
    name: "Casa de reptiles",
    description: "Espacio de muestra para especies de reptiles.",
    status: "Cerrado",
  },
];

export type DemoTicketUser = {
  id: string;
  name: string;
  username: string;
  password: string;
};

export const demoAdministrationCredentials = {
  username: "administrador@demo.local",
  password: "demo1234",
};

export const demoTicketUsers: DemoTicketUser[] = [
  {
    id: "taquilla-demo",
    name: "Personal de taquilla",
    username: "taquilla@demo.local",
    password: "demo1234",
  },
];

export const demoTicketHistory = [
  {
    id: "MUESTRA-001",
    date: "21/09/2026",
    time: "10:35",
    tickets: "5",
    amount: "$98.60",
    status: "Completada",
  },
  {
    id: "MUESTRA-002",
    date: "21/09/2026",
    time: "09:12",
    tickets: "5",
    amount: "$116.20",
    status: "Completada",
  },
  {
    id: "MUESTRA-003",
    date: "20/09/2026",
    time: "17:48",
    tickets: "1",
    amount: "$25.00",
    status: "Cancelada",
  },
];
