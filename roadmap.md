# Roadmap

## Pendientes
- [x] Verificar rol admin otorgado a contabilidad@impulsoalcomercio.mx tras login con Google (confirmado: roles {admin, empleado})
- [ ] Migración: trigger en employees AFTER INSERT que vincule user_id automáticamente si ya existe cuenta auth con ese correo (fix: ahora solo se vinculaba al registrarse)
- [ ] Guía al admin: dar de alta su propio expediente de empleado con su correo en Admin → Empleados
- [ ] Instrucciones PWA: instalar la app en el celular (Agregar a pantalla de inicio)
- [ ] Verificar con Playwright flujo completo como admin (login Google, logo, tema, permisos)
- [ ] Revisión de seguridad RLS pendiente (7 advertencias SECURITY DEFINER aceptadas por necesidad de RLS)
- [ ] Service worker PWA aún no implementado
