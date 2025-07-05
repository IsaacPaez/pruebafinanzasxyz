import { addKeyword, EVENTS } from "@builderbot/bot";
import { businessService } from "../../../../services/cloud/businessService";
import { askVerticalFlow } from "./askVerticalFlow";

// Simplified: Always list businesses and proceed to vertical selection
const askCategoriaFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, { provider, state, flowDynamic, fallBack }) => {
    try {
      const businesses = await businessService.getBusinessesByPhone(ctx.from);
      if (!businesses || businesses.length === 0) {
        await flowDynamic("No tienes negocios registrados. Por favor crea uno antes de registrar una transacción.");
        return;
      }
      await state.update({ temp_businesses: businesses });
      const rows = businesses.map(b => ({ id: b.id, title: b.name, description: b.description || '' }));
      await provider.sendList(ctx.from, {
        header: { type: 'text', text: 'Tus Negocios' },
        body: { text: '¿A qué negocio pertenece esta transacción?' },
        footer: { text: 'Selecciona un negocio' },
        action: { button: 'Ver Negocios', sections: [{ title: 'Opciones', rows }] }
      });
    } catch (err) {
      console.error('❌ Error al consultar negocios:', err);
      return fallBack('Hubo un problema obteniendo tus negocios. Intenta más tarde.');
    }
  })
  .addAnswer('', { capture: true }, async (ctx, { state, flowDynamic, gotoFlow, fallBack }) => {
    const id = ctx.body.trim();
    const list = state.getMyState().temp_businesses || [];
    const selected = list.find(b => b.id === id);
    if (!selected) return fallBack('Selección inválida, elige una opción de la lista.');
    await state.update({ categoria: selected.name, businessId: selected.id, temp_businesses: undefined });
    await flowDynamic(`✅ Negocio seleccionado: *${selected.name}*`);
    return gotoFlow(askVerticalFlow);
  });

export { askCategoriaFlow };
