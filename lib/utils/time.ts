function formatTimeDifference(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
}

export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return formatTimeDifference(diffInMinutes, "min");
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return formatTimeDifference(diffInHours, "hour");
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return formatTimeDifference(diffInDays, "day");
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return formatTimeDifference(diffInWeeks, "week");
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return formatTimeDifference(diffInMonths, "month");
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return formatTimeDifference(diffInYears, "year");
}
