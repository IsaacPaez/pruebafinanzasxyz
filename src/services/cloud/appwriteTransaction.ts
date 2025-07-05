import { Client, Databases, ID } from 'node-appwrite';
import dotenv from 'dotenv';
import { Query } from 'node-appwrite';

dotenv.config();

class AppwriteTransaction {

    private client: Client;
    private database: Databases;
    private databaseId: string = process.env.APPWRITE_DATABASE_ID as string;
    private transactionsCollectionId: string = process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID as string;

    constructor() {
        this.client = new Client()
            .setEndpoint(process.env.APPWRITE_ENDPOINT as string)
            .setProject(process.env.APPWRITE_PROJECT_ID as string)
            .setKey(process.env.APPWRITE_API_KEY as string);

        this.database = new Databases(this.client);
    }

    // 🔹 **Guardar una transacción en Appwrite**
    async saveTransaction(
        monto: string,
        comercio: string,
        metodoPago: string,
        entidadMetodoPago: string,
        categoria: string,
        subcategoria: string,
        tipo: string,
        userId: string | undefined,
        userPhone: string | undefined,
        canal: string,
        ctxFn
    ) {
        try {
            // Si userId es undefined, intenta obtenerlo desde el estado global
            if (!userId) {
                const state = ctxFn.state.getMyState();
                userId = state.userId || ctxFn.from; // Intentar recuperar el número o userId
                console.warn("⚠️ userId estaba undefined, recuperado de estado:", userId);
            }

            // Si userPhone es undefined, intenta obtenerlo también desde el estado o ctxFn
            if (!userPhone) {
                const state = ctxFn.state.getMyState();
                userPhone = state.userPhoneNumber || ctxFn.from;
                console.warn("⚠️ userPhone estaba undefined, recuperado de estado:", userPhone);
            }

            if (!userId) {
                throw new Error("❌ No se pudo determinar el userId del usuario.");
            }

            console.log("💾 Guardando transacción en Appwrite:", {
                monto,
                comercio,
                metodoPago,
                entidadMetodoPago,
                categoria,
                subcategoria,
                userId,
                userPhone,
                canal,
                tipo
            });

            const response = await this.database.createDocument(
                this.databaseId,
                this.transactionsCollectionId,
                ID.unique(),
                {
                    monto: monto,
                    comercio: comercio,
                    metodo_pago: metodoPago,
                    entidad_metodo_pago: entidadMetodoPago,
                    categoria: categoria,
                    subcategoria: subcategoria,
                    tipo: tipo,
                    fecha: new Date().toISOString(),
                    userId: userId,
                    userPhone: userPhone,
                    canal: canal
                }
            );

            console.log("✅ Transacción guardada correctamente en Appwrite:", response);
            return response;
        } catch (error) {
            console.error("❌ Error guardando transacción en Appwrite:", error);
            throw new Error("Hubo un problema al guardar la transacción en Appwrite.");
        }
    }

    async getUserIdByPhone(phoneNumber: string): Promise<string | null> {
        try {
          // Normaliza el número para asegurarte de que incluya el signo '+'
          const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
          console.log(`🔍 Buscando userId por teléfono: ${normalizedPhone}`);
          
          const response = await this.database.listDocuments(
            "671e7ac600262a70caaa",
            "676b14b400270cc73f06", // Colección de perfiles de usuario.
            [ Query.equal("phoneNumber", normalizedPhone) ]
          );
          
          if (response.documents.length > 0) {
            const doc = response.documents[0];
            // Accedemos directamente al campo "userId"
            const userId = doc.userId; 
            
            if (!userId) {
              console.warn("⚠️ El documento encontrado no contiene el campo 'userId':", doc);
              return null;
            }
            
            console.log("✅ UserId encontrado para el teléfono:", userId);
            return userId;
          } else {
            console.warn("⚠️ No se encontró un usuario con el teléfono:", normalizedPhone);
            return null;
          }
        } catch (error) {
          console.error("❌ Error obteniendo userId por teléfono:", error);
          return null;
        }
      }
}

export default new AppwriteTransaction();
