import { Booking, Settings, TimeSlot, Table, TimeRange } from '../types';

export const parseTime = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const formatTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Helper to get local day of week from YYYY-MM-DD string safely
const getLocalDayOfWeek = (dateStr: string): number => {
    const [y, m, d] = dateStr.split('-').map(Number);
    // Month is 0-indexed in JS Date
    const date = new Date(y, m - 1, d); 
    return date.getDay();
};

export const isDateOpen = (dateStr: string, settings: Settings): boolean => {
    const dayOfWeek = getLocalDayOfWeek(dateStr);
    const schedule = settings.hours[dayOfWeek];
    
    if (!schedule) return false;
    return schedule.lunch.isOpen || schedule.dinner.isOpen;
};

// Check if a specific time range overlaps with an existing booking
const isOverlapping = (
  startA: number,
  endA: number,
  startB: number,
  endB: number
) => {
  return Math.max(startA, startB) < Math.min(endA, endB);
};

export const generateTimeSlots = (
  dateStr: string,
  partySize: number,
  settings: Settings,
  bookings: Booking[]
): TimeSlot[] => {
  const dayOfWeek = getLocalDayOfWeek(dateStr);
  const dayConfig = settings.hours[dayOfWeek];

  if (!dayConfig) {
    return [];
  }

  const slots: TimeSlot[] = [];
  const dayBookings = bookings.filter(b => b.date === dateStr);

  // Helper to find a suitable table
  const findAvailableTable = (slotStart: number): Table | null => {
    const slotEnd = slotStart + settings.mealDurationMinutes;
    
    // Potential tables that fit party size
    const suitableTables = settings.tables.filter(t => t.seats >= partySize);

    // Sort by smallest fit to optimize seating
    suitableTables.sort((a, b) => a.seats - b.seats);

    for (const table of suitableTables) {
      // Check if this specific table is taken
      const isTableOccupied = dayBookings.some(booking => {
        if (booking.tableId !== table.id) return false;
        
        const bookingStart = parseTime(booking.time);
        const bookingEnd = bookingStart + settings.mealDurationMinutes;
        
        return isOverlapping(slotStart, slotEnd, bookingStart, bookingEnd);
      });

      if (!isTableOccupied) {
        return table;
      }
    }
    return null;
  };

  const processRange = (range: TimeRange) => {
    if (!range.isOpen) return;

    const openTime = parseTime(range.start);
    const closeTime = parseTime(range.end);
    // Last booking must be at least mealDuration before close
    const lastBookingTime = closeTime - settings.mealDurationMinutes;

    for (let t = openTime; t <= lastBookingTime; t += 15) { // 15 min intervals for finer control
        const timeStr = formatTime(t);
        const availableTable = findAvailableTable(t);
        
        // Check if time is in the past (if today)
        const now = new Date();
        const isToday = now.toISOString().split('T')[0] === dateStr;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        let isPast = false;
        if (isToday && t < currentMinutes) {
            isPast = true;
        }

        slots.push({
            time: timeStr,
            available: !!availableTable && !isPast,
            reason: isPast ? 'past' : (!availableTable ? 'full' : undefined)
        });
    }
  };

  processRange(dayConfig.lunch);
  processRange(dayConfig.dinner);

  return slots.sort((a, b) => parseTime(a.time) - parseTime(b.time));
};

export const assignTable = (
  dateStr: string,
  timeStr: string,
  partySize: number,
  settings: Settings,
  bookings: Booking[]
): string | null => {
    // Logic mirrors findAvailableTable inside generateTimeSlots
    // Re-run to get the specific ID for saving
    const slotStart = parseTime(timeStr);
    const slotEnd = slotStart + settings.mealDurationMinutes;
    const dayBookings = bookings.filter(b => b.date === dateStr);
    
    const suitableTables = settings.tables
        .filter(t => t.seats >= partySize)
        .sort((a, b) => a.seats - b.seats);

    for (const table of suitableTables) {
        const isOccupied = dayBookings.some(booking => {
            if (booking.tableId !== table.id) return false;
            const bStart = parseTime(booking.time);
            const bEnd = bStart + settings.mealDurationMinutes;
            return isOverlapping(slotStart, slotEnd, bStart, bEnd);
        });

        if (!isOccupied) return table.id;
    }
    return null;
}

export const createGoogleCalendarUrl = (booking: Booking, settings: Settings) => {
    const startDateTime = new Date(`${booking.date}T${booking.time}`);
    const endDateTime = new Date(startDateTime.getTime() + settings.mealDurationMinutes * 60000);
    
    const formatGCalDate = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    const start = formatGCalDate(startDateTime);
    const end = formatGCalDate(endDateTime);
    
    // Formato solicitado: "4 Luis"
    const text = encodeURIComponent(`${booking.partySize} ${booking.customerName}`);
    // Localização: Telefone
    const location = encodeURIComponent(booking.customerPhone || settings.restaurantName);
    const details = encodeURIComponent(`Reserva confirmada.\nEmail: ${booking.customerEmail}`);

    let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
    
    if (settings.googleCalendarId) {
        url += `&add=${encodeURIComponent(settings.googleCalendarId)}`;
    }

    return url;
};