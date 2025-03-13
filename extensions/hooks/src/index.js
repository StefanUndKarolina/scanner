module.exports = function registerHook(
  { schedule },
  { services, database, getSchema }
) {
  const { ItemsService } = services;

  // Schedule to run every day at midnight (00:00 UTC)
  schedule("*/1 * * * *", async () => {
    try {
      // Get the schema dynamically
      const schema = await getSchema();

      // Initialize ItemsService with admin privileges
      const licensesService = new ItemsService("licenses", {
        schema,
        knex: database,
        accountability: { admin: true }, // Run as admin to bypass user permissions
      });

      const now = new Date();

      // Find licenses where valid_until is in the past and status isn’t "expired"
      const expiredLicenses = await licensesService.readByQuery({
        filter: {
          valid_until: { _lte: now.toISOString() },
          status: { _neq: "expired" },
        },
        fields: ["id", "license_key", "valid_until", "status"], // Include fields for logging
      });

      if (expiredLicenses && expiredLicenses.length > 0) {
        const licenseIds = expiredLicenses.map((license) => license.id);

        // Update all expired licenses to "expired"
        await licensesService.updateMany(licenseIds, {
          status: "expired",
        });

        // Log details of updated licenses
        console.log(
          `Updated ${licenseIds.length} licenses to "expired" on ${now}:`
        );
        expiredLicenses.forEach((license) =>
          console.log(
            `License ${license.license_key}: valid_until=${license.valid_until}, previous_status=${license.status}`
          )
        );
      } else {
        console.log(`No licenses expired as of ${now}`);
      }
    } catch (error) {
      console.error(`Cron job failed on ${new Date()}: ${error.message}`);
    }
  });
};
