import { addKeyword, EVENTS } from "@builderbot/bot";
import { askForMissingDataFlow } from "./askForMissingDataFlow";

const askFechaFlow = addKeyword(EVENTS.ACTION)
    .addAnswer(
        "Por favor, escribe la nueva *fecha* (formato DD/MM/AAAA):",
        { capture: true },
        async (ctx, { state, gotoFlow, flowDynamic }) => {
            const nuevaFecha = ctx.body.trim();
            await state.update({ fecha: nuevaFecha });
            await flowDynamic(`✅ Fecha actualizada a: *${nuevaFecha}*`);
            return gotoFlow(askForMissingDataFlow);
        }
    );

export { askFechaFlow };