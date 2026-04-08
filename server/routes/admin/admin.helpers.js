const { ROLE_RANK } = require("./admin.constants.js");

const canCreateRole = (creatorRole, targetRole) => {
  if (!ROLE_RANK[creatorRole] || !ROLE_RANK[targetRole]) return false;
  if (targetRole === "emperor") return creatorRole === "emperor";
  return ROLE_RANK[creatorRole] > ROLE_RANK[targetRole];
};

const canModifyTarget = (currentRole, targetRole) => {
  if (!ROLE_RANK[currentRole] || !ROLE_RANK[targetRole]) return false;
  if (targetRole === "emperor") return currentRole === "emperor";
  return ROLE_RANK[currentRole] > ROLE_RANK[targetRole];
};

const cleanText = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const cleanBool = (value) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

const cleanNumeric = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

module.exports = {
  canCreateRole,
  canModifyTarget,
  cleanText,
  cleanBool,
  cleanNumeric,
};