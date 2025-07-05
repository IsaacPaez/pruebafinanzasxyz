/**
 * Limpia una cadena de texto que representa un monto y la convierte en un número.
 * Maneja símbolos de moneda, separadores de miles y comas decimales.
 * @param amountStr La cadena de texto del monto (ej. "$10.500,50").
 * @returns El monto como un número (ej. 10500.50).
 */
export function cleanAndParseNumber(amountStr: string): number {
    if (!amountStr || typeof amountStr !== 'string') {
        return 0;
    }

    // 1. Elimina todo lo que no sea un dígito, una coma o un punto.
    // 2. Elimina los puntos (usados como separadores de miles).
    // 3. Reemplaza la coma (usada como separador decimal) por un punto.
    const cleanedString = amountStr
        .replace(/[^\d,.]/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '.');

    const number = parseFloat(cleanedString);

    // Si el resultado no es un número válido, devuelve 0.
    return isNaN(number) ? 0 : number;
}