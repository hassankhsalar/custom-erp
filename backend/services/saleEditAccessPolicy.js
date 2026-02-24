const toPositiveIntegerOrNull = (value, fieldName) => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0 || !Number.isInteger(num)) {
    const err = new Error(`${fieldName} must be a positive integer`);
    err.status = 400;
    throw err;
  }
  return num;
};

const normalizeEditGrantLimits = (raw = {}) => {
  const maxEditCount = toPositiveIntegerOrNull(raw.maxEditCount, "maxEditCount");
  const accessDurationMinutes = toPositiveIntegerOrNull(
    raw.accessDurationMinutes,
    "accessDurationMinutes"
  );
  return { maxEditCount, accessDurationMinutes };
};

const buildEditGrantUpdateData = ({
  targetUserId,
  grantedByUserId,
  maxEditCount,
  accessDurationMinutes,
  openedAt = new Date(),
}) => {
  const expiresAt =
    accessDurationMinutes !== null
      ? new Date(openedAt.getTime() + accessDurationMinutes * 60 * 1000)
      : null;

  return {
    editStatus: "open",
    editGrantedToUserId: targetUserId,
    editGrantedByUserId: grantedByUserId || null,
    editOpenedAt: openedAt,
    editClosedAt: null,
    editMaxCount: maxEditCount,
    editUsedCount: 0,
    editAccessDurationMinutes: accessDurationMinutes,
    editExpiresAt: expiresAt,
  };
};

const getEditGrantStateForUser = (sale, userId, nowDate = new Date()) => {
  const status = String(sale?.editStatus || "closed").toLowerCase();
  if (status !== "open") return { allowed: false, reason: "closed" };
  if (Number(sale?.editGrantedToUserId || 0) !== Number(userId || 0)) {
    return { allowed: false, reason: "granted_to_other_user" };
  }

  const now = nowDate.getTime();
  const expiresAt = sale?.editExpiresAt ? new Date(sale.editExpiresAt).getTime() : null;
  const maxCount =
    sale?.editMaxCount !== null && sale?.editMaxCount !== undefined ? Number(sale.editMaxCount) : null;
  const usedCount = Number(sale?.editUsedCount || 0);

  if (expiresAt !== null && now > expiresAt) {
    return { allowed: false, reason: "time_expired" };
  }
  if (maxCount !== null && usedCount >= maxCount) {
    return { allowed: false, reason: "count_exhausted" };
  }

  return {
    allowed: true,
    reason: null,
    remainingCount: maxCount !== null ? Math.max(0, maxCount - usedCount) : null,
    remainingMs: expiresAt !== null ? Math.max(0, expiresAt - now) : null,
  };
};

const getEditUsageUpdateOnSuccessfulEdit = (sale, editorUserId, editedAt = new Date()) => {
  const status = String(sale?.editStatus || "closed").toLowerCase();
  if (status !== "open") return {};
  if (Number(sale?.editGrantedToUserId || 0) !== Number(editorUserId || 0)) return {};

  const currentUsed = Number(sale?.editUsedCount || 0);
  const nextUsed = currentUsed + 1;
  const maxCount =
    sale?.editMaxCount !== null && sale?.editMaxCount !== undefined ? Number(sale.editMaxCount) : null;
  const expiresAt = sale?.editExpiresAt ? new Date(sale.editExpiresAt) : null;

  const data = { editUsedCount: nextUsed };
  const countEnded = maxCount !== null && nextUsed >= maxCount;
  const timeEnded = expiresAt && editedAt.getTime() >= expiresAt.getTime();

  if (countEnded || timeEnded) {
    data.editStatus = "closed";
    data.editClosedAt = editedAt;
  }

  return data;
};

const getEditGrantSummary = (sale, nowDate = new Date()) => {
  const now = nowDate.getTime();
  const maxCount =
    sale?.editMaxCount !== null && sale?.editMaxCount !== undefined ? Number(sale.editMaxCount) : null;
  const usedCount = Number(sale?.editUsedCount || 0);
  const expiresAt = sale?.editExpiresAt ? new Date(sale.editExpiresAt).getTime() : null;

  const remainingCount = maxCount !== null ? Math.max(0, maxCount - usedCount) : null;
  const remainingMs = expiresAt !== null ? Math.max(0, expiresAt - now) : null;
  const isExpired = expiresAt !== null ? now > expiresAt : false;
  const isCountExhausted = maxCount !== null ? usedCount >= maxCount : false;

  return {
    maxEditCount: maxCount,
    usedEditCount: usedCount,
    remainingEditCount: remainingCount,
    accessDurationMinutes:
      sale?.editAccessDurationMinutes !== null && sale?.editAccessDurationMinutes !== undefined
        ? Number(sale.editAccessDurationMinutes)
        : null,
    editExpiresAt: sale?.editExpiresAt || null,
    remainingAccessMs: remainingMs,
    isTimeExpired: isExpired,
    isCountExhausted,
    isLimitReached: isExpired || isCountExhausted,
  };
};

module.exports = {
  normalizeEditGrantLimits,
  buildEditGrantUpdateData,
  getEditGrantStateForUser,
  getEditUsageUpdateOnSuccessfulEdit,
  getEditGrantSummary,
};
