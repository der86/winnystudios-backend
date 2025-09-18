export function notFound(req, res, next) {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(err, req, res, next) {
  console.error("Server error:", err);
  res.status(500).json({ error: "Server error" });
}
