import { addKeyword, EVENTS } from "@builderbot/bot";
import { askForMissingDataFlow } from "./askForMissingDataFlow";

const askTipoFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (_, { flowDynamic }) => {
        await flowDynamic([
            {
                body: "🧾 ¿Esta transacción es un ingreso o un gasto?",
                buttons: [{ body: "Ingreso" }, { body: "Gasto" }],
            },
        ]);
    })
    .addAnswer(
        ["ingreso", "gasto"],
        { capture: true }, // 👈 AÑADE EL OBJETO DE OPCIONES AQUÍ
        async (ctx, ctxFn) => {
            const tipoSeleccionado = ctx.body.toLowerCase();
            console.log(`💾 Guardando tipo en el estado: ${tipoSeleccionado}`);
            await ctxFn.state.update({ tipo: tipoSeleccionado });
            
            // Llama al director para que continúe con la siguiente verificación
            return ctxFn.gotoFlow(askForMissingDataFlow);
        }
    );

export { askTipoFlow };