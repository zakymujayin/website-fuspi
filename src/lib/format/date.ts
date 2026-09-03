const DATE_TIME_ZONE = "Asia/Jakarta";

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: DATE_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: DATE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
};

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

/** User-facing institutional date format. Keep machine values ISO separately. */
export function formatDateDdMmYyyy(value: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", DATE_OPTIONS).format(asDate(value));
}

/** User-facing institutional timestamp format in Jakarta business time. */
export function formatDateTimeDdMmYyyy(value: Date | string): string {
  const date = asDate(value);
  const datePart = new Intl.DateTimeFormat("en-GB", DATE_OPTIONS).format(date);
  const timePart = new Intl.DateTimeFormat("en-GB", TIME_OPTIONS).format(date);
  return `${datePart} ${timePart}`;
}

export function formatTimeWib(value: Date | string): string {
  return `${new Intl.DateTimeFormat("en-GB", TIME_OPTIONS).format(asDate(value))} WIB`;
}
