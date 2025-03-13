const { v4: uuidv4 } = require("uuid");

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

  router.post(["/activate", "/activate/:license_key"], async (req, res) => {
    try {
      validateAuth(req);

      const licenseKey = req.params.license_key || req.body.license_key;
      if (!licenseKey) {
        return res.status(400).json({
          error: "license_key is required in the URL or request body.",
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

      if (licenseData.status === "expired") {
        return res.status(400).json({
          result: "failed",
          status: "expired",
          error: "license expired.",
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

      if (licenseData.status === "activated") {
        return res.status(400).json({
          result: "failed",
          status: "activated",
          error: "license already activated.",
          valid_for: licenseData.valid_for,
          valid_until: licenseData.valid_until,
          timestamp: new Date().toISOString(),
        });
      }

      const token = uuidv4();
      const validUntil =
        licenseData.valid_until ||
        new Date(Date.now() + licenseData.valid_for * 24 * 60 * 60 * 1000);

      await licensesService.updateOne(licenseData.id, {
        status: "activated",
        token,
        valid_until: validUntil,
      });

      return res.json({
        result: "success",
        status: "activated",
        token,
        valid_until: validUntil,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        error: `Internal server error: ${error.message}`,
      });
    }
  });
};
