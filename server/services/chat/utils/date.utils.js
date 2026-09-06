import { CHAT_CONFIG } from '../config/chat.config.js';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CHAT_CONFIG.TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: CHAT_CONFIG.TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const formatShowDate = (date) => formatter.format(new Date(date));
export const formatShowTime = (date) => timeFormatter.format(new Date(date));

export const getTodayDateString = () => formatShowDate(new Date());

export const getRelativeDateLabel = (dateStr) => {
  const today = getTodayDateString();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = formatShowDate(tomorrowDate);

  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  return dateStr;
};
