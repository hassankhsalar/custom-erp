const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const EXCLUDED_PATH_PREFIXES = ["/api/activity-logs", "/api/login", "/api/register"];

const sanitizeBody = (body) => {
  if (!body || typeof body !== "object") return null;
  const clone = { ...body };
  delete clone.password;
  delete clone.token;
  delete clone.accessToken;
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

const shouldSkip = (path, method) => {
  if (!MUTATING_METHODS.has(method)) return true;
  return EXCLUDED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
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
        module,
        action,
        description,
        entityId,
        status,
        metadata,
        ipAddress,
        userAgent,
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

  if (shouldIgnore) return next();

  res.on("finish", () => {
    const success = res.statusCode < 400;
    const module = getModuleFromPath(path);
    const action = inferAction(method, path);
    const description = `${method} ${path}`;
    const metadata = sanitizeBody(req.body);

    logActivity({
      userId: req.user?.userId || null,
      module,
      action,
      description,
      entityId: getEntityIdFromPath(path),
      status: success ? "success" : "failed",
      metadata,
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
    });
  });

  next();
};

module.exports = {
  logActivity,
  activityLoggerMiddleware,
};
