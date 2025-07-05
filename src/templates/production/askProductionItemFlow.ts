import { addKeyword, EVENTS } from "@builderbot/bot";
import { productionService } from "../../services/cloud/productionService";
import { askProductionQuantityFlow } from "./askProductionQuantityFlow";

const askProductionItemFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { state, provider, fallBack, flowDynamic }) => {
        const currentState = state.getMyState();
        const schema = await productionService.getVerticalSchema(currentState.verticalId);

        if (!schema || !schema.inventory || !schema.inventory.items) {
            return fallBack("No encontré items de producción para esta subcategoría.");
        }

        await state.update({ production_schema: schema });
        const items = schema.inventory.items.filter(item => item.inProduction);

        if (items.length === 0) {
            return fallBack("No hay items activos para registrar producción en este momento.");
        }

        if (items.length <= 10) {
            const rows = items.map(item => ({
                id: item.id,
                title: item.name,
                description: item.notes || `Seleccionar ${item.name}`
            }));

            const interactiveList = {
                header: { type: "text", text: "Seleccionar Item" },
                body: { text: `¿Para cuál ${schema.type === 'dairy' ? 'vaca' : 'grupo'} quieres registrar la producción?` },
                action: {
                    button: "Ver Items",
                    sections: [{ title: "Items en Producción", rows }],
                },
            };
            await provider.sendList(ctx.from, interactiveList);
        } else {
            // Si hay más de 10 items, listarlos en un solo mensaje y pedir que el usuario escriba el nombre
            const nombres = items.map(item => item.name).join(', ');
            await flowDynamic(`Hay ${items.length} items de producción disponibles: ${nombres}.
Por favor escribe el nombre exacto del item:`);
        }
    })
    .addAnswer(
        "", // Mensaje vacío para capturar la respuesta de la lista o el texto
        { capture: true },
        async (ctx, { state, gotoFlow, fallBack }) => {
            const currentState = state.getMyState();
            const items = currentState.production_schema.inventory.items;
            const selection = ctx.body.trim();

            const selectedItem = items.find(i => i.id === selection || i.name.toLowerCase() === selection.toLowerCase());

            if (!selectedItem) {
                return fallBack("No encontré ese item. Por favor, selecciónalo de la lista o escribe el nombre correctamente.");
            }

            await state.update({ production_item: selectedItem });
            return gotoFlow(askProductionQuantityFlow);
        }
    );

export { askProductionItemFlow };