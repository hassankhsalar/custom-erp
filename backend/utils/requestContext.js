const { AsyncLocalStorage } = require("async_hooks");

const requestContext = new AsyncLocalStorage();

const withRequestContext = (req, res, next) => {
  requestContext.run({ manualNotificationCount: 0 }, () => next());
};

const getRequestContext = () => requestContext.getStore();

module.exports = {
  withRequestContext,
  getRequestContext,
};
