const express = require("express");

const authRoutes = require("./auth.routes.js");
const overviewRoutes = require("./overview.routes.js");
const staffRoutes = require("./staff.routes.js");
const storesRoutes = require("./stores.routes.js");
const ordersRoutes = require("./orders.routes.js");
const usersRoutes = require("./users.routes.js");
const productsRoutes = require("./products.routes.js");
const locationsRoutes = require("./locations.routes.js");
const affiliatesRoutes = require("./affiliates.routes.js");

const router = express.Router();

router.use("/", authRoutes);
router.use("/overview", overviewRoutes);
router.use("/staff", staffRoutes);
router.use("/stores", storesRoutes);
router.use("/orders", ordersRoutes);
router.use("/users", usersRoutes);
router.use("/products", productsRoutes);
router.use("/locations", locationsRoutes);
router.use("/affiliates", affiliatesRoutes);

module.exports = router;
