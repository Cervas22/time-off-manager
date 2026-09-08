# Time Off Manager

PRD PARA APLICACIÓN — Gestión de Vacaciones, Permisos y Disponibilidad de Personal

1. Rol del Asistente (Meta Prompting)

Eres un desarrollador de software experto de clase mundial en React, TypeScript, Tailwind CSS, Supabase, VITE y en el entorno nativo de Lovable. Tu enfoque debe ser construir la aplicación con la máxima precisión y adherencia estricta a todas las restricciones de diseño y técnicas proporcionadas.

La aplicación deberá priorizar seguridad, claridad de las reglas de negocio, facilidad de uso en dispositivos móviles y trazabilidad de todas las acciones administrativas.

No inventar funcionalidades, reglas, permisos o datos que no estén especificados en este documento.

Cuando una regla legal o política de la empresa sea configurable, no debe quedar rígidamente codificada.

2. Descripción General y Visión

Aplicación web responsive/PWA para gestionar vacaciones, permisos, ausencias y disponibilidad del personal de una empresa.

La aplicación tendrá tres roles principales:

Administrador

Jefe de área

Empleado

Un jefe también puede ser empleado y tener sus propias vacaciones y permisos. Pueden existir múltiples administradores.

El objetivo es que los empleados puedan consultar fácilmente sus vacaciones disponibles y su ciclo vigente, solicitar vacaciones o permisos, y recibir notificaciones sobre el estado de sus solicitudes.

Los administradores podrán administrar empleados, áreas, horarios, ciclos, reglas, solicitudes, pagos programados, documentos, límites de ausencia y auditoría.

Los jefes de área podrán consultar la disponibilidad de su propia área para organizar el trabajo, pero no aprobarán solicitudes.

El sistema deberá manejar las vacaciones tomando como referencia la Ley Federal del Trabajo de México vigente, separando claramente las reglas legales de las políticas internas configurables. La LFT vigente publicada por la Cámara de Diputados contempla, entre otros puntos, un mínimo de 12 días laborables después del primer año, incrementos por antigüedad hasta 20 días y, a partir del sexto año, incrementos de dos días por cada cinco años; además, el artículo 78 establece que deben disfrutarse al menos 12 días de forma continua y el artículo 81 establece que las vacaciones deben concederse dentro de los seis meses siguientes al cumplimiento del año de servicios.

Importante: la aplicación deberá tratar las reglas internas de la empresa, como exigir que un periodo empiece en lunes o no acumular días vencidos, como políticas configurables, no como afirmaciones de que dichas reglas sean exigencias de la LFT.

Objetivo principal (MVP): Entregar una aplicación funcional que permita administrar empleados y sus horarios, calcular automáticamente sus vacaciones por antigüedad, gestionar ciclos, solicitar y aprobar vacaciones y permisos, controlar límites de ausencias por área, administrar fechas de pago, visualizar la disponibilidad mediante un calendario visual, enviar notificaciones internas y conservar historial y auditoría.

3. Stack y Restricciones Técnicas

Frontend: React, TypeScript, utilizando Tailwind CSS para estilos. Diseño: Estrategia Mobile-First con breakpoints estándar de Tailwind y ShadCN.

Backend: Supabase (PostgreSQL), autenticación, almacenamiento.

La aplicación deberá funcionar como web app responsive/PWA, permitiendo su utilización desde:

 Android.

 iPhone.

 PC/laptop.

No desarrollar tres aplicaciones independientes.

Autenticación

Utilizar Supabase Authentication.

Cada empleado será dado de alta por un administrador utilizando el correo proporcionado por el empleado.

El administrador podrá establecer una contraseña inicial sin que dicha contraseña quede posteriormente visible en texto plano para ningún administrador.

El empleado podrá cambiar su contraseña.

Dejar preparada la aplicación para implementar verificación en dos pasos mediante código enviado al correo electrónico.

Seguridad

Implementar roles y permisos mediante Supabase y Row Level Security (RLS).

Un empleado nunca deberá poder acceder a información privada de otro empleado modificando URLs, IDs o parámetros.

Los documentos adjuntos, especialmente comprobantes médicos, deberán tener acceso restringido exclusivamente a administradores.

Zona horaria

Toda la aplicación deberá operar utilizando la zona horaria correspondiente a Matamoros, México, especialmente para:

 Fechas.

 Horarios.

 Permisos por horas.

 Turnos nocturnos.

 Notificaciones.

 Auditoría.

 Aprobaciones.

 Fechas de pago.

4. Arquitectura de Datos y Flujo

Modelos de Datos Clave

Diseñar una estructura relacional en Supabase que contemple como mínimo:

Usuarios / Perfiles

Información de autenticación y perfil:

 ID.

 Nombre.

 Correo.

 Rol.

 Estado activo/inactivo.

 Fecha de creación.

 Fecha de actualización.

Empleados

 ID único de empleado.

 Usuario relacionado.

 Nombre.

 Correo.

 Puesto.

 Área.

 Jefe de área.

 Fecha de ingreso.

 Estado.

 Horario/plantilla asignada.

 Política individual de acumulación.

 Configuraciones individuales necesarias.

El ID único del empleado deberá utilizarse para identificar registros durante importaciones y actualizaciones mediante Excel/TXT.

Áreas

 Nombre.

 Descripción opcional.

 Jefe responsable.

 Límite máximo de ausencias simultáneas.

 Estado.

Horarios / Plantillas de horarios

Permitir:

 Horarios diferentes por día.

 Días laborables.

 Días de descanso.

 Turnos nocturnos.

 Turnos rotativos.

 Descansos.

 Comida opcional.

 Horarios individuales.

Debe ser posible crear plantillas y asignarlas a múltiples empleados.

Tabla de vacaciones por antigüedad

Debe existir una tabla editable desde Configuración.

La configuración inicial deberá reflejar la LFT vigente, pero el administrador podrá modificarla si existe una modificación legal o una política empresarial aplicable.

La estructura debe permitir definir:

 Rango/años de antigüedad.

 Días correspondientes.

 Vigencia de la regla.

 Estado.

 Fecha de aplicación.

No codificar permanentemente los valores legales.

Ciclos de vacaciones

Cada empleado tendrá ciclos independientes.

Registrar:

 Fecha de inicio del ciclo.

 Fecha de finalización del ciclo.

 Fecha de aniversario.

 Antigüedad correspondiente.

 Días asignados.

 Días tomados.

 Días pendientes.

 Días vencidos.

 Política de acumulación.

 Estado.

 Historial.

El empleado verá únicamente su ciclo vigente.

Los administradores podrán consultar todos los ciclos históricos.

Solicitudes

Registrar:

 Empleado.

 Tipo.

 Categoría.

 Modalidad.

 Fecha de inicio.

 Fecha final.

 Horario cuando aplique.

 Cantidad de días.

 Cantidad de horas.

 Motivo.

 Archivo adjunto.

 Estado.

 Administrador que aprobó/rechazó.

 Fecha de solicitud.

 Fecha de resolución.

 Cambios realizados.

 Motivo de excepción cuando aplique.

Periodos de ausencia

Representar las ausencias que deberán aparecer en el calendario.

Permitir:

 Vacaciones.

 Médico.

 Trámite.

 Nuevas categorías configurables.

Pagos de vacaciones

Registrar:

 Ciclo.

 Empleado.

 Fecha de pago programada.

 Estado.

 Solicitud relacionada.

 Fecha de creación.

 Fecha de modificación.

 Administrador responsable.

Un mismo ciclo puede tener varios periodos de vacaciones, pero deberá existir control para evitar duplicar indebidamente una fecha de pago ya programada/autorizada.

Días festivos

Registrar:

 Fecha.

 Nombre.

 Descripción opcional.

 Estado.

Deben poder administrarse desde Configuración.

Notificaciones

Registrar:

 Usuario destinatario.

 Tipo.

 Mensaje.

 Fecha.

 Estado leído/no leído.

 Relación con solicitud cuando corresponda.

Archivos

Utilizar Supabase Storage para:

 Comprobantes médicos.

 Documentos relacionados con permisos.

 Otros archivos permitidos por el administrador.

Los archivos privados no deben ser accesibles públicamente.

Ajustes de saldo

Registrar:

 Empleado.

 Ciclo.

 Cantidad ajustada.

 Tipo de ajuste.

 Motivo obligatorio.

 Administrador responsable.

 Fecha/hora.

 Saldo anterior.

 Saldo posterior.

Nunca eliminar físicamente un ajuste histórico.

Auditoría

Registrar acciones administrativas relevantes:

 Creación.

 Modificación.

 Aprobación.

 Rechazo.

 Cancelación.

 Ajuste de saldo.

 Modificación de fechas.

 Autorización de excepciones.

 Cambios de configuración.

 Cambios de empleados.

 Cambios de horarios.

 Cambios de políticas.

Registrar usuario, fecha/hora, acción y datos relevantes antes/después cuando corresponda.

5. Flujo de Usuario Detallado

Pantallas/Páginas

Acceso

 Inicio de sesión.

 Recuperación/cambio de contraseña.

 Verificación adicional por correo cuando esté habilitada.

Empleado

 Dashboard personal.

 Mis vacaciones.

 Solicitar vacaciones.

 Solicitar permiso.

 Mis solicitudes.

 Calendario de mi área.

 Notificaciones.

 Mi perfil.

 Seguridad/cambio de contraseña.

Jefe de área

 Dashboard.

 Calendario de su área.

 Personal del área.

 Disponibilidad.

 Filtros por fechas.

 Su propio perfil como empleado.

 Sus vacaciones/permisos.

Administrador

 Dashboard administrativo.

 Solicitudes pendientes.

 Empleados.

 Alta/edición de empleado.

 Importación Excel/TXT.

 Áreas.

 Horarios.

 Plantillas de horarios.

 Calendario global.

 Vacaciones/ciclos.

 Pagos programados.

 Permisos.

 Historial.

 Ajustes de saldo.

 Auditoría.

 Configuración.

 Tabla editable de vacaciones por antigüedad.

 Categorías y tipos de permisos.

 Días festivos.

 Límites de ausencia por área.

 Configuración de políticas.

Navegación: flujo de vacaciones

Empleado → Mis vacaciones → Solicitar vacaciones

 Mostrar ciclo vigente.

 Mostrar días asignados.

 Mostrar días tomados.

 Mostrar días disponibles.

 Seleccionar fecha de inicio.

 Validar regla de inicio en lunes.

 Seleccionar cantidad de días laborables.

 Calcular automáticamente fecha final.

 Seleccionar fecha de pago.

 Validar disponibilidad de saldo.

 Validar días laborables.

 Validar festivos/configuración.

 Validar límite del área.

 Validar conflictos.

 Validar fecha de pago.

 Mostrar resumen.

 Enviar solicitud.

 Estado: Pendiente.

 Notificar a administradores.

Aprobación

Administrador → Solicitudes → Solicitud

El administrador podrá:

 Aprobar.

 Rechazar.

 Modificar fechas.

 Modificar cantidad de días.

 Modificar fecha de pago.

 Autorizar una excepción.

 Agregar motivo/comentario administrativo.

Al aprobar:

 Actualizar saldo.

 Registrar periodo de ausencia.

 Registrar fecha de pago.

 Actualizar calendario.

 Registrar auditoría.

 Notificar al empleado.

Flujo de permisos

Empleado → Solicitar permiso

 Seleccionar categoría.

 Seleccionar tipo.

 Seleccionar modalidad.

 Seleccionar fecha.

 Seleccionar horas/duración cuando corresponda.

 Introducir motivo obligatorio.

 Adjuntar documento opcional.

 Validar horario del empleado.

 Validar límite del área cuando corresponda.

 Enviar.

 Administrador recibe notificación.

 Administrador aprueba/rechaza/modifica.

 Empleado recibe notificación.

 Calendario se actualiza si es aprobado.

Estados

Las solicitudes deberán contemplar como mínimo:

 Pendiente.

 Aprobada.

 Rechazada.

 Cancelada.

 Modificada/aprobada cuando sea necesario distinguir una modificación administrativa.

6. Funcionalidades Clave y Orden de Implementación

Implementación en orden: 1) Diseño frontend, 2) Conexión backend, 3) Integraciones/lógica de negocio.

1. Diseño frontend

Construir primero:

 Login.

 Dashboard.

 Navegación por rol.

 Dashboard empleado.

 Dashboard administrador.

 Dashboard jefe.

 Calendario.

 Formularios.

 Tablas.

 Modales.

 Notificaciones.

 Responsive/PWA.

 Componentes de estados vacío/carga/error.

2. Conexión backend

Implementar:

 Supabase Authentication.

 Perfiles.

 Roles.

 Empleados.

 Áreas.

 Horarios.

 Plantillas.

 Ciclos.

 Vacaciones.

 Solicitudes.

 Permisos.

 Calendario.

 Notificaciones.

 Storage.

 Auditoría.

 RLS.

3. Integraciones/lógica de negocio

Cálculo de vacaciones

Calcular automáticamente las vacaciones con base en:

Fecha de ingreso + antigüedad + tabla configurable.

La configuración inicial deberá contemplar la regla vigente de la LFT y permitir modificación administrativa.

Ciclos

Crear automáticamente el ciclo correspondiente al aniversario.

El empleado solamente verá su ciclo vigente.

El administrador podrá consultar el historial.

Días vencidos

La política predeterminada de la empresa será:

No acumular días vencidos.

Sin embargo, debe existir una configuración individual:

Acumular días: Sí/No

Si se desactivan/no se acumulan:

 El saldo pasa a estado vencido/no acumulado.

 El historial permanece.

 No se elimina información.

Si posteriormente un administrador decide respetar días vencidos:

 Realiza un ajuste.

 Debe indicar motivo.

 Se registra administrador.

 Se registra fecha.

 Se registra saldo anterior y posterior.

Solicitud de vacaciones

Por defecto:

 Días completos.

 Días laborables.

 Periodo continuo inicia en lunes.

 El número de días es seleccionable.

 El sistema calcula la fecha final.

 Administrador puede autorizar excepción.

La regla de inicio en lunes es una política interna configurable.

Mínimo de vacaciones continuas

Implementar una validación configurable basada en la regla legal vigente.

La configuración inicial deberá contemplar el mínimo de 12 días continuos previsto actualmente por el artículo 78, pero la lógica debe permitir modificaciones futuras.

Permisos descontados de vacaciones

Permitir permisos de:

 1 día.

 2 días.

 3 días.

Estos se descontarán del saldo de vacaciones cuando el tipo correspondiente esté configurado para hacerlo.

La empresa considera que más de 3 días debería manejarse como vacaciones, por lo que el sistema deberá poder aplicar esta política.

Permisos por horas

Permitir seleccionar:

 Fecha.

 Hora inicial.

 Hora final.

Ejemplo:

08:30 → 10:00

El sistema deberá validar el horario laboral del empleado.

Entrada tardía

Permitir:

 Fecha.

 Hora prevista de entrada.

 Hora autorizada de entrada.

 Motivo.

Salida anticipada

Permitir:

 Fecha.

 Hora normal de salida.

 Hora autorizada de salida.

 Motivo.

Documentos

Permitir adjuntar fotografías/PDF u otros formatos definidos para comprobar permisos.

Los administradores podrán ver los archivos.

Los empleados y jefes no podrán acceder a documentos privados de otros empleados.

Categorías configurables

El administrador podrá crear, editar, activar/desactivar:

 Categorías.

 Tipos.

 Modalidades.

 Colores del calendario.

 Si descuentan vacaciones o no.

 Si requieren documento.

 Si permiten días.

 Si permiten horas.

Categorías iniciales:

VACACIONES

MÉDICO

TRÁMITE

Importación Excel/TXT

El administrador podrá:

 Descargar plantilla.

 Importar nuevos empleados.

 Actualizar empleados existentes.

 Validar información.

 Detectar duplicados.

 Detectar errores.

 Previsualizar cambios.

 Confirmar importación.

Identificar empleados existentes mediante ID único de empleado.

Mostrar resumen antes de aplicar:

 Nuevos.

 Actualizados.

 Sin cambios.

 Errores.

Calendario

Crear calendario visual tipo cuadrícula mensual, inspirado en el formato proporcionado por el usuario.

Cada día debe mostrar visualmente las ausencias correspondientes.

Debe existir:

 Mensual.

 Anual.

 Mes anterior.

 Mes siguiente.

 Ir a hoy.

 Filtro por área.

 Filtro por empleado.

 Filtro por categoría.

 Filtro por estado.

El calendario deberá priorizar la visualización de:

Ocupado vs. libre.

Las ausencias podrán extenderse visualmente sobre varios días cuando correspondan a un mismo periodo.

Capacidad por área

Cada área tendrá un límite configurable de personas ausentes simultáneamente.

Las solicitudes aprobadas ocupan capacidad.

Las solicitudes pendientes no ocupan oficialmente capacidad, pero deben generar advertencias de posible conflicto.

Cuando el límite esté alcanzado:

 No permitir una nueva solicitud que exceda la capacidad.

 No permitir aprobar una solicitud que exceda la capacidad.

 Mostrar quiénes están ocupando la capacidad.

 Permitir que el administrador cambie fechas, cancele/modifique una ausencia o gestione la excepción según la política configurada.

Fecha de pago

La empresa podrá establecer:

Viernes como día predeterminado de pago.

Existirá una configuración para desactivar esta regla y permitir otras fechas.

Cada ciclo podrá tener varios periodos de vacaciones, pero el sistema deberá controlar la fecha de pago programada correspondiente al ciclo y evitar duplicidades/conflictos.

Si la fecha seleccionada ya está ocupada por un pago de vacaciones programado/autorizado, el empleado deberá recibir un mensaje de error y seleccionar otra fecha.

El administrador podrá modificar la fecha antes de aprobar, de acuerdo con lo definido.

Notificaciones

Implementar notificaciones internas para:

 Nueva solicitud.

 Solicitud aprobada.

 Solicitud rechazada.

 Solicitud modificada.

 Cambio administrativo.

 Recordatorios relevantes.

 Alertas de capacidad.

 Fechas importantes.

No incluir WhatsApp en el MVP.

7. Integraciones y Lógica Externa

Supabase

Utilizar Supabase para:

 PostgreSQL.

 Authentication.

 Storage.

 RLS.

 Funciones/lógica backend cuando sea necesario.

PWA

La aplicación deberá poder instalarse desde el navegador en dispositivos compatibles y funcionar como aplicación web móvil.

Verificación en dos pasos

Preparar la arquitectura para verificación adicional mediante código enviado al correo electrónico.

Notificaciones

En el MVP utilizar notificaciones internas de la aplicación.

No integrar WhatsApp inicialmente.

Edge Functions

Utilizar Edge Functions únicamente cuando aporten valor para:

 Procesamiento seguro.

 Automatizaciones.

 Notificaciones.

 Cálculos que deban ejecutarse de manera controlada.

 Procesamiento de importaciones.

 Operaciones que no deban depender exclusivamente del frontend.

Integraciones externas

No utilizar Stripe, OpenAI, Make, n8n u otras APIs externas en el MVP.

8. Lineamientos de Diseño UI/UX

Estilo general

Interfaz:

 Profesional.

 Moderna.

 Limpia.

 Corporativa.

 Fácil de utilizar.

 Mobile-First.

Colores

Color principal:

Azul marino

Base:

Blanco

Elementos importantes, errores y alertas:

Rojo

Evitar exceso de colores.

Calendario

El calendario será una de las piezas visuales principales.

Debe transmitir inmediatamente:

Qué días están ocupados y cuáles están libres.

Inspirarse funcionalmente en el calendario proporcionado por el usuario, con:

 Columnas por día.

 Filas/espacios de ausencias.

 Bloques de colores.

 Nombres visibles.

 Periodos fácilmente identificables.

 Navegación mensual.

 Vista anual.

No replicar literalmente el aspecto de Excel.

Colores de categorías

Propuesta inicial:

 VACACIONES: azul.

 MÉDICO: rojo.

 TRÁMITE: verde.

Los colores deberán ser configurables por el administrador para categorías nuevas.

Dashboard empleado

Debe ser simple y móvil.

Mostrar prioritariamente:

 Días disponibles.

 Días tomados.

 Ciclo vigente.

 Fecha relevante del ciclo.

 Próximas vacaciones.

 Solicitudes pendientes.

 Acciones principales.

Botones principales:

Solicitar vacaciones

Solicitar permiso

Ver calendario

Mis solicitudes

Dashboard administrador

Mostrar información resumida:

 Solicitudes pendientes.

 Vacaciones actuales.

 Permisos actuales.

 Áreas con alta ausencia.

 Próximos pagos.

 Alertas.

 Actividad reciente.

No saturar con información.

Tabla administrativa

Permitir búsqueda, filtros y ordenamiento.

Información principal:

 Empleado.

 Área.

 Fecha de ingreso.

 Antigüedad.

 Ciclo actual.

 Días asignados.

 Días tomados.

 Días pendientes.

 Fecha de pago cuando corresponda.

El historial detallado debe abrirse bajo demanda.

Responsive

La aplicación deberá adaptarse correctamente a:

 Teléfonos.

 Tablets.

 Laptops.

 Monitores de escritorio.

En celular, priorizar navegación sencilla y botones grandes.

En escritorio, aprovechar mayor espacio para tablas, calendario y administración.

Estados UI

Todas las pantallas relevantes deberán contemplar:

 Loading.

 Empty state.

 Error.

 Éxito.

 Confirmaciones.

 Validaciones.

 Mensajes claros.

9. Alcance del Proyecto (Scope)

Incluido:

 Aplicación web responsive/PWA.

 Uso desde Android.

 Uso desde iPhone.

 Uso desde PC.

 Autenticación.

 Roles Administrador, Jefe y Empleado.

 Múltiples administradores.

 Jefe que también puede ser empleado.

 Gestión de empleados.

 Importación Excel.

 Importación TXT.

 Actualización masiva mediante Excel/TXT.

 Áreas.

 Jefes de área.

 Horarios.

 Plantillas de horarios.

 Días laborables individuales.

 Turnos nocturnos.

 Turnos rotativos.

 Descansos/comida opcionales.

 Cálculo de vacaciones por antigüedad.

 Tabla de vacaciones editable.

 Ciclos de vacaciones.

 Historial de ciclos.

 Días asignados.

 Días tomados.

 Días pendientes.

 Días vencidos.

 Política individual de acumulación.

 Ajustes manuales de saldo.

 Auditoría.

 Solicitudes de vacaciones.

 Vacaciones por días completos.

 Regla configurable de inicio en lunes.

 Excepciones administrativas.

 Validación de mínimo continuo configurable.

 Permisos de hasta 3 días descontados de vacaciones.

 Permisos por horas.

 Entrada tardía.

 Salida anticipada.

 Categorías configurables.

 Tipos configurables.

 Motivo obligatorio.

 Documentos adjuntos.

 Documentos privados para administradores.

 Calendario mensual.

 Calendario anual.

 Calendario por área.

 Calendario global para administradores.

 Vista de calendario con información limitada para empleados.

 Filtros.

 Control de capacidad por área.

 Bloqueo por límite de ausencias.

 Fecha de pago de vacaciones.

 Viernes como configuración predeterminada.

 Posibilidad de desactivar regla de viernes.

 Control de conflictos de fechas de pago.

 Notificaciones internas.

 Historial.

 Auditoría.

 Supabase Authentication.

 Supabase PostgreSQL.

 Supabase Storage.

 RLS.

 Preparación para 2FA mediante correo.

 Zona horaria de Matamoros, México.

 Diseño azul marino/blanco/rojo.

 Mobile-First.

 ShadCN.

 React.

 TypeScript.

 Tailwind CSS.

 VITE.

Excluido:

 WhatsApp.

 Integración con WhatsApp Business.

 Nómina.

 Cálculo del monto monetario de vacaciones.

 Cálculo del monto de prima vacacional.

 Reloj checador.

 Control biométrico.

 GPS.

 Geolocalización.

 Sistema completo de recursos humanos.

 Evaluaciones de empleados.

 Chat interno.

 Portal para clientes.

 Stripe.

 OpenAI.

 Make.

 n8n.

 Integraciones externas no especificadas.

 Panel de administración separado como aplicación independiente.

Las reglas legales deberán mantenerse configurables y revisables. El sistema no deberá presentar una política interna como si fuera una obligación legal. La configuración inicial de vacaciones deberá basarse en la LFT vigente y conservar la posibilidad de actualización ante cambios normativos.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4b79c2a9-d8a2-4f27-ba51-c2125ecee2f0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
