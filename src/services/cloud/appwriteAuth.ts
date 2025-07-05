import { Client, Users, Account, Databases, ID, Query } from "node-appwrite";
import dotenv from "dotenv";

dotenv.config();

class AppwriteAuth {
    
    private client: Client;
    private users: Users;
    private account: Account;
    private database: Databases;
    private databaseId: string = process.env.APPWRITE_DATABASE_ID as string;
    private userAttributesCollectionId: string = process.env.APPWRITE_USERS_COLLECTION_ID as string;

    constructor() {
        this.client = new Client()
            .setEndpoint(process.env.APPWRITE_ENDPOINT as string)
            .setProject(process.env.APPWRITE_PROJECT_ID as string)
            .setKey(process.env.APPWRITE_API_KEY as string);

        this.users = new Users(this.client);
        this.account = new Account(this.client);
        this.database = new Databases(this.client);
    }

    async registerUser(
        email: string, password: string, name: string, phone: string,
        country: string, birthdate: string, civilStatus: string,
        occupation: string, gender: string, address: string, city: string, typeId:string, numberId:string, nickname: string
    ) {
        try {
            console.log("📌 Registrando usuario en Appwrite Auth:", { email, name, phone });

            // ✅ Validar y limpiar el teléfono
            phone = phone.trim();
            if (!phone.startsWith("+")) phone = `+${phone}`;
            phone = phone.replace(/[^\d+]/g, ""); // ✅ Remueve caracteres no válidos

            console.log(`📞 Teléfono después de limpiar: ${phone}`);
            console.log(`🔢 Longitud del teléfono: ${phone.length}`);

            if (phone.length > 15) {
                throw new Error(`❌ Error: El número de teléfono tiene ${phone.length} caracteres, máximo permitido: 15.`);
            }

            // 📌 **1️⃣ Crear usuario en Appwrite Auth (sin teléfono)**
            const userId = ID.unique();
            const user = await this.users.create(userId, email, phone, password, name);
            console.log("✅ Usuario registrado en Appwrite:", user);

            // 📌 **2️⃣ Iniciar sesión para actualizar datos**
            await this.account.createEmailPasswordSession(email, password);
            console.log("✅ Usuario autenticado correctamente.");

            // 📌 **4️⃣ Guardar datos adicionales en la BD (User_attributes)**
            await this.database.createDocument(
                this.databaseId,
                this.userAttributesCollectionId,
                ID.unique(),
                {
                    userId: phone, // ✅ Se usa el teléfono como ID
                    nickname: nickname, // ✅ Se agrega el nickname
                    country: country,
                    birthDay: birthdate,
                    civilStatus: civilStatus,
                    occupation: occupation,
                    gender: gender,
                    address: address,
                    id_type: typeId,
                    numberId: numberId,
                    phoneNumber: phone,
                    city: city
                }
            );
            console.log("✅ Perfil de usuario guardado en la base de datos.");

            return user;
        } catch (error) {
            console.error("🚨 Error registrando usuario en Appwrite Auth:", error.message);
            throw new Error(error.message);
        }
    }

    // 🔍 **Verificar si un usuario ya existe en Appwrite Auth por su número de celular**
    async userExists(phone: string): Promise<boolean> {
        try {
            console.log("🔍 Buscando usuario en Appwrite Auth con el número:", phone);
    
            // ✅ Asegurar que el número tenga formato internacional
            if (!phone.startsWith("+")) {
                phone = `+${phone}`;
            }
    
            let allUsers: any[] = [];
            let lastUserId: string | null = null;
            let totalUsers = 0;
    
            do {
                const queries = lastUserId
                    ? [Query.cursorAfter(lastUserId), Query.limit(100)]
                    : [Query.limit(100)];
    
                try {
                    const response = await this.users.list(queries);
    
                    if (!response.users || response.users.length === 0) break;
    
                    allUsers = [...allUsers, ...response.users];
                    totalUsers += response.users.length;
                    lastUserId = response.users[response.users.length - 1].$id;
                } catch (error) {
                    console.error("❌ Error obteniendo usuarios en Appwrite:", error);
                    return false;
                }
            } while (lastUserId); // Ahora el ciclo siempre ejecuta al menos una vez
    
            console.log(`👀 Se encontraron ${totalUsers} usuarios en Auth.`);
    
            // ✅ Buscar el teléfono en distintos formatos
            const userExists = allUsers.some(user => {
                if (!user.phone) return false;
                return user.phone.trim() === phone || user.phone.trim() === phone.replace("+", "");
            });
    
            console.log("🔎 Resultado de búsqueda en Auth:", userExists);
            return userExists;
        } catch (error) {
            console.error("❌ Error verificando usuario en Appwrite Auth:", error);
            return false;
        }
    }
        
}

export default new AppwriteAuth();
