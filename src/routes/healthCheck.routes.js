import { Router } from "express";
import { healthCheck } from "../controllers/healthcheck.controller.js";

const healthCheckRouter=Router()
healthCheckRouter.route("/").get(healthCheck)
healthCheckRouter.route("/test").get(healthCheck)

export default healthCheckRouter