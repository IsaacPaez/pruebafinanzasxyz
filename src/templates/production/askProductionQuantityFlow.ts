import { addKeyword, EVENTS } from "@builderbot/bot";
import { confirmSaleAndSaveFlow } from "./confirmSaleAndSaveFlow";

const askProductionQuantityFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (_, { state, flowDynamic }) => {
        const currentState = state.getMyState();
        const { items_needing_quantity, current_quantity_index, production_schema } = currentState;
        
        if (!items_needing_quantity || items_needing_quantity.length === 0) {
            return;
        }

        const currentItem = items_needing_quantity[current_quantity_index];
        const unit = currentItem.unidad || production_schema.unit || 'unidades';
        const itemName = currentItem.dbItem.name;
        
        await flowDynamic(`¿Cuántos *${unit}* produjo *${itemName}*?`);
    })
    .addAnswer(
        "Escribe solo el número.",
        { capture: true },
        async (ctx, { state, gotoFlow, fallBack, flowDynamic }) => {
            const quantity = parseFloat(ctx.body.replace(',', '.'));
            if (isNaN(quantity) || quantity < 0) {
                return fallBack("Por favor, ingresa un número válido (0 o mayor).");
            }
            
            const currentState = state.getMyState();
            const { items_needing_quantity, current_quantity_index, validated_items } = currentState;
            
            // Actualizar la cantidad del item actual
            const currentItem = items_needing_quantity[current_quantity_index];
            currentItem.cantidad = quantity;
            
            // Mover el item de "necesitando cantidad" a "validados"
            const updatedValidatedItems = [...(validated_items || []), currentItem];
            
            // Avanzar al siguiente item
            const nextIndex = current_quantity_index + 1;
            
            if (nextIndex < items_needing_quantity.length) {
                // Hay más items que necesitan cantidad
                await state.update({
                    validated_items: updatedValidatedItems,
                    current_quantity_index: nextIndex
                });
                
                // Continuar con el siguiente item
                const nextItem = items_needing_quantity[nextIndex];
                const unit = nextItem.unidad || currentState.production_schema.unit || 'unidades';
                const itemName = nextItem.dbItem.name;
                
                await flowDynamic(`Perfecto. Ahora, ¿cuántos *${unit}* produjo *${itemName}*?`);
            } else {
                // Todos los items han sido procesados
                await state.update({
                    validated_items: updatedValidatedItems,
                    items_needing_quantity: undefined,
                    current_quantity_index: undefined
                });
                
                await flowDynamic(`✅ Perfecto! He registrado las cantidades para todos los items.`);
                return gotoFlow(confirmSaleAndSaveFlow);
            }
        }
    );

export { askProductionQuantityFlow };