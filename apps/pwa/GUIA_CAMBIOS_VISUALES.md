# Guía Visual: Cambios en "Registrar Animal"

## 🎯 Lo Que Cambió

### Antes ❌
```
┌─────────────────────────────────────┐
│  Formulario de columnas sencillas    │
│  Nombre              | Especie       │
│  Identificación      | Recinto       │
│  Sexo                | Fecha nacim.  │
│  Origen              | Observaciones │
│  [Limpiar] [Registrar]               │
└─────────────────────────────────────┘
```

### Después ✅
```
┌──────────────────────────────────────────────┐
│  ┌────────────┐  ┌──────────────────────┐   │
│  │   IMAGEN   │  │  Nombre  │  Especie  │   │
│  │   📷       │  │──────────┴──────────│   │
│  │   Foto     │  │  ID      │  Recinto  │   │
│  │────────────│  │──────────┴──────────│   │
│  │   ✕        │  │  Sexo    │  Fecha   │   │
│  │  Eliminar  │  │──────────┴──────────│   │
│  │            │  │  Origen  │ Observa. │   │
│  └────────────┘  └──────────┴──────────┘   │
│  [Limpiar] [Registrar Animal]              │
└──────────────────────────────────────────────┘
```

---

## 📸 Características Visuales

### 1. Área de Foto (Izquierda)
- **Tamaño**: 200px × 200px
- **Borde**: Punteado (dashed border)
- **Color**: Borde gris, fondo gradiente sutil
- **Icono**: 📷 grande (48px)
- **Texto**: "Foto del animal" (gris claro)
- **Interacción**: 
  - Al pasar mouse: Borde cambia a color primario (rojo/marrones)
  - Al hacer click: Abre selector de archivos
  - Con imagen: Muestra preview + botón ✕ para eliminar

### 2. Campos del Formulario (Derecha)
- **Layout**: Grid de 2 columnas
- **Campos**:
  - **Columna 1**: Nombre, Identificación, Sexo, Origen
  - **Columna 2**: Especie, Recinto, Fecha de nacimiento, Observaciones
- **Ancho**: Flexible según el espacio disponible
- **Espaciado**: 20px entre campos

### 3. Botones (Abajo)
- **Limpiar**: Botón secundario (gris) - Limpia formulario E imagen
- **Registrar Animal**: Botón primario (rojo/marrones) - Envía datos

---

## 🎨 Estilos Aplicados

### Colores
```
Borde área imagen: var(--border) → Gris claro
Al hover:         var(--primary) → Rojo/Marrón
Fondo gradiente:  var(--surface-subtle) → Gris muy claro
Icono y texto:    var(--dashboard-muted-foreground) → Gris medio
```

### Animaciones
```
- Fade In: Imagen aparece suavemente (0.3s)
- Hover: Transición de color 0.3s
- Click botón eliminar: Escala 1.1x + cambio color (0.2s)
```

### Responsive Design
```
ESCRITORIO (1200px+):
  Imagen: 200px × 200px (izquierda)
  Campos: Flex 1fr (derecha)
  Gap: 32px

TABLET (768px - 1199px):
  Imagen: 200px × 200px (izquierda, reducido)
  Campos: Flex ajustado
  Gap: 24px

MÓVIL (< 768px):
  Imagen: 100% ancho × 240px (arriba)
  Campos: 100% ancho (abajo)
  Layout: Vertical (column)
  Gap: 24px
```

---

## 🚀 Cómo Ver los Cambios

### Opción 1: En Desarrollo Local
```bash
cd apps/pwa
npm run dev
# Abre http://localhost:5174
# Navega a "Registrar animal"
```

### Opción 2: Build Producción
```bash
cd apps/pwa
npm run build
# Los archivos compilados estarán en `dist/`
```

---

## 🧪 Casos de Prueba

### Test 1: Cargar Imagen
1. Haz click en el área punteada
2. Selecciona una imagen del computador
3. ✅ Debería mostrar preview de la imagen
4. ✅ Botón ✕ debería aparecer en la esquina superior derecha

### Test 2: Eliminar Imagen
1. Con imagen cargada, click en botón ✕
2. ✅ La imagen debería desaparecer
3. ✅ Volver a mostrar icono 📷 y texto

### Test 3: Hover Effects
1. Pasa mouse sobre área de imagen
2. ✅ Borde debería cambiar a color primario
3. ✅ Fondo debería cambiar ligeramente
4. Pasa mouse sobre botón eliminar
5. ✅ Botón debería oscurecerse y crecer ligeramente

### Test 4: Limpiar Formulario
1. Carga una imagen
2. Completa algunos campos
3. Click en "Limpiar"
4. ✅ Todos los campos se vacían
5. ✅ La imagen también se limpia

### Test 5: Responsividad
1. Abre en navegador de escritorio
2. ✅ Imagen a la izquierda, campos a la derecha
3. Redimensiona a móvil (< 768px)
4. ✅ Imagen arriba (100% ancho), campos abajo

---

## 📝 Comparación de Código

### Estado antiguo (sin imagen)
```typescript
const [imagePreview, setImagePreview] = useState<string | null>(null);
// NO EXISTÍA
```

### Estado nuevo (con imagen)
```typescript
const [imagePreview, setImagePreview] = useState<string | null>(null);
const [selectedFile, setSelectedFile] = useState<File | null>(null);

function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
  // Procesa archivo de imagen
}

function clearImage() {
  // Limpia imagen
}
```

---

## 🔄 Flujo de Usuario Mejorado

```
1. Usuario abre "Registrar animal"
   ↓
2. Ve área grande de imagen (muy visible)
   ↓
3. Hace click → Abre selector de archivos
   ↓
4. Selecciona foto del animal
   ↓
5. Ve preview instantáneamente
   ↓
6. Completa datos del animal en campos
   ↓
7. Revisa imagen antes de guardar
   ↓
8. Click "Registrar animal"
   ↓
9. ✅ Animal guardado
   ✅ Imagen limpiada para próximo registro
```

---

## 💡 Mejoras Futuras

- [ ] Enviar imagen al servidor
- [ ] Mostrar imagen pequeña en tarjeta de animal
- [ ] Múltiples fotos por animal
- [ ] Galería en perfil del animal
- [ ] Drag & drop para subir imagen
- [ ] Compresión automática
- [ ] Filtros básicos (brillo, contraste)

---

## 📂 Archivos Tocados

```
apps/pwa/
├── src/
│   ├── views/
│   │   └── AnimalFormView.tsx    ← MODIFICADO
│   └── styles.css                ← MODIFICADO
├── MEJORAS_REGISTRAR_ANIMAL.md   ← NUEVO
└── GUIA_CAMBIOS_VISUALES.md      ← ESTE ARCHIVO
```

---

## ✨ Resumen de Mejoras

| Aspecto | Antes | Después |
|---------|-------|---------|
| Carga de imagen | ❌ No disponible | ✅ Interfaz visual atractiva |
| Preview | ❌ No | ✅ Instantáneo |
| Layout | Simple 2-col | Moderno con imagen |
| Espaciado | Compacto | Generoso y limpio |
| Animaciones | Ninguna | Suaves transiciones |
| Responsivo | Básico | Completo (3 breakpoints) |
| UX | Funcional | Intuitivo y atractivo |

---

**Versión**: 1.0  
**Estado**: ✅ Listo para producción  
**Fecha**: 2025-11-14
