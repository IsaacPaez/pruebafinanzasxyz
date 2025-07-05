import { addKeyword, EVENTS } from "@builderbot/bot";
import { askCategoriaFlow } from "./askCategoriaFlow";
import { askMontoFlow } from "./askMontoFlow";
import { askVerticalFlow } from "./askVerticalFlow";
import { processProductionDataFlow } from "../../../production/processProductionDataFlow";
import { transactionService, TransactionData } from "../../../../services/cloud/transactionService";
import { editTransactionFlow } from "./editTransactionFlow";

const askForMissingDataFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { state, gotoFlow, flowDynamic }) => {
        const currentState = state.getMyState();
        console.log("🔄 Verificando datos faltantes. Estado actual:", currentState);

        // 1) Si es producción, verificamos negocio y vertical antes de procesar
        if (currentState.tipo_registro === "produccion") {
            console.log("🐄 Producción detectada. Verificando negocio y subcategoría...");
            if (!currentState.businessId) {
                console.log("⏳ Falta negocio para producción. Redirigiendo a askCategoriaFlow...");
                return gotoFlow(askCategoriaFlow);
            }
            if (!currentState.verticalId) {
                console.log("⏳ Falta subcategoría para producción. Redirigiendo a askVerticalFlow...");
                return gotoFlow(askVerticalFlow);
            }
            console.log("✅ Todos los datos para producción presentes. Iniciando procesamiento de producción.");
            return gotoFlow(processProductionDataFlow);
        }

        // 2) Si no, comprobamos campos de transacción
        if (!currentState.monto) {
            console.log("⏳ Falta el monto. Redirigiendo a askMontoFlow...");
            return gotoFlow(askMontoFlow);
        }
        if (!currentState.categoria || !currentState.businessId) {
            console.log("⏳ Falta la categoría. Redirigiendo a askCategoriaFlow...");
            return gotoFlow(askCategoriaFlow);
        }
        if (!currentState.subcategoria || !currentState.verticalId) {
            console.log("⏳ Falta la vertical/subcategoría. Redirigiendo a askVerticalFlow...");
            return gotoFlow(askVerticalFlow);
        }

        // Si todos los datos están presentes, pedir confirmación
        console.log("✅ Todos los datos recolectados. Pidiendo confirmación:", currentState);
        const summary = [
            `📄 *Resumen de la Transacción* 📄`,
            `-----------------------------------`,
            `*Monto:* ${currentState.monto}`,
            `*Comercio:* ${currentState.comercio || 'N/A'}`,
            `*Fecha:* ${currentState.fecha}`,
            `*Negocio:* ${currentState.categoria}`,
            `*Vertical:* ${currentState.subcategoria}`,
            `*Método de Pago:* ${currentState.metodoPago || 'N/A'}`,
            `-----------------------------------`,
            `¿Son correctos estos datos?`
        ].join('\n');

        await flowDynamic([{ 
            body: summary, 
            buttons: [{ body: 'Confirmar' }, { body: 'Editar' }] 
        }]);
    })
    .addAnswer(
        "", // Corregido: Mensaje vacío para no enviar texto extra
        { capture: true },
        async (ctx, { state, endFlow, fallBack, gotoFlow }) => {
            const choice = ctx.body.toLowerCase();

            if (choice === 'confirmar') {
                try {
                    const currentState = state.getMyState();
                    console.log("✅ Confirmado. Procediendo a guardar:", currentState);
                    await transactionService.saveTransaction(currentState as TransactionData);
                    await state.clear(); // Limpiar el estado para la próxima transacción
                    return endFlow("💾 ¡Transacción registrada con éxito! Gracias.");
                } catch (error) {
                    console.error("❌ Error al guardar la transacción final:", error);
                    return endFlow("Ocurrió un error al guardar tu transacción. Por favor, intenta de nuevo.");
                }
            }

            if (choice === 'editar') {
                return gotoFlow(editTransactionFlow);
            }
            
            return fallBack('Por favor, selecciona una de las opciones: "Confirmar" o "Editar".');
        }
    );

export { askForMissingDataFlow };