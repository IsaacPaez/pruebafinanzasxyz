import { createClient } from '@supabase/supabase-js';

// Configura el cliente de Supabase con tus credenciales
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

/**
 * Servicio para gestionar la autenticación con Supabase
 */
const supabaseAuth = {
  /**
   * Verifica si un usuario existe en Supabase por número de teléfono
   * @param phoneNumber - Número de teléfono del usuario (viene de ctx.from en WhatsApp)
   * @returns true si el usuario existe, false en caso contrario
   */
  userExists: async (phoneNumber: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phoneNumber)
        .single();
      
      console.log('Verificando usuario en Supabase:', phoneNumber, ' - Resultado:', data, error);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error al verificar usuario en Supabase:', error);
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error('Error inesperado al verificar usuario:', error);
      return false;
    }
  }
};

export default supabaseAuth;