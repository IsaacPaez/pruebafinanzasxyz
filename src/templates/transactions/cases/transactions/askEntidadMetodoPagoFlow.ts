import { addKeyword, EVENTS } from "@builderbot/bot";
import { askForMissingDataFlow } from "./askForMissingDataFlow";

const askEntidadMetodoPagoFlow = addKeyword(EVENTS.ACTION)
    .addAnswer(
        "🏦 Cuál es la entidad bancaria del método de pago. ¿Cuál es la entidad bancaria?", 
        { capture: true }, 
        async (ctx, ctxFn) => {
            const entidadMetodoPago = ctx.body.trim();
            if (!entidadMetodoPago) {
                console.log("❌ Respuesta vacía. Pidiendo que ingrese un valor.");
                return ctxFn.fallBack("⚠️ Por favor, ingresa el nombre de la entidad bancaria.");
            }
            try {
                await ctxFn.state.update({ entidadMetodoPago });
                return ctxFn.gotoFlow(askForMissingDataFlow); 
            } catch (error) {
                console.error("❌ Error al actualizar estado o redirigir:", error);
                return ctxFn.flowDynamic("Hubo un problema guardando la entidad bancaria. Inténtalo nuevamente.");
            }
        }
    );

export { askEntidadMetodoPagoFlow };
