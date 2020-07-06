"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  // GET /message/:groupid
  findbygroupid: async (ctx) => {
    ctx.send("Hello World!");
  },

  index: async (ctx) => {
    ctx.send("Hello World!");
  },
};
