import { UserRoleType } from "../api/organization-membership";
import {
  hasRole,
  hasRoleAtLeast,
  isRoleGreater,
  ROLE_HIERARCHY
} from "./permissions";

describe("ROLE_HIERARCHY", () => {
  it("orders roles from least to most privileged", () => {
    expect(ROLE_HIERARCHY).toEqual([
      UserRoleType.SUSPENDED,
      UserRoleType.TEXTER,
      UserRoleType.SUPERVOLUNTEER,
      UserRoleType.ADMIN,
      UserRoleType.OWNER,
      UserRoleType.SUPERADMIN
    ]);
  });
});

describe("isRoleGreater", () => {
  it("returns true when first role outranks second", () => {
    expect(isRoleGreater(UserRoleType.ADMIN, UserRoleType.TEXTER)).toBe(true);
  });

  it("returns false when first role is lower than second", () => {
    expect(isRoleGreater(UserRoleType.TEXTER, UserRoleType.ADMIN)).toBe(false);
  });

  it("returns false when roles are equal", () => {
    expect(isRoleGreater(UserRoleType.ADMIN, UserRoleType.ADMIN)).toBe(false);
  });

  it("returns true for SUPERADMIN over OWNER", () => {
    expect(isRoleGreater(UserRoleType.SUPERADMIN, UserRoleType.OWNER)).toBe(
      true
    );
  });
});

describe("hasRoleAtLeast", () => {
  it("returns true when role meets the requirement", () => {
    expect(hasRoleAtLeast(UserRoleType.ADMIN, UserRoleType.ADMIN)).toBe(true);
  });

  it("returns true when role exceeds the requirement", () => {
    expect(hasRoleAtLeast(UserRoleType.OWNER, UserRoleType.ADMIN)).toBe(true);
  });

  it("returns false when role is below the requirement", () => {
    expect(hasRoleAtLeast(UserRoleType.TEXTER, UserRoleType.ADMIN)).toBe(false);
  });

  it("returns true for SUSPENDED meeting SUSPENDED", () => {
    expect(hasRoleAtLeast(UserRoleType.SUSPENDED, UserRoleType.SUSPENDED)).toBe(
      true
    );
  });
});

describe("hasRole", () => {
  it("returns true when user has a role at or above the required level", () => {
    expect(hasRole(UserRoleType.ADMIN, [UserRoleType.OWNER])).toBe(true);
  });

  it("returns false when user only has a lower role", () => {
    expect(hasRole(UserRoleType.ADMIN, [UserRoleType.TEXTER])).toBe(false);
  });

  it("returns true when one of multiple roles meets the requirement", () => {
    expect(
      hasRole(UserRoleType.ADMIN, [UserRoleType.TEXTER, UserRoleType.ADMIN])
    ).toBe(true);
  });

  // getHighestRole (internal) picks the highest from the list
  it("picks the highest from a multi-role list", () => {
    expect(
      hasRole(UserRoleType.SUPERADMIN, [
        UserRoleType.TEXTER,
        UserRoleType.SUPERVOLUNTEER,
        UserRoleType.ADMIN,
        UserRoleType.OWNER,
        UserRoleType.SUPERADMIN
      ])
    ).toBe(true);
  });

  // Verify getHighestRole doesn't mutate (tested indirectly)
  it("does not mutate the input roles array", () => {
    const roles = [UserRoleType.ADMIN, UserRoleType.TEXTER];
    hasRole(UserRoleType.TEXTER, roles);
    expect(roles[0]).toBe(UserRoleType.ADMIN);
    expect(roles[1]).toBe(UserRoleType.TEXTER);
  });
});
