"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongo_1 = require("../models/mongo");
const auth_middleware_1 = require("../middleware/auth.middleware");
// Global platform settings, single document with key 'global'.
// maintenanceMode is surfaced to non-admin clients only through
// GET /api/features/effective.
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.requireRole)(['SUPERADMIN']));
// GET /api/superadmin/settings — create with defaults on first read
router.get('/', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const settings = yield mongo_1.PlatformSetting.findOneAndUpdate({ key: 'global' }, { $setOnInsert: { key: 'global' } }, { upsert: true, new: true, setDefaultsOnInsert: true });
        res.json({ success: true, data: settings });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/superadmin/settings — partial update
router.put('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const allowed = [
            'maintenanceMode',
            'allowDemoLogin',
            'enableAiFeatures',
            'enableNotifications',
            'sessionTimeout',
            'maxUploadSize',
            'defaultLanguage',
        ];
        const $set = { updatedBy: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.name) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) };
        for (const field of allowed) {
            if (req.body[field] !== undefined)
                $set[field] = req.body[field];
        }
        const settings = yield mongo_1.PlatformSetting.findOneAndUpdate({ key: 'global' }, { $set, $setOnInsert: { key: 'global' } }, { upsert: true, new: true, setDefaultsOnInsert: true });
        res.json({ success: true, data: settings });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
