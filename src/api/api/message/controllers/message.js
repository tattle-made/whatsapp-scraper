"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  findbygroupid: async (ctx) => {
    console.log(ctx.params.groupid);

    const result = await strapi
      .query("message")
      .model.query((qb) => {
        qb.where("id", ctx.params.groupid);
      })
      .fetch();

    const fields = result.toJSON();
    // get groupid from request
    console.log(fields);
    ctx.send(fields);
  },

  index: async (ctx) => {
    console.log(ctx);
    ctx.send(ctx.url);
  },
};
