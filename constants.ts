import { Settings, DayOfWeek, DaySchedule } from './types';

const defaultSchedule: DaySchedule = {
  lunch: { isOpen: true, start: "12:00", end: "15:00" },
  dinner: { isOpen: true, start: "19:00", end: "23:00" }
};

const closedLunch: DaySchedule = {
    lunch: { isOpen: false, start: "12:00", end: "15:00" },
    dinner: { isOpen: true, start: "19:00", end: "23:00" }
};

const sundaySchedule: DaySchedule = {
    lunch: { isOpen: true, start: "12:00", end: "16:00" },
    dinner: { isOpen: false, start: "19:00", end: "23:00" }
};

export const DEFAULT_SETTINGS: Settings = {
  restaurantName: "Sabor & Arte",
  mealDurationMinutes: 90,
  toleranceMinutes: 10,
  googleCalendarId: "",
  tables: [
    { id: 't1', name: 'Mesa 1', seats: 2 },
    { id: 't2', name: 'Mesa 2', seats: 2 },
    { id: 't3', name: 'Mesa 3', seats: 4 },
    { id: 't4', name: 'Mesa 4', seats: 4 },
    { id: 't5', name: 'Mesa 5', seats: 6 },
  ],
  hours: {
    [DayOfWeek.Monday]: defaultSchedule,
    [DayOfWeek.Tuesday]: defaultSchedule,
    [DayOfWeek.Wednesday]: defaultSchedule,
    [DayOfWeek.Thursday]: defaultSchedule,
    [DayOfWeek.Friday]: defaultSchedule,
    [DayOfWeek.Saturday]: defaultSchedule,
    [DayOfWeek.Sunday]: sundaySchedule,
  },
};

export const DAYS_LABEL = [
  "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"
];