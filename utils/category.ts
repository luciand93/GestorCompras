export function getCategoryForProduct(pName: string): string {
    const name = pName.toLowerCase();
    if (name.includes("llet") || name.includes("leche") || name.includes("yogur") || name.includes("queso") || name.includes("manteca") || name.includes("kefir")) return "Lácteos";
    if (name.includes("ternera") || name.includes("pollo") || name.includes("cerdo") || name.includes("carne") || name.includes("jamón") || name.includes("pavo") || name.includes("salchicha")) return "Carne";
    if (name.includes("papel") || name.includes("detergente") || name.includes("lejía") || name.includes("fregasuelos") || name.includes("gel") || name.includes("champú")) return "Limpieza e Higiene";
    if (name.includes("pescado") || name.includes("atún") || name.includes("merluza") || name.includes("salmón") || name.includes("calamar") || name.includes("gamba")) return "Pescadería";
    if (name.includes("pan") || name.includes("arroz") || name.includes("pasta") || name.includes("tomate frito") || name.includes("galleta") || name.includes("cereal") || name.includes("legumbres")) return "Despensa";
    if (name.includes("manzana") || name.includes("plátano") || name.includes("patata") || name.includes("cebolla") || name.includes("tomate") || name.includes("lechuga") || name.includes("zanahoria") || name.includes("fruta") || name.includes("verdura")) return "Fruta y Verdura";
    return "Otros";
}
