const { randomAsHex } = require("@polkadot/util-crypto")
const { existsSync } = require("fs")
const path = require('path')

module.exports = class Operator2300000000000 {
  name = 'Operator2300000000000'
  
  async up(db) {
    // Support only one operator account at the moment to avoid confusion
    const exportFilePath = path.join(__dirname, '../export/export.json')
    if (existsSync(exportFilePath)) {
      const exportData = require(exportFilePath)
      if (exportData.data.User) {
        // If export exists and contains user data, skip this migration
        return
      }
    }
    await db.query(`
      INSERT INTO "admin"."user" ("id", "is_root")
      VALUES ('${process.env.OPERATOR_SECRET || randomAsHex(32)}', true);
    `)
  }
  
  async down(db) {
    await db.query(`DELETE FROM "admin"."user" WHERE "is_root" = true;`)
  }
}
