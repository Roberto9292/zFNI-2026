# Pendientes — FNI Go

Backlog priorizado por riesgo, no por esfuerzo. Cada punto incluye el porqué,
para que dentro de un mes siga teniendo sentido.

---

## 🔴 Crítico

### 1. Endurecer las reglas de Firestore

**Estado actual** (`firestore.rules`):

```
match /locations/{locationId} {
  allow read, write: if request.auth != null;
}
```

Cualquier usuario registrado puede **editar o borrar las aulas de todos**. No
hay campo de propietario ni validación de forma: un cliente autenticado puede
escribir campos basura o vaciar la colección desde la consola del navegador.

**Qué hacer**

- Añadir `ownerId` al modelo `Location` y guardarlo en `addLocation()`.
- Permitir `update`/`delete` solo si `request.auth.uid == resource.data.ownerId`.
- Validar en las reglas que los campos existan y sean del tipo esperado
  (`subject`, `teacher`, `career`, `block`, `parallel`, `schedule` como
  `string`; `latitude` y `longitude` como `number` y dentro de un rango
  razonable para Oruro).
- Valorar roles: que solo administración registre aulas y el resto solo lea.
  Se resuelve con *custom claims* en Auth.

> Es el único punto de la lista que puede causar un daño irreversible.

### 2. Guardar el trabajo en git

El repositorio no tiene ningún commit de todo el trabajo hecho: identidad de la
FNI, rediseño completo, buscador con paginación, rutas por calles, adaptación a
móvil y el refactor. Todo vive solo en el directorio de trabajo.

---

## 🟠 Importante

### 3. Pruebas

No existe ningún archivo `.spec`. Hay tres funciones puras, extraídas
precisamente para poder probarlas sin montar Angular:

| Función | Archivo | Qué verificar |
|---|---|---|
| `filtrarUbicaciones` | `core/busqueda/filtrar-ubicaciones.ts` | que "calculo" encuentre "Cálculo"; campos vacíos de registros antiguos |
| `NavegacionService.metrosEntre` | `core/services/navegacion.service.ts` | haversine contra distancias conocidas |
| `componerHorario` | `components/location-form/…` | que dos `Date` produzcan `"08:00 - 10:00"` |

### 4. Editar y borrar aulas

Hoy solo se puede crear. Si alguien registra una coordenada mal, no hay forma
de corregirla desde la app. `LocationService` ya tiene `updateLocation()` y
`deleteLocation()` escritos y sin usar: falta la interfaz.

Depende del punto 1: sin `ownerId` no se puede decidir quién puede borrar qué.

### 5. El estado vacío miente mientras carga

`@if (locationCount() === 0)` muestra *"Todavía no hay aulas registradas"*, y
eso incluye el intervalo en que Firestore aún no ha respondido. El usuario ve
"no hay nada" antes de ver los marcadores.

**Qué hacer**: añadir un estado `cargando` en `LocationService` (falso hasta el
primer `onSnapshot`) y distinguir las tres situaciones: cargando, vacío, con
datos.

---

## 🟡 Mejoras

### 6. Convertirla en PWA

Es una app de campus: se usa caminando, en móvil y con cobertura irregular.
Instalable y con las aulas en caché sería un salto de utilidad mayor que
cualquier retoque visual.

### 7. Agrupar marcadores

Con cuatro aulas da igual; con cincuenta en el mismo bloque se solaparán.

### 8. Unificar el formato de horario

Conviven `"8:00-10:00"` (registros antiguos, texto libre) y `"08:00 - 10:00"`
(los que crea el selector de hora). Hoy no molesta porque solo se muestra, pero
en cuanto se quiera ordenar o filtrar por hora habrá que migrarlos.

---

## ⚪ Fuera de nuestro control

### 9. Facturación de Google Maps

El error `BillingNotEnabledMapError` hace que Google muestre el diálogo *"Esta
página no puede cargar Google Maps correctamente"* en cada carga, y el mapa sale
atenuado. **No tiene solución en código** — ocultar ese aviso viola los términos
de Maps Platform y arriesga la suspensión de la API key, que es la misma que
sostiene el login y Firestore.

Las dos salidas son: resolver el rechazo del perfil de pagos (`OR_BACR2_44`) con
soporte de Google Cloud, o cambiar a un proveedor de mapas sin tarjeta.

Nota: las **rutas** ya no dependen de Google. Las calcula OSRM
(`core/services/ruta.service.ts`), gratis y sin key.

---

## Limpieza

- [ ] Borrar el usuario de pruebas `qa-test@example.com` de Firebase Auth.
- [ ] Revisar los registros de prueba en Firestore (`fsdf`, `ddd`, `sadasd`).

---

## Verificado a medias

Cosas que quedaron sin comprobar de punta a punta y conviene mirar en un
dispositivo real:

- El flujo completo de *Cómo llegar* después del refactor.
- Que los controles de zoom de Google desaparezcan en pantalla táctil.
- El panel de ruta anclado abajo en un móvil de verdad.
