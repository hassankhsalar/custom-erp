import { useAuth } from '../context/AuthContext';

export const usePermission = () => {
  const auth = useAuth();
  const currentUser = auth?.currentUser;
  const loading = auth?.loading ?? true;

  const hasPermission = (requiredPermission) => {
    if (loading || !currentUser || !currentUser.permission) {
      return false; // Not authenticated or no permission assigned
    }

    // Admin has all permissions
    if (currentUser.permission.name === 'admin' || currentUser.permission.name === 'superadmin' || requiredPermission === null ) {
      return true;
    }

    const userPermissions = currentUser.permission.permissions;

    if (!Array.isArray(userPermissions)) {
      return false; // User has no valid permissions array
    }

    if (typeof requiredPermission === 'string') {
      return userPermissions.includes(requiredPermission);
    } else if (Array.isArray(requiredPermission)) {
      return requiredPermission.some(perm => userPermissions.includes(perm));
    } else {
      return false; // Invalid requiredPermission format
    }
  };

  return { hasPermission, loading };
};
