import { Client, Databases, ID } from "node-appwrite";
import dotenv from "dotenv";

// Cargar variables de entorno desde .env
dotenv.config();

class AppwriteManager {
    private client: Client;
    private db: Databases;
    private databaseId: string;
    private usersCollectionId: string;
    private conversationsCollectionId: string;

    constructor() {
        this.client = new Client()
            .setEndpoint(process.env.APPWRITE_ENDPOINT as string)
            .setProject(process.env.APPWRITE_PROJECT_ID as string)
            .setKey(process.env.APPWRITE_API_KEY as string);

        this.db = new Databases(this.client);
        this.databaseId = process.env.APPWRITE_DATABASE_ID as string;
        this.usersCollectionId = process.env.APPWRITE_USERS_COLLECTION_ID as string;
        this.conversationsCollectionId = process.env.APPWRITE_CONVERSATIONS_COLLECTION_ID as string;
    }

    // 🔍 Verificar si un usuario existe en la base de datos
    async userExists(number: string): Promise<boolean> {
        try {
            const result = await this.db.listDocuments(this.databaseId, this.usersCollectionId, [
                `equal("phone", "${number}")`
            ]);

            return result.total > 0;
        } catch (error) {
            console.error("Error verificando usuario:", error);
            return false;
        }
    }

    // 🆕 Crear un usuario
    async createUser(number: string, name: string, nickname: string, country: string, city: string, address: string, occupation: string, gender: string, civilStatus: string, email: string): Promise<void> {
        try {
            await this.db.createDocument(this.databaseId, this.usersCollectionId, ID.unique(), {
                phone: number,
                name,
                nickname,
                country,
                city,
                address,
                occupation,
                gender,
                civil_status: civilStatus,
                email
            });

            console.log("Usuario creado exitosamente en Appwrite.");
        } catch (error) {
            console.error("Error al crear usuario:", error);
        }
    }

    // 📝 Agregar conversación a la base de datos
    async addConverToUser(number: string, conversation: { role: string; content: string }[]): Promise<void> {
        try {
            const question = conversation.find(c => c.role === "user")?.content;
            const answer = conversation.find(c => c.role === "assistant")?.content;
            const date = new Date().toISOString();

            if (!question || !answer) {
                throw new Error("La conversación debe contener tanto una pregunta como una respuesta.");
            }

            // Obtener usuario por número de teléfono
            const userResult = await this.db.listDocuments(this.databaseId, this.usersCollectionId, [
                `equal("phone", "${number}")`
            ]);

            if (userResult.total === 0) {
                throw new Error("Usuario no encontrado en la base de datos.");
            }

            const userId = userResult.documents[0].$id;

            await this.db.createDocument(this.databaseId, this.conversationsCollectionId, ID.unique(), {
                user_id: userId,
                question,
                answer,
                timestamp: date
            });

            console.log("Conversación guardada en Appwrite.");
        } catch (error) {
            console.error("Error al guardar la conversación:", error);
        }
    }

    // 📂 Obtener las últimas conversaciones del usuario
    async getUserConv(number: string): Promise<any[]> {
        try {
            const userResult = await this.db.listDocuments(this.databaseId, this.usersCollectionId, [
                `equal("phone", "${number}")`
            ]);

            if (userResult.total === 0) {
                return [];
            }

            const userId = userResult.documents[0].$id;

            const conversationResult = await this.db.listDocuments(this.databaseId, this.conversationsCollectionId, [
                `equal("user_id", "${userId}")`,
                "orderDesc(\"timestamp\")",
                "limit(3)"
            ]);

            return conversationResult.documents.map(doc => ([
                { role: "user", content: doc.question },
                { role: "assistant", content: doc.answer }
            ])).flat();
        } catch (error) {
            console.error("Error al obtener la conversación:", error);
            return [];
        }
    }
}

export default new AppwriteManager();
