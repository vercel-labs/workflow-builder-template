/**
 * Mask connection string for security
 */
export const maskConnectionString = (connStr: string): string => {
  // Mask password in connection string
  try {
    const url = new URL(connStr);

    if (url.password) {
      url.password = "****";
    }

    return url.toString();
  } catch {
    // If not a valid URL, just mask the middle part
    if (connStr.length <= 10) {
      return connStr;
    }

    return `${connStr.slice(0, 5)}****${connStr.slice(-5)}`;
  }
};
