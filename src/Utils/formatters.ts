/**
 * Formats a number as currency with commas for thousands separator
 * @param {number} amount - The number to format
 * @param {string} [currency='$'] - The currency symbol
 * @param {number} [decimals=2] - Number of decimal places
 * @returns {string}
 */
export const formatCurrency = (amount :number, currency: string = '$', decimals = 2) => {
  const userData = !currency ? JSON.parse(localStorage.getItem('userData') || '{}') : undefined;
  const currencySymbol =
    currency ??
    userData?.company_data?.currency_symbol ??
    userData?.company_data?.currency ??
    '$';

  if (Number.isNaN(amount)) {
    return `${currencySymbol}0.00`;
  }

  return `${currencySymbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

/**
 * Formats a number with commas for thousands separator
 * @param {number} value - The number to format
 * @param {number} [decimals=0] - Number of decimal places
 * @returns {string}
 */
export const formatNumber = (value  :number, decimals = 0) => {
  if (Number.isNaN(value)) {
    return '0';
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Formats a number as a percentage
 * @param {number} value - The number to format (0.1 = 10%)
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string}
 */
export const formatPercentage = (value: number, decimals = 1) => {
  if (Number.isNaN(value)) {
    return '0%';
  }

  return `${(value * 100).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
};

/**
 * Formats file size in bytes to human readable format
 * @param {number} bytes - The number of bytes
 * @returns {string}
 */
export const formatFileSize = (bytes  :number) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

/**
 * Formats a large number with K, M, B suffixes
 * @param {number} value - The number to format
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string}
 */
export const formatCompactNumber = (value :number, decimals = 1) => {
  if (Number.isNaN(value)) {
    return '0';
  }

  if (value < 1000) {
    return value.toString();
  }

  const suffixes = ['', 'K', 'M', 'B', 'T'];
  const suffixNum = Math.floor(Math.log10(Math.abs(value)) / 3);
  const shortValue = (value / 1000 ** suffixNum).toFixed(decimals);

  return `${shortValue}${suffixes[suffixNum]}`;
};

export const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';  
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date
      .toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        timeZone: 'Asia/Kolkata',
      })
      .replace(/ /g, '-');
  } catch (error) {
    console.error('Failed to format date:', error);
    return 'N/A';
  }
};
