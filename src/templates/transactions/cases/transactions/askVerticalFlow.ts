import { addKeyword, EVENTS } from "@builderbot/bot";
import { verticalService } from "../../../../services/cloud/verticalService";
import { askForMissingDataFlow } from "./askForMissingDataFlow";

const askVerticalFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { provider, state, fallBack }) => {
        try {
            const currentState = state.getMyState();
            const businessId = currentState.businessId;
            if (!businessId) {
                return fallBack("Hubo un problema al obtener la información del negocio. Por favor, intenta de nuevo.");
            }

            const verticals = await verticalService.getVerticalsByBusinessId(businessId);
            await state.update({ temp_verticals: verticals || [] });

            const verticalRows = (verticals || []).map(vertical => ({
                id: vertical.id,
                title: vertical.name.substring(0, 24),
                description: (vertical.description || "Subcategoría").substring(0, 72)
            }));

            const interactiveList = {
                header: { type: "text", text: "Subcategorías del Negocio" },
                body: { text: "📊 ¿A qué subcategoría pertenece esta transacción?" },
                footer: { text: "Selecciona una opción de la lista" },
                action: {
                    button: "Ver Opciones",
                    sections: [{ title: "Opciones", rows: verticalRows }],
                },
            };
            await provider.sendList(ctx.from, interactiveList);

        } catch (error) {
            console.error("❌ Error consultando o enviando verticales:", error);
            return fallBack("Hubo un problema consultando las subcategorías. Inténtalo más tarde.");
        }
    })
    .addAnswer(
        "", // Mensaje eliminado
        { capture: true },
        async (ctx, { state, fallBack, gotoFlow, flowDynamic }) => {
            try {
                const selectedId = ctx.body.trim();
                
                const currentState = state.getMyState();
                const verticals = currentState.temp_verticals || [];
                const selectedVertical = verticals.find(v => v.id === selectedId);

                if (!selectedVertical) {
                    return fallBack("❌ Selección no válida. Por favor, elige una opción de la lista.");
                }
                
                const selectedName = selectedVertical.name;
                const selectedVerticalId = selectedVertical.id;

                await state.update({
                    vertical: selectedName,
                    verticalId: selectedVerticalId,
                    subcategoria: selectedName,
                    temp_verticals: undefined
                });

                await flowDynamic(`✅ Subcategoría seleccionada: *${selectedName}*`);

                // Continuar con el flujo de verificación de transacción
                return gotoFlow(askForMissingDataFlow);
                
            } catch (error) {
                console.error("❌ Error en la selección de vertical:", error);
                return fallBack("Hubo un problema con tu selección.");
            }
        }
    );

export { askVerticalFlow };