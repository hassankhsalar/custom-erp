export const isActiveRecord = (row) => row?.deleted_at !== true;

export const activeOnly = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.filter(isActiveRecord);
};

export const parseListResponse = (data, key) => {
  if (Array.isArray(data)) return activeOnly(data);
  if (key && Array.isArray(data?.[key])) return activeOnly(data[key]);
  return [];
};
