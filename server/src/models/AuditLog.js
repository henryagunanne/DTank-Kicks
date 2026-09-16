const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  actorRole: { type: String },
  action: { type: String, required: true },
  entityType: { type: String },
  entityId: { type: String },
  before: { type: mongoose.Schema.Types.Mixed },
  after: { type: mongoose.Schema.Types.Mixed },
  ip: { type: String },
  userAgent: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("AuditLog", AuditLogSchema);
