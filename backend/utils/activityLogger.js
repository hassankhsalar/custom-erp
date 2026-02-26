const { PrismaClient } = require("@prisma/client");
const { createNotification } = require("./notificationHelper");
const { getRequestContext } = require("./requestContext");

const prisma = new PrismaClient();

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const EXCLUDED_PATH_PREFIXES = ["/api/activity-logs", "/api/login", "/api/register"];

const sanitizeBody = (body) => {
  if (!body || typeof body !== "object") return null;
  const clone = { ...body };
  delete clone.password;
  delete clone.token;
  delete clone.accessToken;
  delete clone.oldPassword;
  delete clone.newPassword;
  delete clone.confirmPassword;
  return clone;
};

const normalizePath = (originalUrl = "") => {
  return originalUrl.split("?")[0] || "";
};

const getPathParts = (path) => {
  return path.split("/").filter(Boolean);
};

const getModuleFromPath = (path) => {
  const parts = getPathParts(path);
  if (parts.length < 2) return "system";
  return parts[1];
};

const getEntityIdFromPath = (path) => {
  const parts = getPathParts(path);
  const numericPart = parts.find((part) => /^\d+$/.test(part));
  return numericPart ? parseInt(numericPart, 10) : null;
};

const inferAction = (method, path) => {
  const lowerPath = path.toLowerCase();

  if (lowerPath.includes("/status")) return "status_change";
  if (lowerPath.includes("/clock-in")) return "clock_in";
  if (lowerPath.includes("/clock-out")) return "clock_out";
  if (lowerPath.includes("/approve")) return "approve";
  if (lowerPath.includes("/reject")) return "reject";
  if (lowerPath.includes("/return")) return "return";
  if (lowerPath.includes("/shipments")) return "shipment";
  if (lowerPath.includes("/payments")) return "payment";

  switch (method) {
    case "POST":
      return "create";
    case "PUT":
    case "PATCH":
      return "update";
    case "DELETE":
      return "delete";
    default:
      return "action";
  }
};

const getEntityLabelFromPath = (path) => {
  const parts = getPathParts(path);
  if (parts.length < 2) return "record";
  const base = String(parts[1] || "record")
    .replace(/-/g, " ")
    .replace(/s$/, "");
  return base || "record";
};

const titleCase = (value = "") => value.charAt(0).toUpperCase() + value.slice(1);

const summarizeResponse = (body) => {
  if (!body || typeof body !== "object") return null;
  if (typeof body.message === "string" && body.message.trim()) return body.message.trim();
  if (body.summary && typeof body.summary === "object") return body.summary;
  if (body.audit && typeof body.audit === "object") return body.audit;
  return null;
};

const buildDescription = ({ method, path, action, audit, responseBody, userId }) => {
  if (audit?.description) return audit.description;
  const entity = audit?.entity || getEntityLabelFromPath(path);
  const entityId = audit?.entityId || getEntityIdFromPath(path);
  const objectRef = entityId ? `${entity} #${entityId}` : entity;
  const byUser = userId ? ` by user #${userId}` : "";
  const base = `${titleCase(action)} ${objectRef}${byUser}`;
  const responseSummary = summarizeResponse(responseBody);
  const body = sanitizeBody(audit?.requestBody || null);
  const changedFields = !body ? [] : Object.keys(body).filter((key) => body[key] !== undefined);
  if ((action === "create" || action === "update") && changedFields.length) {
    if (typeof responseSummary === "string") return `${base}. Fields: ${changedFields.join(", ")}. ${responseSummary}`;
    return `${base}. Fields: ${changedFields.join(", ")}.`;
  }
  if (typeof responseSummary === "string") return `${base}. ${responseSummary}`;
  return base;
};

const shouldSkip = (path, method) => {
  if (!MUTATING_METHODS.has(method)) return true;
  return EXCLUDED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
};

const STOCK_MONEY_MODULES = new Set([
  "materials",
  "products",
  "factories",
  "stores",
  "shops",
  "productions",
  "purchases",
  "sales",
  "shop-sales",
  "transfers",
  "damage-records",
  "repairs",
  "requisitions",
  "accounts",
  "cash-registers",
  "bank-accounts",
  "expenses",
]);

const MAX_LOG_LENGTHS = {
  module: 120,
  action: 120,
  description: 5000,
  status: 50,
  ipAddress: 64,
  userAgent: 255,
};

const truncateText = (value, maxLength) => {
  if (value === undefined || value === null) return null;
  const text = String(value);
  if (text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 3)) + "...";
};

const shouldNotifyAdminForMutation = ({ module, action, audit }) => {
  if (audit?.skipNotification) return false;
  if (action === "create" && (module === "sales" || module === "shop-sales")) return false;
  if (audit?.stockMovement || audit?.moneyMovement) return true;
  if (action === "payment" || action === "shipment" || action === "return") return true;
  return STOCK_MONEY_MODULES.has(module);
};

const logActivity = async ({
  userId = null,
  module = "system",
  action = "action",
  description = null,
  entityId = null,
  status = "success",
  metadata = null,
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        module: truncateText(module, MAX_LOG_LENGTHS.module),
        action: truncateText(action, MAX_LOG_LENGTHS.action),
        description: truncateText(description, MAX_LOG_LENGTHS.description),
        entityId,
        status: truncateText(status, MAX_LOG_LENGTHS.status),
        metadata,
        ipAddress: truncateText(ipAddress, MAX_LOG_LENGTHS.ipAddress),
        userAgent: truncateText(userAgent, MAX_LOG_LENGTHS.userAgent),
      },
    });
  } catch (error) {
    console.error("Failed to write activity log:", error.message);
  }
};

const activityLoggerMiddleware = (req, res, next) => {
  const method = req.method;
  const path = normalizePath(req.originalUrl);
  const shouldIgnore = shouldSkip(path, method);
  let responseBody = null;

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };

  req.setAuditTrail = (audit = {}) => {
    res.locals.audit = { ...(res.locals.audit || {}), ...audit };
  };

  if (shouldIgnore) return next();

  res.on("finish", () => {
    const success = res.statusCode < 400;
    const module = getModuleFromPath(path);
    const action = inferAction(method, path);
    const audit = res.locals.audit || {};
    const description = buildDescription({
      method,
      path,
      action,
      audit: { ...audit, requestBody: sanitizeBody(req.body) },
      responseBody,
      userId: req.user?.userId || null,
    });
    const metadata = {
      requestBody: sanitizeBody(req.body),
      responseSummary: summarizeResponse(responseBody),
      auditDetails: audit?.details || null,
      statusCode: res.statusCode,
    };

    logActivity({
      userId: req.user?.userId || null,
      module,
      action: audit?.action || action,
      description,
      entityId: audit?.entityId || getEntityIdFromPath(path),
      status: success ? "success" : "failed",
      metadata,
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
    });

    if (!success) return;
    if (!shouldNotifyAdminForMutation({ module, action: audit?.action || action, audit })) return;

    const requestContext = getRequestContext();
    if (requestContext && Number(requestContext.manualNotificationCount || 0) > 0) return;

    const entity = audit?.entity || getEntityLabelFromPath(path);
    const notificationTitle = `${titleCase(audit?.action || action)} ${entity}`;
    const notificationDescription = description;

    createNotification(prisma, {
      title: notificationTitle,
      description: notificationDescription,
      forRole: "admin",
      link: path,
    }).catch(() => {});
  });

  next();
};

module.exports = {
  logActivity,
  activityLoggerMiddleware,
};
