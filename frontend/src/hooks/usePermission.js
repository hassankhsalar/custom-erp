import { useAuth } from '../App';

export const usePermission = () => {
  const { currentUser, loading } = useAuth();

  const hasPermission = (requiredPermission) => {
    if (loading || !currentUser || !currentUser.permission) {
      return false; // Not authenticated or no permission assigned
    }

    // Admin has all permissions
    if (currentUser.permission.name === 'admin' || currentUser.permission.name === 'superadmin') {
      return true;
    }

    // Check if the requiredPermission is in the user's permissions array
    const userPermissions = currentUser.permission.permissions;
    return Array.isArray(userPermissions) && userPermissions.includes(requiredPermission);
  };

  return { hasPermission, loading };
};
