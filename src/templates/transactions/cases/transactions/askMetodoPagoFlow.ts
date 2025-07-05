import { addKeyword, EVENTS } from "@builderbot/bot";
import { askForMissingDataFlow } from "./askForMissingDataFlow";

const askMetodoPagoFlow = addKeyword(EVENTS.ACTION)
    .addAnswer(
        "Por favor, escribe el *método de pago*:",
        { capture: true },
        async (ctx, { state, gotoFlow, flowDynamic }) => {
            const nuevoMetodo = ctx.body.trim();
            await state.update({ metodoPago: nuevoMetodo });
            await flowDynamic(`✅ Método de pago actualizado a: *${nuevoMetodo}*`);
            return gotoFlow(askForMissingDataFlow);
        }
    );

export { askMetodoPagoFlow };