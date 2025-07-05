import { createClient } from '@supabase/supabase-js';

// Inicializa el cliente de Supabase, igual que en businessService.ts
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
);

interface Vertical {
    id: string;
    name: string;
    description?: string;
}

// Se elimina "extends SupabaseService"
class VerticalService {
    // Se elimina el constructor

    /**
     * Obtiene las verticales activas asociadas a un ID de negocio.
     * @param businessId - El ID del negocio seleccionado.
     * @returns Una promesa que se resuelve con un array de verticales.
     */
    async getVerticalsByBusinessId(businessId: string): Promise<Vertical[]> {
        
        // Se cambia "this.supabase" por la constante "supabase" local
        const { data, error } = await supabase
            .from('verticals')
            .select('id, name, description')
            .eq('business_id', businessId)
            .eq('active', true);

        if (error) {
            console.error('❌ Error al obtener verticales desde Supabase:', error.message);
            throw new Error(error.message);
        }

        if (!data) {
            console.log(`🟡 No se encontraron verticales para el business_id: ${businessId}`);
            return [];
        }
        
        console.log(`📋 Verticales encontradas:`, data);
        return data as Vertical[];
    }
}

export const verticalService = new VerticalService();