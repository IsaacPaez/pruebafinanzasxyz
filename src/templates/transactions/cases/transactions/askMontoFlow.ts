import { addKeyword, EVENTS } from "@builderbot/bot";
import { askForMissingDataFlow } from "./askForMissingDataFlow";

const askMontoFlow = addKeyword(EVENTS.ACTION)
    .addAnswer("💵 ¿Cuál es el valor de la transacción?", 
    { capture: true }, 
    async (ctx, ctxFn) => {
        const monto = ctx.body.trim();
        if (isNaN(parseFloat(monto))) {
            console.log("❌ Respuesta inválida. El monto no es un número válido.");
            return ctxFn.fallBack("⚠️ Ingresa un número válido para el monto.");
        }
        
        // Guardar monto en el estado
        try {
            console.log("💾 Guardando monto en el estado...");
            await ctxFn.state.update({ monto });
            return ctxFn.gotoFlow(askForMissingDataFlow); // Regresa al flujo de preguntas
        } catch (error) {
            console.error("❌ Error al guardar el monto en el estado:", error);
            return ctxFn.flowDynamic("Hubo un problema guardando el monto. Inténtalo nuevamente.");
        }
    });

export { askMontoFlow };
