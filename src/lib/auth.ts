// Auth related helper functions
import { supabase } from './supabase';

/**
 * Verifies if the current user has a specific role
 * @param role The required role to check
 * @returns Promise<boolean> True if the user has the specified role
 */
export const _hasRole = async (role: 'GESTORAPP' | 'ADMINISTRADOR' | 'EDICION' | 'CONSULTAS'): Promise<boolean> => {
  try {
    // First check if the user is authenticated
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
    
    if (sessionError || !sessionData.user) {
      console.error('Error getting auth user:', sessionError);
      return false;
    }
    
    // Then check the user's role in our profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_role')
      .eq('user_id', sessionData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error getting user profile:', profileError);
      return false;
    }

    return profileData?.user_role === role;
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
};

/**
 * Verifies if the current user has any of the specified roles
 * @param roles Array of roles to check
 * @returns Promise<boolean> True if the user has any of the specified roles
 */
export const hasAnyRole = async (roles: ('GESTORAPP' | 'ADMINISTRADOR' | 'EDICION' | 'CONSULTAS')[]): Promise<boolean> => {
  try {
    // First check if the user is authenticated
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
    
    if (sessionError || !sessionData.user) {
      console.error('Error getting auth user:', sessionError);
      return false;
    }
    
    // Then check the user's role in our profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_role')
      .eq('user_id', sessionData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error getting user profile:', profileError);
      return false;
    }

    return roles.includes(profileData?.user_role as any);
  } catch (error) {
    console.error('Error checking user roles:', error);
    return false;
  }
};

/**
 * Gets the current user's role
 * @returns Promise<string|null> The user's role or null if not found
 */
export const getUserRole = async (): Promise<string | null> => {
  try {
    // First check if the user is authenticated
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !sessionData.user) {
      console.error('Error getting auth user:', sessionError);
      return null;
    }

    // Then get the user's role from our profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_role')
      .eq('user_id', sessionData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error getting user profile:', profileError);
      return null;
    }

    return profileData?.user_role || 'CONSULTAS'; // Default to CONSULTAS if no role found
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

/**
 * Verifies if the current user is active (status = true)
 * @returns Promise<{ isActive: boolean; userEmail?: string; error?: string }>
 */
export const checkUserStatus = async (): Promise<{ isActive: boolean; userEmail?: string; error?: string }> => {
  try {
    // First check if the user is authenticated
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !sessionData.user) {
      console.error('Error getting auth user:', sessionError);
      return { isActive: false, error: 'Usuario no autenticado' };
    }

    // Then get the user's status from our profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('status, email')
      .eq('user_id', sessionData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error getting user profile:', profileError);
      return { isActive: false, error: 'Error al obtener el perfil del usuario' };
    }

    if (!profileData) {
      return { isActive: false, error: 'Perfil de usuario no encontrado' };
    }

    // status is boolean: true = ACTIVO, false = INACTIVO
    return {
      isActive: profileData.status === true,
      userEmail: profileData.email
    };
  } catch (error) {
    console.error('Error checking user status:', error);
    return { isActive: false, error: 'Error al verificar el estado del usuario' };
  }
};

/**
 * Checks if the current user is GESTORAPP (highest privilege)
 * @returns Promise<boolean> True if the user has GESTORAPP role
 */
export const isGestorApp = async (): Promise<boolean> => {
  const role = await getUserRole();
  return role === 'GESTORAPP';
};

/**
 * Signs out the current user
 */
export const signOut = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

/**
 * Sends a password reset email
 * @param email The email address to send the reset link to
 * @returns Promise with the result of the operation
 */
export const _sendPasswordResetEmail = async (email: string): Promise<{ success: boolean; error?: Error }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
};

/**
 * Updates the user's password
 * @param password The new password
 * @returns Promise with the result of the operation
 */
export const _updatePassword = async (password: string): Promise<{ success: boolean; error?: Error }> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: password
    });
    
    if (error) {
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating password:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
};