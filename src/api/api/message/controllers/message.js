"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  bymsgid: async (ctx) => {
    const result = await strapi
      .query("message")
      .model.query((qb) => {
        qb.where("id", ctx.params.msgid);
      })
      .fetch();
    const fields = result.toJSON();
    ctx.send(fields);
  },

  bygrpid: async (ctx) => {
    const result = await strapi
      .query("message")
      .model.query((qb) => {
        qb.where("whatsapp_group", ctx.params.groupid);
      })
      .fetch();
    ctx.send(result);
  },
};
