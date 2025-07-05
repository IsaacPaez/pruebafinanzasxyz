import { addKeyword, EVENTS } from "@builderbot/bot";
import { askCategoriaFlow } from "../transactions/cases/transactions/askCategoriaFlow";

// Este flujo simplemente redirige al flujo de selección de categoría.
// askCategoriaFlow y askVerticalFlow se encargarán de guiar al usuario.
// Una vez que se seleccione una vertical, necesitaremos un punto de enganche
// para desviar hacia el flujo de producción si la vertical es de tipo 'dairy' o 'eggs'.

// NOTA: Esto requerirá una modificación en `askVerticalFlow` para que,
// después de seleccionar una vertical, verifique si es de producción y,
// en ese caso, redirija a `askProductionItemFlow` en lugar de `askForMissingDataFlow`.

// Por ahora, este es el punto de entrada.
const startProductionFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (_, { flowDynamic, gotoFlow }) => {
        await flowDynamic("¡Excelente! Vamos a registrar una producción.");
        return gotoFlow(askCategoriaFlow);
    });

export { startProductionFlow };