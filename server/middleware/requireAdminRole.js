function requireAdminRole(...allowedRoles) {
  return (req, res, next) => {
    const admin = req.session && req.session.admin;

    if (!admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!allowedRoles.includes(admin.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}

module.exports = requireAdminRole;