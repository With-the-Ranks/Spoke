import { UserRoleType } from "../api/organization-membership";
import {
  getHighestRole,
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

describe("getHighestRole", () => {
  it("returns the highest role from a list", () => {
    expect(getHighestRole([UserRoleType.TEXTER, UserRoleType.ADMIN])).toBe(
      UserRoleType.ADMIN
    );
  });

  it("returns the only role in a single-element array", () => {
    expect(getHighestRole([UserRoleType.TEXTER])).toBe(UserRoleType.TEXTER);
  });

  it("handles all roles and returns SUPERADMIN", () => {
    expect(
      getHighestRole([
        UserRoleType.TEXTER,
        UserRoleType.SUPERVOLUNTEER,
        UserRoleType.ADMIN,
        UserRoleType.OWNER,
        UserRoleType.SUPERADMIN
      ])
    ).toBe(UserRoleType.SUPERADMIN);
  });

  // Documents known bug: getHighestRole mutates the input array via .sort()
  it("mutates the input array (known bug)", () => {
    const roles = [UserRoleType.ADMIN, UserRoleType.TEXTER];
    getHighestRole(roles);
    // After calling getHighestRole, the array is sorted in place
    expect(roles[0]).toBe(UserRoleType.TEXTER);
    expect(roles[1]).toBe(UserRoleType.ADMIN);
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
});
