# Smart Shopping PWA - Design Brief

## 📱 Descripción de la App

**Smart Shopping** es una Progressive Web App (PWA) para gestión inteligente de compras personales. Permite crear listas de compras, escanear tickets con IA para extraer precios automáticamente, y comparar precios entre supermercados.

**Público objetivo:** Usuarios que hacen la compra regularmente y quieren ahorrar dinero comparando precios.

**Plataforma:** Mobile-first (PWA), funciona en iOS, Android y desktop.

---

## 🎯 Funcionalidades Principales

### 1. Lista de Compras (Pantalla Principal)
- Ver productos pendientes de comprar
- Ver productos ya en el carrito (marcados)
- Añadir productos con botón flotante
- Autocompletado de productos anteriores
- Productos recientes para añadir rápido (chips/tags)
- Marcar/desmarcar productos con checkbox circular
- Eliminar productos con botón de papelera
- Botón "Finalizar Compra" cuando hay items marcados
- Contadores de items pendientes y en carrito

### 2. Escáner de Tickets (IA)
- Subir foto desde galería
- Capturar foto con cámara del móvil
- Procesamiento con IA (Google Gemini)
- Extracción automática de: productos, precios, supermercado, fecha
- Visualización de resultados extraídos
- Estados: cargando, éxito, error
- Guardado automático en base de datos

### 3. Comparador de Precios
- Lista de productos de tu lista de compras
- Para cada producto: mostrar precios en diferentes supermercados
- Destacar el MEJOR precio (más barato) en verde
- Mostrar ahorro potencial: "Ahorra X€ comprando en Mercadona"
- Ranking de supermercados por precio
- Fecha del último precio registrado

---

## 📐 Estructura de Pantallas

```
┌─────────────────────────────────────┐
│           HEADER (opcional)         │
│         "Mi Lista de Compras"       │
├─────────────────────────────────────┤
│                                     │
│         CONTENIDO PRINCIPAL         │
│                                     │
│    - Cards de productos             │
│    - Estados vacíos                 │
│    - Resultados de escaneo          │
│                                     │
├─────────────────────────────────────┤
│  [Finalizar Compra]  [+ Añadir]     │  ← Botones flotantes
├─────────────────────────────────────┤
│   🛒 Lista   📷 Escáner   📊 Comparar│  ← Nav inferior fija
└─────────────────────────────────────┘
```

---

## 🛠 Stack Tecnológico

| Tecnología | Uso |
|------------|-----|
| **Next.js 14** | Framework React con App Router |
| **React 18** | UI Components |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Estilos utility-first |
| **Shadcn/UI** | Componentes base (Button, Card, Dialog) |
| **Lucide React** | Iconos |
| **Supabase** | Base de datos PostgreSQL |
| **Google Gemini** | IA para OCR de tickets |

---

## 🎨 Componentes UI Existentes

### Botones
- **Primario:** Azul, grande (h-14), bordes redondeados
- **Secundario/Outline:** Borde, fondo transparente
- **Flotante:** Circular o pill con texto, sombra pronunciada
- **Destructivo:** Rojo para eliminar

### Cards
- Fondo blanco, bordes redondeados (rounded-lg)
- Sombra suave (shadow-sm)
- Padding generoso (p-4 a p-6)
- Hover: sombra más pronunciada

### Navegación Inferior
- 3 tabs: Lista, Escáner, Comparar
- Iconos + texto pequeño
- Tab activo en color primario
- Fondo blanco con borde superior

### Dialog/Modal
- Overlay oscuro semi-transparente
- Card centrada con padding
- Título + contenido + botones de acción
- Animación de entrada

### Checkboxes
- Circulares (no cuadrados)
- Animación al marcar
- Check icon cuando marcado

### Estados
- **Vacío:** Icono grande + texto + CTA
- **Cargando:** Spinner animado + texto
- **Error:** Borde rojo + icono alerta + mensaje
- **Éxito:** Borde verde + icono check + mensaje

---

## 🌈 Paleta de Colores Actual

```css
--primary: Azul (#3b82f6)
--success: Verde (#22c55e) - mejor precio, completado
--warning: Ámbar (#f59e0b) - modo demo, avisos
--destructive: Rojo (#ef4444) - eliminar, errores
--muted: Gris claro - textos secundarios, fondos
--background: Blanco
--foreground: Gris oscuro/negro
```

---

## ✨ Requisitos de Diseño

### Must Have
- **Mobile-first:** Optimizado para pantallas pequeñas
- **Touch-friendly:** Botones mínimo 44x44px
- **Contraste alto:** Legible en exteriores
- **Feedback visual:** Estados hover, active, loading
- **Accesibilidad:** Colores distinguibles, textos legibles

### Nice to Have
- Microinteracciones (animaciones sutiles)
- Modo oscuro
- Ilustraciones/iconos personalizados para estados vacíos
- Gradientes sutiles
- Glassmorphism en elementos flotantes

---

## 📸 Flujos de Usuario

### Flujo 1: Añadir producto
1. Usuario pulsa "Añadir" → Abre modal
2. Escribe nombre → Ve sugerencias de productos anteriores
3. Selecciona sugerencia o escribe nuevo
4. Ajusta cantidad con +/-
5. Pulsa "Añadir" → Modal se cierra, producto aparece en lista

### Flujo 2: Hacer la compra
1. Usuario en supermercado con lista abierta
2. Encuentra producto → Pulsa checkbox → Se marca como "en carrito"
3. Repite hasta terminar
4. Pulsa "Finalizar Compra" → Redirige al escáner

### Flujo 3: Escanear ticket
1. Usuario pulsa "Cámara" o "Subir foto"
2. Toma/selecciona foto del ticket
3. Ve spinner "Analizando con IA..."
4. Ve resultados: lista de productos con precios
5. Datos se guardan automáticamente

### Flujo 4: Comparar precios
1. Usuario abre pestaña "Comparar"
2. Ve sus productos de la lista
3. Para cada producto: card con precios por supermercado
4. Ve destacado el mejor precio
5. Ve cuánto puede ahorrar

---

## 📝 Textos/Copy de la App

- **Título principal:** "Mi Lista de Compras"
- **Subtítulo:** "Gestiona tus compras de forma inteligente"
- **Botón añadir:** "+ Añadir"
- **Botón finalizar:** "Finalizar Compra (X)"
- **Estado vacío lista:** "Tu lista está vacía" + "Pulsa el botón para añadir productos"
- **Estado vacío comparador:** "No hay productos en tu lista"
- **Escáner título:** "Escáner de Precios"
- **Escáner descripción:** "Toma una foto de tu ticket para extraer precios con IA"
- **Comparador título:** "Comparador de Precios"
- **Mejor precio:** "Mejor precio" / "Ahorra X€"

---

## 🎯 Inspiración de Diseño

Buscar inspiración en:
- Apps de listas de compras: AnyList, Bring!, OurGroceries
- Apps de finanzas: Mint, YNAB (para comparaciones)
- Apps de retail: Target, Walmart (para escaneo)
- Estilo: Moderno, limpio, colorido pero no saturado
- Tendencias: Glassmorphism suave, bordes redondeados grandes, sombras difusas

---

## 📁 Archivos de Componentes a Modificar

```
components/
├── ShoppingList.tsx      # Lista principal con cards de productos
├── ScannerView.tsx       # Vista del escáner con cámara
├── ComparatorView.tsx    # Comparador de precios
├── BottomNav.tsx         # Navegación inferior
├── ClientLayout.tsx      # Layout wrapper
└── ui/
    ├── button.tsx        # Estilos de botones
    ├── card.tsx          # Estilos de cards
    └── dialog.tsx        # Modal/Dialog

app/
├── globals.css           # Variables CSS y estilos globales
├── layout.tsx            # Layout con metadata
└── page.tsx              # Página principal
```
