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

  router.get(["/permit", "/permit/:serial"], async (req, res) => {
    try {
      validateAuth(req);

      const serial = req.params.serial || req.body.serial;
      if (!serial) {
        return res.status(400).json({
          error: "serial is required in the URL or request body.",
        });
      }

      const schema = await getSchema();
      const productsService = new ItemsService("products", {
        schema,
        knex: database,
        accountability: req.accountability,
      });

      const product = await productsService.readByQuery({
        filter: { serial: { _eq: serial } },
        fields: ["PartNr"],
      });

      if (!product || product.length === 0) {
        return res.status(404).json({
          result: "failed",
          error: "unknown device.",
        });
      }

      const productData = product[0];

      return res.json({
        result: "success",
        partnr: productData.PartNr,
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        error: `Internal server error: ${error.message}`,
      });
    }
  });
};
