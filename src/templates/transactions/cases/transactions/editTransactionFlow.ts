import { addKeyword, EVENTS } from "@builderbot/bot";
import { askCategoriaFlow } from "./askCategoriaFlow";
import { askMontoFlow } from "./askMontoFlow";
import { askVerticalFlow } from "./askVerticalFlow";
import { askComercioFlow } from "./askComercioFlow";
import { askFechaFlow } from "./askFechaFlow";
import { askMetodoPagoFlow } from "./askMetodoPagoFlow";

const editTransactionFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { provider }) => {
        const interactiveList = {
            header: { type: "text", text: "📝 Editar Transacción" },
            body: { text: "¿Qué dato te gustaría editar?" },
            footer: { text: "Selecciona el campo que quieres cambiar." },
            action: {
                button: "Ver Campos",
                sections: [
                    {
                        title: "Campos de la Transacción",
                        rows: [
                            { id: "edit_monto", title: "Monto" },
                            { id: "edit_comercio", title: "Comercio" },
                            { id: "edit_fecha", title: "Fecha" },
                            { id: "edit_categoria", title: "Categoría" },
                            { id: "edit_subcategoria", title: "Subcategoría" },
                            { id: "edit_metodo_pago", title: "Método de Pago" },
                        ],
                    },
                ],
            },
        };
        await provider.sendList(ctx.from, interactiveList);
    })
    .addAnswer(
        "", // Corregido: Mensaje vacío para mostrar la lista correctamente
        { capture: true },
        async (ctx, { gotoFlow, fallBack }) => {
            const choice = ctx.body.trim();
            switch (choice) {
                case "edit_monto":
                    return gotoFlow(askMontoFlow);
                case "edit_categoria":
                    return gotoFlow(askCategoriaFlow);
                case "edit_subcategoria":
                    return gotoFlow(askVerticalFlow);
                case "edit_comercio":
                    return gotoFlow(askComercioFlow);
                case "edit_fecha":
                    return gotoFlow(askFechaFlow);
                case "edit_metodo_pago":
                    return gotoFlow(askMetodoPagoFlow);
                default:
                    return fallBack("Por favor, selecciona una opción válida de la lista.");
            }
        }
    );

export { editTransactionFlow };