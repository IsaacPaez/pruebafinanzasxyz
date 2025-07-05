import  { createFlow } from '@builderbot/bot'
import { mainFlow } from './mainflow';
import { faqFlow } from './faqFlow';
import { registerFlow } from './registerFlow';
import { menuFlow } from './menuFlow';
import { sendImageFlow } from './list_templates/sendImageFlow';
import { sendPdfFlow } from './list_templates/sendPdfFlow';
import { sendVoiceFlow } from './list_templates/sendVoiceFlow';
import { DetectIntention } from './intention.flow';
import { transactionFlow } from './transactions/transaction_t_flow';
import { photoFlow } from './transactions/photoFlow';
import { askMontoFlow } from './transactions/cases/transactions/askMontoFlow';
import { askComercioFlow } from './transactions/cases/transactions/askComercioFlow';
import { askMetodoPagoFlow } from './transactions/cases/transactions/askMetodoPagoFlow';
import { askEntidadMetodoPagoFlow } from './transactions/cases/transactions/askEntidadMetodoPagoFlow';
import { askCategoriaFlow } from './transactions/cases/transactions/askCategoriaFlow';
import { askForMissingDataFlow } from './transactions/cases/transactions/askForMissingDataFlow';
import { askTipoFlow } from './transactions/cases/transactions/askTipoFlow';
import { audioFlow } from './transactions/audioFlow';
import { textFlow } from './transactions/textFlow';
import { askVerticalFlow } from './transactions/cases/transactions/askVerticalFlow';
import { askFechaFlow } from './transactions/cases/transactions/askFechaFlow';
import { editTransactionFlow } from './transactions/cases/transactions/editTransactionFlow';
import { startProductionFlow } from './production/startProductionFlow';
import { askProductionItemFlow } from './production/askProductionItemFlow';
import { askProductionQuantityFlow } from './production/askProductionQuantityFlow';
import { confirmSaleAndSaveFlow } from './production/confirmSaleAndSaveFlow';
import { processProductionDataFlow } from './production/processProductionDataFlow';
export default createFlow([
    mainFlow,
    faqFlow,
    registerFlow,
    menuFlow,
    sendImageFlow,
    sendPdfFlow,
    sendVoiceFlow,
    DetectIntention,
    transactionFlow,
    photoFlow,
    askMontoFlow,
    askComercioFlow,
    askMetodoPagoFlow,
    askEntidadMetodoPagoFlow,
    askCategoriaFlow,
    askForMissingDataFlow,
    askTipoFlow,
    audioFlow,
    textFlow,
    askVerticalFlow,
    askFechaFlow,
    editTransactionFlow,
    startProductionFlow,
    askProductionItemFlow,
    askProductionQuantityFlow,
    confirmSaleAndSaveFlow,
    processProductionDataFlow,
]);