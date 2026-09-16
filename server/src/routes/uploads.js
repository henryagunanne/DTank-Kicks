const router = require("express").Router();
const multer = require("multer");
const path = require("path");

// Store return inspection photos under uploads/returns
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "..", "..", "uploads/returns"),
    filename: (_req, file, cb) => cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
  }),
  limits: { fileSize: 6 * 1024 * 1024 },
});

// POST /api/uploads/returns - upload one or more return inspection photos
router.post("/returns", upload.array("photos", 8), (req, res) => {
  try {
    const files = (req.files || []).map((f) => `/uploads/returns/${f.filename}`);
    res.json({ files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload files" });
  }
});

module.exports = router;
