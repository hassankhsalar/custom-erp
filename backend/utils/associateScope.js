const buildScope = async (prisma, userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { permission: true }
  });
  const role = user?.permission?.name || "";
  const isAdmin = role === "admin" || role === "superadmin";

  const rows = await prisma.userAssociate.findMany({
    where: {
      userId,
      associateName: { in: ["shop", "store", "factory"] }
    },
    select: { associateName: true, associateId: true }
  });

  const scope = {
    isAdmin,
    shops: new Set(),
    stores: new Set(),
    factories: new Set()
  };

  rows.forEach((r) => {
    if (r.associateName === "shop") scope.shops.add(r.associateId);
    if (r.associateName === "store") scope.stores.add(r.associateId);
    if (r.associateName === "factory") scope.factories.add(r.associateId);
  });

  return scope;
};

const ensureHasAnyScope = (scope) => {
  if (scope.isAdmin) return;
  if (scope.shops.size === 0 && scope.stores.size === 0 && scope.factories.size === 0) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
};

const ensureTypeScope = (scope, type) => {
  if (scope.isAdmin) return;
  const set =
    type === "shop" ? scope.shops :
    type === "store" ? scope.stores :
    type === "factory" ? scope.factories : null;
  if (!set || set.size === 0) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
};

const ensureIdScope = (scope, type, id) => {
  if (scope.isAdmin) return;
  const set =
    type === "shop" ? scope.shops :
    type === "store" ? scope.stores :
    type === "factory" ? scope.factories : null;
  if (!set || !set.has(id)) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
};

const buildLocationOrFilter = (scope) => {
  if (scope.isAdmin) return undefined;
  const ors = [];
  if (scope.shops.size > 0) ors.push({ destinationType: "shop", destinationId: { in: Array.from(scope.shops) } });
  if (scope.stores.size > 0) ors.push({ destinationType: "store", destinationId: { in: Array.from(scope.stores) } });
  if (scope.factories.size > 0) ors.push({ destinationType: "factory", destinationId: { in: Array.from(scope.factories) } });
  if (ors.length === 0) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  return { OR: ors };
};

const buildTransferOrFilter = (scope) => {
  if (scope.isAdmin) return undefined;
  const ors = [];
  if (scope.shops.size > 0) {
    ors.push({ from: "shop", fromId: { in: Array.from(scope.shops) } });
    ors.push({ to: "shop", toId: { in: Array.from(scope.shops) } });
  }
  if (scope.stores.size > 0) {
    ors.push({ from: "store", fromId: { in: Array.from(scope.stores) } });
    ors.push({ to: "store", toId: { in: Array.from(scope.stores) } });
  }
  if (scope.factories.size > 0) {
    ors.push({ from: "factory", fromId: { in: Array.from(scope.factories) } });
    ors.push({ to: "factory", toId: { in: Array.from(scope.factories) } });
  }
  if (ors.length === 0) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  return { OR: ors };
};

module.exports = {
  buildScope,
  ensureHasAnyScope,
  ensureTypeScope,
  ensureIdScope,
  buildLocationOrFilter,
  buildTransferOrFilter
};
