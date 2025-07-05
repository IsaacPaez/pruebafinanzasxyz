import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

interface Business {
  id: string;
  name: string;
  description?: string;
}

interface UserProfile {
  id: string;
  phone: string;
  user_name: string;
}

export class BusinessService {
  /**
   * Obtiene el perfil del usuario por número de teléfono
   */
  private async getUserProfile(phoneNumber: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, phone, user_name')
        .eq('phone', phoneNumber)
        .single();

      if (error) {
        console.error('Error obteniendo perfil del usuario:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error inesperado obteniendo perfil:', error);
      return null;
    }
  }

  /**
   * Obtiene los negocios de un usuario por su ID
   */
  private async getUserBusinesses(userId: string): Promise<Business[]> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, description')
        .eq('owner_id', userId)
        .order('name');

      if (error) {
        console.error('Error obteniendo negocios del usuario:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error inesperado obteniendo negocios:', error);
      return [];
    }
  }

  /**
   * Obtiene todos los negocios de un usuario por su número de teléfono
   */
  async getBusinessesByPhone(phoneNumber: string): Promise<Business[]> {
    console.log("🔍 Buscando negocios para el teléfono:", phoneNumber);
    
    const userProfile = await this.getUserProfile(phoneNumber);
    
    if (!userProfile) {
      console.log("❌ No se encontró perfil para el número:", phoneNumber);
      return [];
    }

    console.log("✅ Perfil encontrado:", userProfile);
    
    const businesses = await this.getUserBusinesses(userProfile.id);
    console.log("📋 Negocios encontrados:", businesses);
    
    return businesses;
  }

  /**
   * Busca un negocio por nombre (para validación)
   */
  async findBusinessByName(phoneNumber: string, businessName: string): Promise<Business | null> {
    const businesses = await this.getBusinessesByPhone(phoneNumber);
    
    return businesses.find(business => 
      business.name.toLowerCase().includes(businessName.toLowerCase())
    ) || null;
  }

  /**
   * Obtiene el ID de un usuario a partir de su número de teléfono.
   * @param phoneNumber - El número de teléfono del usuario.
   * @returns El ID del usuario o null si no se encuentra.
   */
  async getUserIdByPhone(phoneNumber: string): Promise<string | null> {
    const userProfile = await this.getUserProfile(phoneNumber);
    return userProfile ? userProfile.id : null;
  }
}

export const businessService = new BusinessService();