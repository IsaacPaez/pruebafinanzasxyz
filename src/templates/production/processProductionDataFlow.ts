import { addKeyword, EVENTS } from "@builderbot/bot";
import { productionService } from "../../services/cloud/productionService";
import { askCategoriaFlow } from "../transactions/cases/transactions/askCategoriaFlow";
import { confirmSaleAndSaveFlow } from "./confirmSaleAndSaveFlow";
import { askProductionItemFlow } from "./askProductionItemFlow";
import { askProductionQuantityFlow } from "./askProductionQuantityFlow";

const processProductionDataFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { state, gotoFlow, endFlow, flowDynamic }) => {
        const currentState = state.getMyState();
        const { businessId, verticalId, items, produccion_item_name, produccion_cantidad } = currentState;

        // 1. Verificar si tenemos los datos básicos (negocio y vertical)
        if (!businessId) {
            console.log("⏳ Faltan datos de negocio/vertical, redirigiendo a askCategoriaFlow.");
            return gotoFlow(askCategoriaFlow);
        }

        if (!verticalId) {
            console.log("⏳ Faltan datos de negocio/vertical, redirigiendo a askCategoriaFlow.");
            return gotoFlow(askCategoriaFlow);
        }

        // 2. Determinar formato de datos (nuevo formato con array o formato antiguo)
        let productionItems = [];
        
        if (items && Array.isArray(items)) {
            // Nuevo formato con múltiples items
            productionItems = items;
            console.log(`🔄 Procesando ${productionItems.length} items de producción`);
        } else if (produccion_item_name) {
            // Formato antiguo (retrocompatibilidad)
            productionItems = [{
                item_name: produccion_item_name,
                cantidad: produccion_cantidad,
                unidad: currentState.produccion_unidad
            }];
            console.log("🔄 Procesando 1 item de producción (formato antiguo)");
        } else {
            return endFlow("No pude identificar los items de producción en tu audio. Por favor, intenta de nuevo.");
        }

        // 3. Validar items contra la base de datos
        const schema = await productionService.getVerticalSchema(verticalId);
        if (!schema || !schema.inventory || !schema.inventory.items) {
            return endFlow("Hubo un problema al cargar los datos de producción de esta subcategoría.");
        }

        const availableItems = schema.inventory.items.filter(item => item.inProduction);
        const validatedItems = [];
        const invalidItems = [];
        const itemsNeedingQuantity = [];

        for (const productionItem of productionItems) {
            // Buscar el item en la base de datos
            const selectedItem = availableItems.find(i => 
                i.name.toLowerCase().includes(productionItem.item_name.toLowerCase()) ||
                productionItem.item_name.toLowerCase().includes(i.name.toLowerCase())
            );

            if (selectedItem) {
                // Item encontrado, verificar cantidad
                if (!productionItem.cantidad || productionItem.cantidad === 0) {
                    itemsNeedingQuantity.push({
                        ...productionItem,
                        dbItem: selectedItem
                    });
                } else {
                    validatedItems.push({
                        ...productionItem,
                        dbItem: selectedItem
                    });
                }
            } else {
                invalidItems.push(productionItem);
            }
        }

        // 4. Manejar casos especiales
        if (invalidItems.length > 0) {
            console.log(`❌ ${invalidItems.length} items no encontrados en la base de datos:`, invalidItems);
            await flowDynamic(`❌ No encontré estos items en tu inventario: ${invalidItems.map(i => i.item_name).join(", ")}. Por favor, selecciónalos de la lista.`);
            return gotoFlow(askProductionItemFlow);
        }

        if (itemsNeedingQuantity.length > 0) {
            console.log(`⚠️ ${itemsNeedingQuantity.length} items necesitan cantidad:`, itemsNeedingQuantity);
            // Guardar items que necesitan cantidad en el estado
            await state.update({
                items_needing_quantity: itemsNeedingQuantity,
                validated_items: validatedItems,
                production_schema: schema,
                current_quantity_index: 0
            });
            
            if (validatedItems.length > 0) {
                await flowDynamic(`📊 Validé ${validatedItems.length} items con cantidad. Ahora necesito que especifiques la cantidad para los restantes ${itemsNeedingQuantity.length} items.`);
            } else {
                await flowDynamic(`📊 Necesito que especifiques la cantidad para ${itemsNeedingQuantity.length} items.`);
            }
            
            return gotoFlow(askProductionQuantityFlow);
        }

        // 5. Todos los items están validados con cantidad
        console.log(`✅ Todos los ${validatedItems.length} items validados correctamente`);
        await state.update({
            validated_items: validatedItems,
            production_schema: schema
        });

        // Mostrar resumen
        if (validatedItems.length > 1) {
            await flowDynamic(`✅ Procesé ${validatedItems.length} items de producción:\n${validatedItems.map(item => `• ${item.dbItem.name}: ${item.cantidad} ${item.unidad}`).join("\n")}`);
        } else {
            await flowDynamic(`✅ Datos de producción validados para: ${validatedItems[0].dbItem.name}`);
        }

        return gotoFlow(confirmSaleAndSaveFlow);
    });

export { processProductionDataFlow };