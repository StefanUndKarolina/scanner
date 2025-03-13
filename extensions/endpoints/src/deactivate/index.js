module.exports = function registerEndpoint(
  router,
  { services, database, getSchema }
) {
  const { ItemsService } = services;

  const validateAuth = (req) => {
    if (!req.token) {
      throw new Error(
        "Authentication required. Please provide a valid Bearer token.",
        401
      );
    }
  };

  router.post(["/deactivate", "/deactivate/:license_key"], async (req, res) => {
    try {
      validateAuth(req);

      const licenseKey = req.params.license_key || req.body.license_key;
      const token = req.body.token;

      if (!licenseKey) {
        return res.status(400).json({
          error: "license_key is required in the URL or request body.",
          timestamp: new Date().toISOString(),
        });
      }

      if (!token) {
        return res.status(400).json({
          error: "token is required in the request body.",
          timestamp: new Date().toISOString(),
        });
      }

      const schema = await getSchema();
      const licensesService = new ItemsService("licenses", {
        schema,
        knex: database,
        accountability: req.accountability,
      });

      const license = await licensesService.readByQuery({
        filter: { license_key: { _eq: licenseKey } },
        fields: ["*"],
      });

      if (!license || license.length === 0) {
        return res.status(404).json({
          result: "failed",
          status: "unknown",
          error: "license does not exist.",
          timestamp: new Date().toISOString(),
        });
      }

      const licenseData = license[0];

      if (licenseData.status === "deactivated") {
        return res.status(400).json({
          result: "failed",
          status: "deactivated",
          error: "license is deactivated.",
          valid_for: licenseData.valid_for,
          valid_until: licenseData.valid_until,
          timestamp: new Date().toISOString(),
        });
      }

      if (licenseData.status === "revoked") {
        return res.status(400).json({
          result: "failed",
          status: "revoked",
          error: "license revoked.",
          valid_for: licenseData.valid_for,
          valid_until: licenseData.valid_until,
          timestamp: new Date().toISOString(),
        });
      }

      if (licenseData.token !== token) {
        return res.status(403).json({
          result: "failed",
          status: licenseData.status,
          error: "no permit to deactivate",
          valid_for: licenseData.valid_for,
          valid_until: licenseData.valid_until,
          timestamp: new Date().toISOString(),
        });
      }

      await licensesService.updateOne(licenseData.id, {
        status: "deactivated",
      });

      return res.json({
        result: "success",
        status: "deactivated",
        valid_until: licenseData.valid_until,
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        error: `Internal server error: ${error.message}`,
      });
    }
  });
};
