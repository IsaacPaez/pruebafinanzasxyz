import { supabase } from './supabase';
import { cleanAndParseNumber } from '../../utils/stringUtils';

// Definición del "molde" para los datos de una transacción.
// Nos aseguramos de que incluya todas las propiedades que usamos.
export interface TransactionData {
    userId: string;
    businessId: string;
    verticalId: string;
    categoria: string;
    subcategoria: string;
    userPhoneNumber: string;
    canal: string;
    monto: string;
    tipo: 'ingreso' | 'gasto';
    comercio?: string;
    description?: string; // Corregido: Añadida la propiedad 'description'
    fecha?: string;
    metodoPago?: string;
    entidadMetodoPago?: string;
}

class TransactionService {
    /**
     * Guarda una transacción en la base de datos.
     * @param data Un objeto que cumple con la interfaz TransactionData.
     * @returns El registro guardado o null si hay un error.
     */
    async saveTransaction(data: TransactionData): Promise<any[] | null> {
        console.log("💾 Intentando guardar la transacción en la base de datos...");

        // Mapeamos los datos del bot a las columnas de la tabla 'movements'
        const movementToInsert = {
            business_id: data.businessId,
            vertical_id: data.verticalId,
            date: data.fecha ? new Date(data.fecha.split('/').reverse().join('-')).toISOString() : new Date().toISOString(),
            amount: cleanAndParseNumber(data.monto),
            type: data.tipo,
            store: data.comercio || 'N/A',
            payment_method: data.metodoPago || 'N/A',
            entity: data.entidadMetodoPago || 'N/A',
            description: data.description || `Registrado desde ${data.canal}` // Corregido: Usamos la propiedad description
        };

        console.log("📦 Objeto a insertar en 'movements':", movementToInsert);

        const { data: savedData, error } = await supabase
            .from('movements')
            .insert([movementToInsert])
            .select();

        if (error) {
            console.error("❌ Error al guardar el movimiento:", error);
            throw new Error(`Error en Supabase: ${error.message}`);
        }

        console.log("✅ Movimiento guardado con éxito:", savedData);
        return savedData;
    }
}

export const transactionService = new TransactionService();