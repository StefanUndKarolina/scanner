const activateRoute = require("./activate");
const deactivateRoute = require("./deactivate");
const permitRoute = require("./permit");
const validateRoute = require("./validate");

module.exports = function registerEndpoint(router, options) {
  activateRoute(router, options);
  deactivateRoute(router, options);
  permitRoute(router, options);
  validateRoute(router, options);
};
