const NodeCache = require('node-cache');

// stdTTL: time to live in seconds for every new entry. 0 = unlimited
const cache = new NodeCache({ stdTTL: 60 * 60 }); // Cache for 60 minutes or 1 hour

function get(key) {
  return cache.get(key);
}

function set(key, value) {
  cache.set(key, value);
}

function del(key) {
  cache.del(key);
}

function flush() {
  cache.flushAll();
}

module.exports = {
  get,
  set,
  del,
  flush
};
