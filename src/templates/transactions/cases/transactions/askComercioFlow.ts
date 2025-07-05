import { addKeyword, EVENTS } from "@builderbot/bot";
import { askForMissingDataFlow } from "./askForMissingDataFlow";

const askComercioFlow = addKeyword(EVENTS.ACTION)
    .addAnswer(
        "Por favor, escribe el nombre del *comercio*:",
        { capture: true },
        async (ctx, { state, gotoFlow, flowDynamic }) => {
            const nuevoComercio = ctx.body.trim();
            await state.update({ comercio: nuevoComercio });
            await flowDynamic(`✅ Comercio actualizado a: *${nuevoComercio}*`);
            return gotoFlow(askForMissingDataFlow);
        }
    );

export { askComercioFlow };
