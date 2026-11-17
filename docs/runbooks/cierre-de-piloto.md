# Runbook · Cierre de piloto (ciclo de vida de empresa)

> Cómo cerrar una empresa con el modelo de ADR-0016 (`companies.status`). **Nunca** se corta una empresa
> desactivando usuarios: el estado vive en la empresa y los usuarios no se tocan.
> Quién lo ejecuta: superadmin HG. Última revisión: 2026-11-16 (LC-1; el paso a `suspended` es **manual** hasta LC-09).

## Qué ve cada persona de la empresa, según el estado

| Estado | Usuarios, managers, RRHH y company_admin | Superadmin HG |
|---|---|---|
| `trial` / `active` | Todo, como siempre. | Todo. |
| `grace` | Solo **ven su progreso / perfil / dashboards** y exportan CSV; soporte y cierre de sesión funcionan. Sin contenido, sin assessment, sin invitaciones, sin escrituras. Banner: *"Tu empresa ya no tiene licencia activa. Puedes ver tu progreso hasta el {fecha}."* No se aceptan invitaciones nuevas. | Todo. |
| `suspended` | Nadie entra (pantalla "El acceso de tu empresa a Human Growth está pausado…"). Datos intactos. | Entra. |
| `terminated` | Igual que `suspended`; marca el inicio del reloj de retención (ADR-0017, aún sin implementar). | Entra. |

Transiciones permitidas: `trial→active`, `trial→grace`, `active→grace`, `grace→active`, `grace→suspended`,
`active→suspended` (corte de emergencia), `suspended→active`, `suspended→terminated`, `terminated→suspended` (rescate).

> **Detalle importante:** si `grace_ends_at` ya pasó y el estado sigue en `grace`, el sistema **trata la empresa como
> `suspended`** (defensa en profundidad). Pero el estado guardado sigue diciendo `grace` hasta que alguien lo pase a
> `suspended` (paso 7). No lo dejes así: el panel y el historial mostrarían un estado que ya no es cierto.

## Antes de empezar

- [ ] Tenés rol `superadmin` y sabés el **slug** de la empresa (Admin → Empresas).
- [ ] Hay acuerdo comercial con el contacto de la empresa sobre fecha de cierre y plazo de gracia.
- [ ] Definido `grace_days` (por defecto **30**; es configurable por empresa, 0–180; el valor por defecto está pendiente de
      confirmación de Andy). Si hace falta otro plazo, cambialo **antes** de pasar a gracia.

## Pasos

### 1. Exportar el reporte final
Desde el dashboard de RRHH de la empresa (Admin → Dashboard → *Exportar CSV*) o, como superadmin,
`GET /api/v1/admin/org/users/export.csv?company_id=<id>`. Guardalo y envialo al contacto: en gracia todavía lo van a poder
bajar ellos, pero conviene entregarlo igual.

### 2. Confirmar un backup reciente de Neon
En la consola de Neon confirmá que hay punto de restauración reciente (o creá un *branch* de respaldo) **antes** de cambiar
nada. No se borra ningún dato en este proceso, pero el backup es la red de seguridad si algo sale distinto a lo esperado.

### 3. Dry-run de la transición
Con la UI: Admin → Empresas → **Estado** → elegí *Gracia* → **Ver vista previa**. Muestra cuántos usuarios activos hay por
rol (no se modifican), invitaciones pendientes, administradores a avisar y la fecha en que terminaría la gracia. Nada se escribe.

Equivalente por consola (solo lectura):
```bash
cd apps/backend
uv run python scripts/lc_migrate_company.py --slug <slug> --to grace      # vista previa
```

### 4. Avisar al contacto de la empresa (con X días de anticipación)
Usá el mensaje tipo de abajo. Acordá la fecha de entrada a gracia y la de fin.

### 5. `active → grace`
UI: Admin → Empresas → **Estado** → *Gracia* → vista previa → motivo (opcional) → **Aplicar cambio**.
Por consola:
```bash
uv run python scripts/lc_migrate_company.py --slug <slug> --to grace --apply \
  --reason "Cierre de piloto" --actor-email <tu-email-superadmin>
```
Queda un evento en el historial (Empresas → **Historial**) con quién, cuándo y por qué.

### 6. Verificar con un usuario de prueba de esa empresa
Entrá con un usuario de prueba (o pedile a RRHH que lo haga) y comprobá:
- [ ] El login funciona y aparece el banner de gracia con la fecha correcta.
- [ ] Ve su progreso, perfil y dashboards; **no** puede abrir módulos ni hacer el assessment.
- [ ] Un RRHH puede ver y exportar, pero no invitar ni cargar miembros.
- [ ] Una invitación pendiente **no** se puede aceptar (mensaje de empresa sin acceso).
- [ ] Una empresa **distinta** sigue funcionando normal (aislamiento).

### 7. Al llegar `grace_ends_at`: pasar a `suspended` (manual en LC-1)
UI: **Estado** → *Suspendida* → vista previa → **motivo obligatorio** → escribir el slug para confirmar → aplicar.
```bash
uv run python scripts/lc_migrate_company.py --slug <slug> --to suspended --apply \
  --reason "Fin de periodo de gracia" --confirm-slug <slug> --actor-email <tu-email-superadmin>
```
Desde ahí nadie de la empresa entra (solo superadmin). Los datos quedan intactos. Más adelante, `suspended → terminated`
inicia el reloj de retención (política y anonimización: ADR-0017, pendiente de criterio legal; **no** se implementa en LC-1).

### 8. Cómo revertir
Todo es reversible mientras no se anonimice (y la anonimización no existe todavía):

| Estoy en | Para volver | Cómo |
|---|---|---|
| `grace` | `active` | UI → Estado → *Activa* (limpia el fin de gracia) |
| `suspended` | `active` | UI → Estado → *Activa* |
| `terminated` | `suspended` → `active` | dos cambios seguidos (rescate) |

Como los usuarios nunca se tocaron, **volver a `active` restaura el acceso de todos al instante**: los tokens ya emitidos
vuelven a ser válidos y no hay que reactivar a nadie.

## Caso especial: una empresa cerrada "a mano" (p. ej. CESA)

Si la empresa se cerró antes de existir este modelo, desactivando usuarios uno por uno:
1. **No hay forma de saber** cuáles desactivó el cierre y cuáles ya estaban inactivos desde antes.
2. Corré el script en **dry-run** (no escribe nada) para ver el estado y la lista de inactivos:
   ```bash
   cd apps/backend
   DATABASE_URL=<url de producción> uv run python scripts/lc_migrate_company.py --slug <slug-de-cesa>
   # y, para decidir a quiénes restaurar, exportar la lista:
   DATABASE_URL=<url de producción> uv run python scripts/lc_migrate_company.py --slug <slug-de-cesa> --inactive-csv inactivos-cesa.csv
   ```
   El script **imprime a qué base se conecta** antes de hacer nada y nunca muestra credenciales. Verificá que sea la que querés.
3. Decidí a mano a cuáles restaurar (el script **no reactiva a nadie**, por diseño: `PATCH /admin/users/{id}` desde el panel).
4. Recién entonces, con `--apply`, pasá la empresa a `grace` o `suspended`. Si querés que quede cerrada y sin acceso para
   quienes sigan inactivos, el estado de la empresa lo resuelve: no hace falta (ni conviene) volver a desactivar usuarios.

> Este proceso **no se ejecutó contra producción** como parte de LC-1: lo corre Andy.

## Mensaje tipo al cliente

> **Asunto:** Cierre del piloto de Human Growth en {Empresa}
>
> Hola {nombre}:
>
> Te escribimos para avisarte que el piloto de Human Growth en {Empresa} llega a su fin el **{fecha de entrada a gracia}**.
>
> Desde esa fecha, y durante **{X} días** (hasta el **{fecha de fin}**), las personas de tu equipo seguirán pudiendo
> **ver su progreso y su perfil**, y tu equipo de RRHH podrá consultar y exportar los dashboards. No se podrá acceder a nuevos
> contenidos ni hacer nuevas evaluaciones. Pasada esa fecha el acceso se pausa; **tus datos quedan resguardados**.
>
> Te adjuntamos el reporte final de progreso. Si quieren continuar con Human Growth, podemos retomar el acceso completo de
> inmediato: respondé este correo y lo coordinamos.
>
> Gracias por haber sido parte de esta primera etapa.
> {Firma}

## Errores comunes

- **Cortar desactivando usuarios**: no deja registro, no es reversible con certeza y no es el modelo vigente.
- **Olvidar el paso 7**: el acceso ya está cortado por el vencimiento, pero el estado guardado sigue en `grace`.
- **Pasar a `suspended` sin motivo/slug**: el sistema lo rechaza a propósito (UI y script).
- **Correr el script contra producción "por probar"**: sin `--apply` no escribe, pero igual lee datos reales; revisá el host impreso.
