import { addKeyword, EVENTS } from "@builderbot/bot";
import { verticalService } from "../../services/cloud/verticalService";
import { businessService } from "../../services/cloud/businessService";
import { productionService } from "../../services/cloud/productionService";

const manageInventoryFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { provider, state, flowDynamic, endFlow, fallBack }) => {
        try {
            console.log("🔍 Iniciando gestión de inventario para usuario:", ctx.from);
            
            // Obtener negocios del usuario
            const businesses = await businessService.getBusinessesByPhone(ctx.from);
            
            if (!businesses || businesses.length === 0) {
                return endFlow("No tienes negocios registrados. Primero debes crear un negocio.");
            }

            // Si hay múltiples negocios, mostrar lista
            if (businesses.length > 1) {
                await state.update({ temp_businesses: businesses });
                
                const businessRows = businesses.map(business => ({
                    id: business.id,
                    title: business.name.substring(0, 24),
                    description: (business.description || "Negocio").substring(0, 72)
                }));

                const interactiveList = {
                    header: { type: "text", text: "Seleccionar Negocio" },
                    body: { text: "🏢 ¿En qué negocio quieres gestionar el inventario?" },
                    footer: { text: "Selecciona una opción de la lista" },
                    action: {
                        button: "Ver Negocios",
                        sections: [{ title: "Opciones", rows: businessRows }],
                    },
                };

                await provider.sendList(ctx.from, interactiveList);
                return;
            } else {
                // Solo un negocio, continuar automáticamente
                const business = businesses[0];
                await state.update({ 
                    businessId: business.id,
                    businessName: business.name
                });
                
                await flowDynamic(`🏢 Gestión de inventario para: *${business.name}*`);
                
                // Obtener verticales del negocio
                const verticals = await verticalService.getVerticalsByBusinessId(business.id);
                
                if (!verticals || verticals.length === 0) {
                    return endFlow("Este negocio no tiene subcategorías configuradas.");
                }

                // Filtrar solo verticales que tienen inventario
                const inventoryVerticals = [];
                for (const vertical of verticals) {
                    const schema = await productionService.getVerticalSchema(vertical.id);
                    if (schema && schema.inventory && schema.inventory.items) {
                        inventoryVerticals.push({ ...vertical, schema });
                    }
                }

                if (inventoryVerticals.length === 0) {
                    return endFlow("Este negocio no tiene subcategorías con inventario configurado.");
                }

                if (inventoryVerticals.length === 1) {
                    // Solo una vertical con inventario, continuar automáticamente
                    const vertical = inventoryVerticals[0];
                    await state.update({ 
                        verticalId: vertical.id,
                        verticalName: vertical.name,
                        inventory_schema: vertical.schema
                    });
                    
                    await flowDynamic(`📦 Inventario de: *${vertical.name}*`);
                    
                    // Mostrar opciones de gestión
                    await flowDynamic([{
                        body: "¿Qué quieres hacer?",
                        buttons: [
                            { body: "Ver inventario" },
                            { body: "Agregar item" },
                            { body: "Eliminar item" }
                        ]
                    }]);
                    
                    return;
                } else {
                    // Múltiples verticales con inventario, mostrar lista
                    const verticalRows = inventoryVerticals.map(vertical => ({
                        id: vertical.id,
                        title: vertical.name.substring(0, 24),
                        description: (vertical.description || "Subcategoría").substring(0, 72)
                    }));

                    const interactiveList = {
                        header: { type: "text", text: "Seleccionar Subcategoría" },
                        body: { text: "📦 ¿Qué subcategoría quieres gestionar?" },
                        footer: { text: "Selecciona una opción de la lista" },
                        action: {
                            button: "Ver Subcategorías",
                            sections: [{ title: "Opciones", rows: verticalRows }],
                        },
                    };

                    await state.update({ temp_verticals: inventoryVerticals });
                    await provider.sendList(ctx.from, interactiveList);
                    return;
                }
            }

        } catch (error) {
            console.error("❌ Error en manageInventoryFlow:", error);
            return endFlow("Hubo un error. Por favor, intenta de nuevo.");
        }
    })
    .addAnswer(
        "",
        { capture: true },
        async (ctx, { state, flowDynamic, endFlow, fallBack }) => {
            try {
                const currentState = state.getMyState();
                const input = ctx.body.toLowerCase().trim();
                
                // Si estamos seleccionando negocio o vertical por ID
                if (currentState.temp_businesses) {
                    const selectedBusiness = currentState.temp_businesses.find(b => b.id === ctx.body.trim());
                    
                    if (!selectedBusiness) {
                        return fallBack("❌ Selección no válida. Por favor, elige una opción de la lista.");
                    }
                    
                    await state.update({ 
                        businessId: selectedBusiness.id,
                        businessName: selectedBusiness.name,
                        temp_businesses: undefined
                    });
                    
                    await flowDynamic(`🏢 Seleccionaste: *${selectedBusiness.name}*`);
                    
                    // Obtener verticales del negocio
                    const verticals = await verticalService.getVerticalsByBusinessId(selectedBusiness.id);
                    
                    if (!verticals || verticals.length === 0) {
                        return endFlow("Este negocio no tiene subcategorías configuradas.");
                    }

                    // Continuar con la lógica de verticales...
                    // (Similar a la lógica de arriba)
                    
                    return await flowDynamic("Procesando subcategorías...");
                }
                
                if (currentState.temp_verticals) {
                    const selectedVertical = currentState.temp_verticals.find(v => v.id === ctx.body.trim());
                    
                    if (!selectedVertical) {
                        return fallBack("❌ Selección no válida. Por favor, elige una opción de la lista.");
                    }
                    
                    await state.update({ 
                        verticalId: selectedVertical.id,
                        verticalName: selectedVertical.name,
                        inventory_schema: selectedVertical.schema,
                        temp_verticals: undefined
                    });
                    
                    await flowDynamic(`📦 Seleccionaste: *${selectedVertical.name}*`);
                    
                    // Mostrar opciones de gestión
                    await flowDynamic([{
                        body: "¿Qué quieres hacer?",
                        buttons: [
                            { body: "Ver inventario" },
                            { body: "Agregar item" },
                            { body: "Eliminar item" }
                        ]
                    }]);
                    
                    return;
                }
                
                // Si estamos en las opciones de gestión
                if (input.includes("ver") || input.includes("inventario")) {
                    const schema = currentState.inventory_schema;
                    const items = schema.inventory?.items || [];
                    
                    if (items.length === 0) {
                        return endFlow("📦 No hay items en el inventario de esta subcategoría.");
                    }
                    
                    const activeItems = items.filter(item => item.inProduction);
                    const inactiveItems = items.filter(item => !item.inProduction);
                    
                    let message = "📦 **Inventario Actual:**\n\n";
                    
                    if (activeItems.length > 0) {
                        message += "🟢 **Activos (en producción):**\n";
                        activeItems.forEach(item => {
                            message += `• ${item.name}${item.notes ? ` (${item.notes})` : ''}\n`;
                        });
                    }
                    
                    if (inactiveItems.length > 0) {
                        message += "\n🔴 **Inactivos:**\n";
                        inactiveItems.forEach(item => {
                            message += `• ${item.name}${item.notes ? ` (${item.notes})` : ''}\n`;
                        });
                    }
                    
                    await flowDynamic(message);
                    
                    // Mostrar opciones nuevamente
                    await flowDynamic([{
                        body: "¿Qué más quieres hacer?",
                        buttons: [
                            { body: "Agregar item" },
                            { body: "Eliminar item" },
                            { body: "Terminar" }
                        ]
                    }]);
                    
                    return;
                }
                
                if (input.includes("agregar") || input.includes("item")) {
                    await state.update({ action: "add" });
                    await flowDynamic("📝 ¿Cómo quieres llamar al nuevo item?\n\n*Ejemplo:* 'Vaca 4', 'Lote B', etc.");
                    return;
                }
                
                if (input.includes("eliminar")) {
                    const schema = currentState.inventory_schema;
                    const items = schema.inventory?.items || [];
                    
                    if (items.length === 0) {
                        return endFlow("📦 No hay items para eliminar.");
                    }
                    
                    const itemsList = items.map((item, index) => `${index + 1}. ${item.name}${item.inProduction ? ' (Activo)' : ' (Inactivo)'}`).join('\n');
                    
                    await state.update({ 
                        action: "remove",
                        available_items: items
                    });
                    
                    await flowDynamic(`📝 Selecciona el número del item a eliminar:\n\n${itemsList}\n\n*Escribe solo el número.*`);
                    return;
                }
                
                if (input.includes("terminar")) {
                    return endFlow("✅ Gestión de inventario completada.");
                }
                
                // Si estamos agregando un item
                if (currentState.action === "add") {
                    const itemName = ctx.body.trim();
                    
                    if (itemName.length < 2) {
                        return fallBack("❌ El nombre del item debe tener al menos 2 caracteres.");
                    }
                    
                    const schema = currentState.inventory_schema;
                    const items = schema.inventory?.items || [];
                    
                    // Verificar si ya existe
                    const existingItem = items.find(item => 
                        item.name.toLowerCase() === itemName.toLowerCase()
                    );
                    
                    if (existingItem) {
                        return fallBack(`❌ Ya existe un item llamado "${itemName}". Por favor, usa un nombre diferente.`);
                    }
                    
                    // Crear nuevo item
                    const newItem = {
                        id: `cow-${Date.now()}`,
                        name: itemName,
                        notes: "",
                        inProduction: true
                    };
                    
                    // Agregar al schema
                    schema.inventory.items.push(newItem);
                    schema.templateConfig.lastUpdated = new Date().toISOString();
                    
                    // Guardar en la base de datos
                    await productionService.updateVerticalSchema(currentState.verticalId, schema);
                    
                    await flowDynamic(`✅ Item "${itemName}" agregado correctamente al inventario.`);
                    
                    // Mostrar opciones nuevamente
                    await flowDynamic([{
                        body: "¿Qué más quieres hacer?",
                        buttons: [
                            { body: "Ver inventario" },
                            { body: "Agregar item" },
                            { body: "Eliminar item" },
                            { body: "Terminar" }
                        ]
                    }]);
                    
                    await state.update({ action: undefined });
                    return;
                }
                
                // Si estamos eliminando un item
                if (currentState.action === "remove") {
                    const itemIndex = parseInt(ctx.body.trim()) - 1;
                    const availableItems = currentState.available_items || [];
                    
                    if (isNaN(itemIndex) || itemIndex < 0 || itemIndex >= availableItems.length) {
                        return fallBack(`❌ Número no válido. Por favor, escribe un número del 1 al ${availableItems.length}.`);
                    }
                    
                    const itemToRemove = availableItems[itemIndex];
                    const schema = currentState.inventory_schema;
                    
                    // Eliminar del schema
                    schema.inventory.items = schema.inventory.items.filter(item => item.id !== itemToRemove.id);
                    schema.templateConfig.lastUpdated = new Date().toISOString();
                    
                    // Guardar en la base de datos
                    await productionService.updateVerticalSchema(currentState.verticalId, schema);
                    
                    await flowDynamic(`✅ Item "${itemToRemove.name}" eliminado correctamente del inventario.`);
                    
                    // Mostrar opciones nuevamente
                    await flowDynamic([{
                        body: "¿Qué más quieres hacer?",
                        buttons: [
                            { body: "Ver inventario" },
                            { body: "Agregar item" },
                            { body: "Eliminar item" },
                            { body: "Terminar" }
                        ]
                    }]);
                    
                    await state.update({ 
                        action: undefined,
                        available_items: undefined
                    });
                    return;
                }
                
                return fallBack("❌ No entendí tu respuesta. Por favor, selecciona una de las opciones disponibles.");
                
            } catch (error) {
                console.error("❌ Error procesando respuesta:", error);
                return endFlow("Hubo un error. Por favor, intenta de nuevo.");
            }
        }
    );

export { manageInventoryFlow };
