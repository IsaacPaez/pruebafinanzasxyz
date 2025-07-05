import { supabase } from './supabase';

class ProductionService {
    /**
     * Obtiene el schema de variables de una vertical específica.
     * @param verticalId El UUID de la vertical.
     * @returns El objeto JSON del schema o null si no se encuentra.
     */
    async getVerticalSchema(verticalId: string): Promise<any | null> {
        const { data, error } = await supabase
            .from('verticals')
            .select('variables_schema')
            .eq('id', verticalId)
            .single();

        if (error) {
            console.error('❌ Error obteniendo schema de vertical:', error);
            return null;
        }
        return data?.variables_schema || null;
    }

    /**
     * Actualiza el schema de variables de una vertical.
     * @param verticalId El UUID de la vertical.
     * @param newSchema El nuevo objeto JSON del schema para guardar.
     * @returns Los datos actualizados o null si hay un error.
     */
    async updateVerticalSchema(verticalId: string, newSchema: any): Promise<any | null> {
        const { data, error } = await supabase
            .from('verticals')
            .update({ variables_schema: newSchema })
            .eq('id', verticalId)
            .select()
            .single();

        if (error) {
            console.error('❌ Error actualizando schema de vertical:', error);
            return null;
        }
        return data;
    }
}

export const productionService = new ProductionService();