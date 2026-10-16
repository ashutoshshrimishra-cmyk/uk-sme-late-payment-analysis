export const ROLES = ["sme", "financer", "investor"] as const;

export type Role = (typeof ROLES)[number];

export const SESSION_COOKIE = "ff_session";
export const SESSION_MAX_AGE = 60 * 60 * 8;

export const ROLE_HOME: Record<Role, string> = {
  sme: "/sme",
  financer: "/financer",
  investor: "/investor",
};

export function isRole(value: unknown): value is Role {
  return ROLES.some((role) => role === value);
}
