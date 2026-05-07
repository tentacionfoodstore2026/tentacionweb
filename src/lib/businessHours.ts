import { OpeningHours } from '../store/useStore';

const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export const isBusinessCurrentlyOpen = (openingHours?: OpeningHours[], manualOverride?: boolean): boolean => {
  if (!openingHours || openingHours.length === 0) {
    return manualOverride ?? true;
  }

  const now = new Date();
  
  // Current day and time
  const currentDayIndex = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentDayName = dayNames[currentDayIndex];
  
  // Check yesterday, in case yesterday's shift crosses midnight into today
  const yesterdayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
  const yesterdayName = dayNames[yesterdayIndex];

  const todaySchedule = openingHours.find(h => h.day.toLowerCase() === currentDayName);
  const yesterdaySchedule = openingHours.find(h => h.day.toLowerCase() === yesterdayName);

  const parseTime = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  let isOpenNow = false;

  // 1. Check if it's currently open based on yesterday's schedule (crossing midnight)
  if (yesterdaySchedule && !yesterdaySchedule.closed) {
    const openMinutes = parseTime(yesterdaySchedule.open);
    const closeMinutes = parseTime(yesterdaySchedule.close);
    
    // Crosses midnight
    if (closeMinutes < openMinutes) {
      // It is currently between 00:00 and closeMinutes of the next day (today)
      if (currentMinutes <= closeMinutes) {
        isOpenNow = true;
      }
    }
  }

  // 2. Check if it's currently open based on today's schedule
  if (!isOpenNow && todaySchedule && !todaySchedule.closed) {
    const openMinutes = parseTime(todaySchedule.open);
    const closeMinutes = parseTime(todaySchedule.close);

    if (closeMinutes < openMinutes) {
      // Crosses midnight
      // It is open from openMinutes to 23:59 today
      if (currentMinutes >= openMinutes) {
        isOpenNow = true;
      }
    } else {
      // Normal schedule within the same day
      if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
        isOpenNow = true;
      }
    }
  }

  // Final check: manual override is a toggle. If the merchant explicitly closes, we should respect it.
  // Wait, if manualOverride is false, it forces closed. If true, it might force open or just be normal.
  // The user says "haz que se guien por el horario que tenga en la configuracion del comercio".
  // So if isOpenNow is false according to hours, it is CLOSED.
  // If isOpenNow is true according to hours, but manualOverride is explicitly FALSE, then maybe closed.
  // Let's just return isOpenNow AND (manualOverride !== false).
  return isOpenNow && manualOverride !== false;
};
