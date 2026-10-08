import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, FONTS, RADIUS } from '@/constants/config';

interface PermissionGuardProps {
  children: React.ReactNode;
  /** Single required permission */
  permission?: string;
  /** Any of these permissions */
  anyPermissions?: string[];
  /** Required module key (e.g. 'SPORTS', 'FINANCE') */
  requiredModule?: string;
  /** Restrict to admins only */
  adminOnly?: boolean;
  /** Restrict to super admin only */
  superAdminOnly?: boolean;
  /** Custom fallback component */
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  children,
  permission,
  anyPermissions,
  requiredModule,
  adminOnly,
  superAdminOnly,
  fallback,
}: PermissionGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isSuperAdmin, isAdmin, hasPermission, hasAnyPermission, hasModule } = useAuth();

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed-outline" size={36} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Sign In Required</Text>
        <Text style={styles.subtitle}>Please sign in to access this feature.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/auth/login')}>
          <Text style={styles.btnText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Super admin always has access
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Check module gate
  if (requiredModule && !hasModule(requiredModule)) {
    if (fallback) return <>{fallback}</>;
    return (
      <View style={styles.container}>
        <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="cube-outline" size={36} color="#D97706" />
        </View>
        <Text style={styles.title}>Module Unavailable</Text>
        <Text style={styles.subtitle}>
          The {requiredModule} module is not enabled for your community. Please contact your administrator.
        </Text>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => router.back()}>
          <Text style={styles.btnSecondaryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Check super admin only
  if (superAdminOnly && !isSuperAdmin) {
    if (fallback) return <>{fallback}</>;
    return renderAccessDenied(router);
  }

  // Check admin only
  if (adminOnly && !isAdmin) {
    if (fallback) return <>{fallback}</>;
    return renderAccessDenied(router);
  }

  // Check permission
  if (permission && !hasPermission(permission)) {
    if (fallback) return <>{fallback}</>;
    return renderAccessDenied(router);
  }

  // Check any permissions
  if (anyPermissions && anyPermissions.length > 0 && !hasAnyPermission(...anyPermissions)) {
    if (fallback) return <>{fallback}</>;
    return renderAccessDenied(router);
  }

  return <>{children}</>;
}

function renderAccessDenied(router: any) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
        <Ionicons name="shield-outline" size={36} color="#DC2626" />
      </View>
      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.subtitle}>
        Your current security profile does not have sufficient permissions to view this screen.
      </Text>
      <TouchableOpacity style={styles.btnSecondary} onPress={() => router.back()}>
        <Text style={styles.btnSecondaryText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  btn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  btnText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  btnSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  btnSecondaryText: {
    color: COLORS.text,
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
});
