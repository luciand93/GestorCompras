# Smart Shopping PWA 🛒

Aplicación web progresiva (PWA) para gestión inteligente de compras con IA.

## 🚀 Características

- ✅ **Lista de compras colaborativa** con estado de items (pendientes/comprados)
- ✅ **Escáner de precios con IA** usando Google Gemini para extraer información de tickets
- ✅ **Comparador visual de precios** entre supermercados con código de colores
- ✅ **Diseño Mobile First** con UI moderna y botones táctiles grandes
- ✅ **Navegación inferior** optimizada para móviles

## 📋 Prerequisitos

- Node.js 18+ instalado
- Cuenta de Supabase (gratuita)
- API Key de Google Gemini (gratuita)

## 🛠️ Instalación

1. **Instala las dependencias:**
   ```bash
   npm install
   ```

2. **Configura Supabase:**
   - Crea un proyecto en [Supabase](https://supabase.com)
   - Ejecuta el archivo `schema.sql` en el SQL Editor de Supabase
   - Copia la URL y la Anon Key de tu proyecto desde Settings > API

3. **Configura las variables de entorno:**
   - Copia `ENV.example` a `.env.local`
   - Completa los valores:
     ```
     NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
     NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_aqui
     NEXT_PUBLIC_GEMINI_API_KEY=tu_api_key_aqui
     ```

4. **Obtén API Key de Gemini:**
   - Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Genera una API key gratuita
   - Añádela a `.env.local`

5. **Ejecuta el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

6. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📱 Funcionalidades Implementadas

### 1. Lista de Compras (`/`)
- Añadir productos manualmente o por voz (preparado)
- Marcar items como comprados (no se borran inmediatamente)
- Ver items pendientes y comprados separados
- Botón flotante grande (+) para añadir productos
- Botón "Finalizar Compra" que limpia items marcados y redirige al escáner

### 2. Escáner de Precios (`/scanner`)
- Subir foto desde galería
- Usar cámara del dispositivo para capturar tickets
- Procesamiento con Google Gemini AI para extraer:
  - Productos y precios
  - Supermercado
  - Fecha de compra
  - Precios unitarios (si están disponibles)
- Guardado automático en base de datos

### 3. Comparador de Precios (`/comparator`)
- Visualización de precios por producto de tu lista
- Código de colores:
  - 🟢 Verde: Mejor precio disponible
  - 🔴 Rojo/Naranja: Precio más caro
- Comparación entre supermercados
- Sugerencias de ahorro: "El Aceite está más barato en Mercadona (3.50€) que en tu última compra en Lidl (3.80€)"
- Histórico de precios por supermercado

## 🗄️ Base de Datos

El proyecto usa Supabase (PostgreSQL) con las siguientes tablas:

- **`products`**: Catálogo de productos (id, name, category, image_url)
- **`prices`**: Histórico de precios por supermercado (id, product_id, supermarket_name, price, unit_price, date_recorded)
- **`shopping_list`**: Lista de compras activa (id, product_name, is_checked, quantity)

Ejecuta `schema.sql` en el SQL Editor de Supabase para crear las tablas.

## 🔧 Stack Tecnológico

- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **Estilos:** Tailwind CSS con variables de tema
- **UI:** Componentes Shadcn/UI, Lucide React para iconos
- **Base de Datos:** Supabase (PostgreSQL)
- **IA/OCR:** Google Generative AI SDK (Gemini 1.5 Flash)
- **PWA:** Manifest.json configurado

## 📁 Estructura del Proyecto

```
├── app/
│   ├── actions/          # Server Actions para Supabase
│   │   ├── prices.ts
│   │   ├── scanner.ts
│   │   └── shopping-list.ts
│   ├── comparator/       # Página de comparador
│   ├── scanner/          # Página de escáner
│   ├── globals.css       # Estilos globales
│   ├── layout.tsx        # Layout principal
│   └── page.tsx          # Página principal (lista)
├── components/
│   ├── ui/               # Componentes Shadcn/UI
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── dialog.tsx
│   ├── BottomNav.tsx     # Navegación inferior
│   ├── ClientLayout.tsx  # Layout cliente
│   ├── ComparatorView.tsx
│   ├── ScannerView.tsx
│   └── ShoppingList.tsx
├── lib/
│   ├── supabase.ts       # Cliente Supabase
│   └── utils.ts          # Utilidades CSS
├── utils/
│   └── ai-scanner.ts     # Lógica de escaneo IA
├── public/
│   └── manifest.json     # PWA manifest
├── schema.sql            # Esquema de BD
└── ENV.example           # Plantilla de variables
```

## 🎨 Diseño Mobile First

- Botones grandes y táctiles (mínimo 44x44px)
- Navegación inferior fija
- Tarjetas con sombras suaves
- Espaciado generoso para fácil interacción
- Soporte para safe-area (notch en iPhone)

## 🚧 Próximas Mejoras

- [ ] Reconocimiento de voz para añadir productos
- [ ] Categorización automática de productos
- [ ] Gráficos de evolución de precios
- [ ] Notificaciones de ofertas
- [ ] Modo offline con Service Worker
- [ ] Sincronización multi-dispositivo

## 📝 Notas

- La aplicación está optimizada para móviles pero funciona en desktop
- Los precios se extraen automáticamente de los tickets escaneados
- El comparador solo muestra productos de tu lista actual
- Los items comprados se mantienen visibles hasta que finalices la compra

## 📄 Licencia

Proyecto personal para uso privado.
