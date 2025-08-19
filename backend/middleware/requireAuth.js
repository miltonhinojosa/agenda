// backend/middleware/requireAuth.js
module.exports = function requireAuth(req, res, next) {
  if (req.path.startsWith("/auth/")) return next();
  if (!req.session || !req.session.user) {
    return res.status(401).json({ mensaje: "No autenticado" });
  }
  next();
};
