// client/src/utils/formatDate.js

/**
 * Format ngày giờ thành dạng dễ đọc
 * @param {string|Date} date - Chuỗi ISO hoặc đối tượng Date
 * @returns {string} - Ví dụ: "28/08/2025 21:30"
 */
export const formatDate = (date) => {
  if (!date) return "";

  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Format giờ đơn giản (chỉ HH:mm)
 * @param {string|Date} date
 * @returns {string} - Ví dụ: "21:30"
 */
export const formatTime = (date) => {
  if (!date) return "";

  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
};
