"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
exports.authRoutes = (0, express_1.Router)();
exports.authRoutes.post('/signup', authController_1.signupController);
exports.authRoutes.post('/login', authController_1.loginController);
exports.authRoutes.put('/profile', authController_1.updateProfileController);
