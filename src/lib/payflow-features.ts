/**
 * PayFlow UI feature toggles.
 * Flip SHOW_PAYFLOW_DELETE to true to re-enable entity Delete actions
 * and delete_* permission checkboxes in Roles.
 */
export const SHOW_PAYFLOW_DELETE = false;

/** Permission codes hidden from the Roles PermissionPicker while delete is off. */
export function isHiddenDeletePermission(code: string): boolean {
  return code.startsWith("delete_");
}
