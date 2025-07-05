interface MenuOption {
  id: string;
  title: string;
  description?: string;
}

interface MenuConfig {
  header: string;
  body: string;
  footer?: string;
  buttonText: string;
}

export class WhatsAppMenuBuilder {
  /**

  * Crea un menú de lista interactivo para WhatsApp (API de Meta)
   */
  static createInteractiveMenu(options: MenuOption[], config: MenuConfig) {
    if (options.length === 0) {
      return null;
    }

    // WhatsApp tiene un límite de 10 opciones por sección
    const limitedOptions = options.slice(0, 10);

    return {
      type: "interactive",
      interactive: {
        type: "list",
        header: {
          type: "text",
          text: config.header,
        },
        body: {
          text: config.body,
        },
        footer: config.footer ? { text: config.footer } : undefined,
        action: {
          button: config.buttonText,
          sections: [
            {
              title: "Opciones", // Este título es obligatorio
              rows: limitedOptions.map(option => ({
                id: option.id, // El ID que recibirás cuando el usuario seleccione
                title: option.title.substring(0, 24), // Límite de 24 caracteres
                description: option.description?.substring(0, 72), // Límite de 72 caracteres
              })),
            },
          ],
        },
      },
    };
  }
}