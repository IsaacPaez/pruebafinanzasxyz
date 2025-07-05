import { addKeyword, EVENTS } from "@builderbot/bot";
import aiServices from "../../services/AI/aiServices";
import { askForMissingDataFlow } from "./cases/transactions/askForMissingDataFlow";
import { processProductionDataFlow } from "../production/processProductionDataFlow";

const audioFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { provider, state, gotoFlow, endFlow, flowDynamic }) => {
        console.log("🎙️ Audio detectado. Extrayendo datos con Gemini...");

        try {
            // Corregido: Se usa provider.saveFile(ctx) en lugar de provider.downloadMedia
            const audioPath = await provider.saveFile(ctx);
            const mimeType = ctx.mimeType || 'audio/ogg';

            const extractedData = await aiServices.extractDataFromAudio(audioPath, mimeType);

            if (!extractedData || extractedData.tipo_registro === 'desconocido') {
                await flowDynamic("❌ No pude entender claramente tu audio. Por favor, envía un audio más claro especificando:");
                await flowDynamic("• Para TRANSACCIONES: 'Gasté 50 mil pesos en la ferretería'");
                await flowDynamic("• Para PRODUCCIÓN: 'La vaca 1 produjo 10 litros de leche'");
                return endFlow("Puedes intentar de nuevo con un audio más claro.");
            }

            // Verificar que tengamos datos mínimos
            if (extractedData.tipo_registro === 'produccion') {
                // Verificar nuevo formato con array de items
                if (!extractedData.items || !Array.isArray(extractedData.items) || extractedData.items.length === 0) {
                    await flowDynamic("❌ El audio no está suficientemente claro. Para producción necesito:");
                    await flowDynamic("• ¿Qué item? (ej: Vaca 1, Lote 3)");
                    await flowDynamic("• ¿Cuánta cantidad? (ej: 10 litros, 50 huevos)");
                    return endFlow("Por favor, envía un audio más detallado.");
                }
                
                // Verificar que los items tengan los datos mínimos necesarios
                const invalidItems = extractedData.items.filter(item => 
                    !item.item_name || !item.unidad || item.item_name.trim().length < 3
                );
                
                if (invalidItems.length > 0) {
                    await flowDynamic("❌ El audio no está suficientemente claro. Para producción necesito:");
                    await flowDynamic("• ¿Qué item? (ej: Vaca 1, Lote 3)");
                    await flowDynamic("• ¿Cuánta cantidad? (ej: 10 litros, 50 huevos)");
                    return endFlow("Por favor, envía un audio más detallado.");
                }
                
                // Mostrar resumen de lo que se detectó
                const itemsCount = extractedData.items.length;
                const itemsWithQuantity = extractedData.items.filter(item => item.cantidad && item.cantidad > 0).length;
                const itemsWithoutQuantity = itemsCount - itemsWithQuantity;
                
                if (itemsCount > 1) {
                    await flowDynamic(`🎯 Detecté ${itemsCount} items de producción${itemsWithoutQuantity > 0 ? ` (${itemsWithoutQuantity} sin cantidad específica)` : ''}.`);
                } else if (itemsWithoutQuantity > 0) {
                    await flowDynamic(`🎯 Detecté producción de ${extractedData.items[0].item_name} (sin cantidad específica).`);
                }
            }

            // Guardamos los datos extraídos en el estado
            await state.update(extractedData);

            // Despachamos al flujo correspondiente
            switch (extractedData.tipo_registro) {
                case 'transaccion': {
                    console.log("🔀 Audio interpretado como TRANSACCIÓN. Redirigiendo a verificación.");
                    await flowDynamic(`Entendí que quieres registrar una transacción. Vamos a verificar los datos.`);
                    return gotoFlow(askForMissingDataFlow);
                }
                
                case 'produccion': {
                    console.log("🐄 Audio interpretado como PRODUCCIÓN. Redirigiendo a procesamiento.");
                    const itemsCount = extractedData.items?.length || 0;
                    if (itemsCount > 1) {
                        await flowDynamic(`🎯 Perfecto! Detecté ${itemsCount} items de producción. Procesando...`);
                    } else {
                        await flowDynamic(`🎯 Entendí que quieres registrar producción. Un momento por favor.`);
                    }
                    return gotoFlow(processProductionDataFlow);
                }

                default:
                    return endFlow("No estoy seguro de qué hacer con esa información. ¿Puedes ser más específico?");
            }

        } catch (error) {
            console.error("❌ Error en el flujo de audio:", error);
            await flowDynamic("Hubo un problema procesando tu nota de voz. Por favor, intenta de nuevo.");
            return endFlow();
        }
    });

export { audioFlow };
