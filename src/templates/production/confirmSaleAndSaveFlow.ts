import { addKeyword, EVENTS } from "@builderbot/bot";
import { productionService } from "../../services/cloud/productionService";
import { transactionService, TransactionData } from "../../services/cloud/transactionService";

const confirmSaleAndSaveFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { flowDynamic, state }) => {
        const currentState = state.getMyState();
        const { validated_items } = currentState;

        // Mostrar resumen de items a registrar
        if (validated_items && validated_items.length > 1) {
            const summary = validated_items.map(item => `• ${item.dbItem.name}: ${item.cantidad} ${item.unidad}`).join("\n");
            await flowDynamic(`📋 Resumen de producción:\n${summary}\n\n¿Esta producción ya se vendió?`);
        } else {
            await flowDynamic("¿Esta producción ya se vendió?");
        }

        await flowDynamic([{
            body: "Selecciona una opción:",
            buttons: [{ body: "Sí, ya la vendí" }, { body: "No, aún no" }]
        }]);
    })
    .addAnswer(
        "",
        { capture: true },
        async (ctx, { state, endFlow, fallBack }) => {
            const choice = ctx.body.toLowerCase();
            const currentState = state.getMyState();
            
            const { 
                production_schema, 
                validated_items,
                verticalId, 
                businessId, 
                userId, 
                categoria, 
                subcategoria, 
                userPhoneNumber, 
                canal 
            } = currentState;

            // Usar validated_items en lugar de un solo item
            const itemsToProcess = validated_items || [];
            
            if (itemsToProcess.length === 0) {
                return endFlow("❌ No hay items de producción para procesar.");
            }

            // Crear registros de producción para cada item
            const productionRecords = itemsToProcess.map(item => ({
                date: new Date().toISOString().split('T')[0],
                production: [{
                    id: item.dbItem.id,
                    name: item.dbItem.name,
                    [production_schema.unit === 'litro' ? 'liters' : 'quantity']: item.cantidad
                }],
                movement_id: null
            }));

            if (choice.includes('sí') || choice.includes('si')) {
                // 1. Crear transacciones de ingreso para cada item
                const transactions = [];
                
                for (const item of itemsToProcess) {
                    const incomeAmount = item.cantidad * (production_schema.price || 0);
                    
                    const transactionData: TransactionData = {
                        userId,
                        businessId,
                        verticalId,
                        categoria,
                        subcategoria,
                        userPhoneNumber,
                        canal,
                        monto: incomeAmount.toString(),
                        tipo: 'ingreso',
                        comercio: 'Venta de Producción',
                        description: `Venta de ${item.cantidad} ${item.unidad} de ${item.dbItem.name}`,
                        fecha: new Date().toISOString().split('T')[0],
                        metodoPago: 'Ingreso por Producción',
                        entidadMetodoPago: 'N/A',
                    };

                    const savedMovement = await transactionService.saveTransaction(transactionData);
                    transactions.push(savedMovement[0]);
                }

                // 2. Actualizar registros de producción con IDs de movimiento
                productionRecords.forEach((record, index) => {
                    record.movement_id = transactions[index].id;
                });

                // 3. Actualizar el schema
                if (!production_schema.cowProductionHistory) {
                    production_schema.cowProductionHistory = [];
                }
                production_schema.cowProductionHistory.push(...productionRecords);
                await productionService.updateVerticalSchema(verticalId, production_schema);

                const totalAmount = itemsToProcess.reduce((sum, item) => sum + (item.cantidad * (production_schema.price || 0)), 0);
                return endFlow(`✅ ¡Excelente! He registrado ${itemsToProcess.length} producción(es) y las ventas como ingresos por un total de $${totalAmount.toLocaleString()}.`);

            } else if (choice.includes('no')) {
                // Solo actualizar el schema
                if (!production_schema.cowProductionHistory) {
                    production_schema.cowProductionHistory = [];
                }
                production_schema.cowProductionHistory.push(...productionRecords);
                await productionService.updateVerticalSchema(verticalId, production_schema);
                
                return endFlow(`✅ Entendido. He registrado ${itemsToProcess.length} producción(es) en tu inventario. ¡No olvides registrar la venta cuando la realices!`);
            }

            return fallBack("Por favor, responde 'Sí' o 'No'.");
        }
    );

export { confirmSaleAndSaveFlow };