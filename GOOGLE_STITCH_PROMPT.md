# Prompt para Google Stitch

## Copia y pega este texto en Google Stitch:

---

Diseña una app móvil de lista de compras inteligente llamada "Smart Shopping" con estas 3 pantallas:

### PANTALLA 1: Lista de Compras (Principal)
- Header con título "Mi Lista de Compras" y subtítulo "Gestiona tus compras de forma inteligente"
- Sección "Pendientes" con cards de productos, cada card tiene:
  - Checkbox circular a la izquierda
  - Nombre del producto
  - Cantidad (si es mayor a 1)
  - Botón de papelera a la derecha para eliminar
- Sección "En el carrito" con productos marcados (tachados, opacidad reducida)
- Botón flotante verde "Finalizar Compra (3)" en la parte inferior izquierda
- Botón flotante azul "+ Añadir" en la parte inferior derecha
- Navegación inferior con 3 tabs: Lista (icono carrito), Escáner (icono cámara), Comparar (icono gráfico)

### PANTALLA 2: Escáner de Tickets
- Header "Escáner de Precios"
- Descripción: "Toma una foto de tu ticket para extraer precios con IA"
- Dos botones grandes: "Subir Foto" (outline) y "Cámara" (filled azul)
- Vista de cámara cuando está activa
- Card de resultados mostrando productos extraídos con precios
- Estado de carga con spinner "Analizando con IA..."
- Misma navegación inferior

### PANTALLA 3: Comparador de Precios
- Header "Comparador de Precios"
- Lista de productos con cards expandidas
- Cada card muestra:
  - Nombre del producto
  - Card verde destacada con "Mejor precio" + nombre supermercado + precio
  - Badge "Ahorra X€ comprando en [supermercado]"
  - Lista de otros supermercados con sus precios
- Misma navegación inferior

### ESTILO VISUAL:
- Mobile-first, diseño limpio y moderno
- Colores: Azul primario, verde para éxito/mejor precio, rojo para eliminar
- Cards con bordes redondeados grandes y sombras suaves
- Botones táctiles grandes (mínimo 44px)
- Tipografía clara y legible
- Espaciado generoso
- Iconos de Lucide/Material Design
- Fondo blanco o gris muy claro

---

## Prompts alternativos más cortos:

### Versión corta 1:
```
Mobile shopping list app with 3 screens: 
1) Shopping list with checkable product cards, floating "Add" button, bottom nav
2) Receipt scanner with camera button and AI-extracted results
3) Price comparator showing best prices per store in green cards
Style: Clean, modern, blue primary color, large touch targets, soft shadows
```

### Versión corta 2:
```
Smart grocery app: Main screen shows pending/completed items with circular checkboxes. Scanner screen has camera for receipt OCR. Comparator shows price rankings with green "best deal" highlights. Bottom navigation with 3 tabs. Mobile-first, modern UI with cards and floating action buttons.
```

### Versión solo lista de compras:
```
Shopping list mobile app screen with:
- Header "Mi Lista de Compras"
- Product cards with circular checkbox, product name, delete button
- "Pendientes" and "En el carrito" sections
- Green floating button "Finalizar Compra"
- Blue floating button "+ Añadir"
- Bottom nav: Lista, Escáner, Comparar
Modern style, soft shadows, large touch targets
```

---

## Tips para Google Stitch:

1. **Sé específico** con elementos UI (cards, buttons, nav)
2. **Menciona colores** específicos (azul, verde, rojo)
3. **Indica el estilo** (moderno, limpio, mobile-first)
4. **Describe interacciones** (checkbox, botón flotante)
5. **Genera una pantalla a la vez** para mejores resultados
