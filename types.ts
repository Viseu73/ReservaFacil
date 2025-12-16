export enum DayOfWeek {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
}

export interface TimeRange {
  isOpen: boolean;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export interface DaySchedule {
  lunch: TimeRange;
  dinner: TimeRange;
}

export interface Table {
  id: string;
  name: string;
  seats: number;
}

export interface Settings {
  restaurantName: string;
  mealDurationMinutes: number;
  toleranceMinutes: number;
  googleCalendarId: string; // New field for calendar integration
  tables: Table[];
  hours: Record<number, DaySchedule>;
}

export interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  partySize: number;
  tableId: string; // The table assigned
  createdAt: number;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string; // 'full', 'closed', 'past'
}