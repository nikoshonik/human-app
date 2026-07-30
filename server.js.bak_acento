// ─────────────────────────────────────────
//  Human App — Backend API
//  Node.js + Express · Deploy en Railway
//  Auth: Supabase JWT (verificado en cada request)
// ─────────────────────────────────────────
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// La anon key es pública por diseño (Supabase la documenta así y va embebida
// en cualquier cliente JS). Hardcoded como fallback para no depender de la
// env var en Railway. Si se rota, se sobreescribe con la env var.
const SUPABASE_ANON_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZ2RlY3R0emVkZHlla3RkZ2ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MDk2OTUsImV4cCI6MjA5ODk4NTY5NX0.vJU2icKww16eA4QOKcNhQ40RnKsnHoLw5qK4qZiQ6Ek'

const SUPABASE_URL  = process.env.SUPABASE_URL || 'https://urgdecttzeddyektdgfs.supabase.co'
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY
const ANON_KEY      = process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('❌ Falta SUPABASE_URL / SUPABASE_SERVICE_KEY / SUPABASE_ANON_KEY en .env')
  console.error('   El backend arranca igualmente, pero requireAuth fallará.')
}

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.options('*', cors({ origin: true, credentials: true }))
app.use(express.json())

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// supabaseAdmin → solo para tareas que requieren bypass de RLS
// (background jobs internos como updateJarvisMemory / generateAndSaveDailyPlan)
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)

// Health check (público)
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Human App API' }))

// ─────────────────────────────────────────
// Páginas legales públicas (Términos / Privacidad / EULA)
// Embebidas como strings para que viajen con server.js en el deploy.
// ─────────────────────────────────────────
const LEGAL_TERMINOS = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Términos y Condiciones de Uso · Human App</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:#000; color:#e8e8ea; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; line-height:1.6; }
  .wrap { max-width:760px; margin:0 auto; padding:48px 22px 80px; }
  .brand { font-size:13px; letter-spacing:6px; text-transform:uppercase; color:#3B82F6; font-weight:600; margin-bottom:28px; }
  h1 { font-size:26px; font-weight:700; line-height:1.2; margin:0 0 6px; }
  h2 { font-size:16px; font-weight:700; color:#fff; margin:30px 0 8px; }
  p { margin:0 0 12px; color:#c7c7cc; font-size:15px; }
  .upd { color:#777; font-size:13px; margin-bottom:8px; }
  a { color:#3B82F6; }
  .foot { margin-top:48px; padding-top:20px; border-top:1px solid #1c1c1c; color:#666; font-size:12px; }
  .foot a { color:#888; }
</style>
</head>
<body>
<div class="wrap">
<div class="brand">HUMAN</div>
<h1>Términos y Condiciones de Uso</h1>
<p class="upd">Última actualización: 28 de mayo de 2026</p>
<h2>1. IDENTIFICACIÓN DEL TITULAR Y OBJETO</h2>
<p>Los presentes Términos y Condiciones de Uso (en adelante, &quot;los Términos&quot;) regulan el acceso y uso de la aplicación móvil Human App (en adelante, &quot;la Aplicación&quot;), titularidad de HORISCHNIK SL, sociedad con domicilio en Calle de Alfonso XII, 62, 2ª planta, 28014, Madrid, España, con correo electrónico de contacto info@humanapp.es.</p>
<p>Mediante el acceso y uso de la Aplicación, el usuario (en adelante, &quot;el Usuario&quot;) acepta quedar vinculado por los presentes Términos. Si no acepta estos Términos, deberá abstenerse de utilizar la Aplicación.</p>
<p>Human App es una plataforma de tecnología orientada al seguimiento del rendimiento y la recuperación física y mental, mediante test diarios, análisis de datos de bienestar y un asistente de inteligencia artificial personalizable. La Aplicación no constituye en ningún caso un dispositivo sanitario, servicio médico ni herramienta de diagnóstico clínico.</p>
<h2>2. CAPACIDAD Y ACEPTACIÓN</h2>
<p>Para utilizar Human App deberás:</p>
<p>Tener al menos 16 años de edad.</p>
<p>Tener capacidad legal para contratar según la legislación aplicable.</p>
<p>Aceptar expresamente estos Términos y la Política de Privacidad durante el proceso de registro.</p>
<p>Al crear una cuenta, declaras y garantizas que la información que proporcionas es veraz, exacta, actual y completa.</p>
<h2>3. REGISTRO Y CUENTA DE USUARIO</h2>
<h2>3.1 Creación de cuenta</h2>
<p>El acceso a las funcionalidades de Human App requiere la creación de una cuenta personal. El Usuario puede registrarse mediante correo electrónico y contraseña, o a través de los sistemas de autenticación de Apple (Sign in with Apple) o Google.</p>
<h2>3.2 Seguridad de la cuenta</h2>
<p>El Usuario es responsable de mantener la confidencialidad de sus credenciales de acceso y de todas las actividades que se realicen bajo su cuenta. Deberá notificar inmediatamente a HORISCHNIK SL cualquier uso no autorizado de su cuenta o cualquier otra brecha de seguridad en la dirección info@humanapp.es.</p>
<h2>3.3 Exactitud de la información</h2>
<p>El Usuario se compromete a mantener actualizada la información de su perfil. HORISCHNIK SL no será responsable de los perjuicios derivados de la inexactitud de los datos proporcionados por el Usuario.</p>
<h2>4. PLANES Y PRECIOS</h2>
<h2>4.1 Plan gratuito</h2>
<p>Human App ofrece un acceso gratuito con funcionalidades limitadas que no requiere suscripción de pago.</p>
<h2>4.2 Plan Premium</h2>
<p>El acceso completo a las funcionalidades avanzadas de Human App requiere la contratación de una suscripción de pago. Los precios vigentes son:</p>
<p>Suscripción mensual: 9,99 € / mes (IVA incluido).</p>
<p>Suscripción anual: 29,99 € / año (IVA incluido). Equivale a 2.50 €/mes, lo que supone un ahorro aproximado del 75% respecto al plan mensual.</p>
<h2>4.3 Proceso de pago y facturación</h2>
<p>Los pagos se procesan exclusivamente a través de Apple App Store (iOS) o Google Play Store (Android), según la plataforma del Usuario. HORISCHNIK SL no tiene acceso ni almacena datos de pago o tarjeta de crédito del Usuario.</p>
<p>La suscripción se renueva automáticamente al término de cada período (mensual o anual) salvo que el Usuario la cancele al menos 24 horas antes del fin del período en curso.</p>
<h2>4.4 Modificación de precios</h2>
<p>HORISCHNIK SL se reserva el derecho de modificar los precios de las suscripciones con un preaviso mínimo de 30 días. Los nuevos precios se aplicarán en el siguiente ciclo de renovación tras la notificación al Usuario.</p>
<h2>4.5 Política de reembolso y derecho de desistimiento</h2>
<p>Los usuarios con residencia en la Unión Europea disponen de un plazo de 14 días naturales desde la contratación de la suscripción para ejercer el derecho de desistimiento, conforme al Real Decreto Legislativo 1/2007. Para ello, deberán contactar con info@humanapp.es.</p>
<p>Las solicitudes de reembolso por períodos ya disfrutados serán gestionadas conforme a las políticas de la plataforma de compra (Apple App Store o Google Play Store), sobre las que HORISCHNIK SL no tiene control directo.</p>
<h2>5. DESCRIPCIÓN DEL SERVICIO Y LIMITACIONES</h2>
<h2>5.1 Naturaleza del servicio</h2>
<p>Human App proporciona:</p>
<p>Test diarios de bienestar (sueño, estrés, nutrición y deporte) para registrar y monitorizar tu estado físico y mental.</p>
<p>Un análisis de recuperación basado en tus datos introducidos (Body Battery y métricas derivadas).</p>
<p>Un asistente de inteligencia artificial (Jarvis) que genera planes y recomendaciones personalizadas basadas en tu perfil y datos.</p>
<p>Métricas de progreso e historial de datos de bienestar.</p>
<h2>5.2 Aviso de salud importante</h2>
<p>Human App NO es un producto sanitario ni un dispositivo médico según la Directiva 93/42/CEE ni el Reglamento (UE) 2017/745. Las recomendaciones del asistente de IA son de carácter informativo y orientativo, y NO sustituyen en ningún caso el consejo, diagnóstico o tratamiento de un profesional sanitario cualificado.</p>
<p>El Usuario es el único responsable de las decisiones que tome en relación con su salud y bienestar. HORISCHNIK SL no será responsable de las consecuencias derivadas del uso de las recomendaciones de la Aplicación como sustituto del consejo médico profesional.</p>
<h2>5.3 Disponibilidad del servicio</h2>
<p>HORISCHNIK SL realizará esfuerzos razonables para mantener la Aplicación disponible de forma continua, pero no garantiza una disponibilidad del 100%. El servicio puede experimentar interrupciones por mantenimiento, actualizaciones técnicas o causas de fuerza mayor. HORISCHNIK SL notificará, en la medida de lo posible, las interrupciones programadas con antelación suficiente.</p>
<h2>6. OBLIGACIONES Y CONDUCTA DEL USUARIO</h2>
<p>El Usuario se compromete a:</p>
<p>Usar la Aplicación conforme a estos Términos, a la ley y a las buenas costumbres.</p>
<p>No proporcionar información falsa, engañosa o fraudulenta.</p>
<p>No utilizar la Aplicación para fines ilegales o no autorizados.</p>
<p>No intentar acceder a sistemas, datos o áreas restringidas de la Aplicación o de la infraestructura tecnológica de HORISCHNIK SL.</p>
<p>No realizar ingeniería inversa, descompilar ni intentar obtener el código fuente de la Aplicación.</p>
<p>No transmitir virus, malware ni cualquier otro código de naturaleza destructiva.</p>
<p>No usar la Aplicación para acosar, amenazar o perjudicar a terceros.</p>
<p>No compartir, revender ni ceder a terceros el acceso a su cuenta.</p>
<h2>7. PROPIEDAD INTELECTUAL E INDUSTRIAL</h2>
<p>Todos los contenidos de Human App, incluyendo pero no limitándose al diseño, código fuente, gráficos, logotipos, iconos, textos, imágenes y software, son propiedad exclusiva de HORISCHNIK SL o de sus licenciantes, y están protegidos por las leyes de propiedad intelectual e industrial aplicables.</p>
<p>Se otorga al Usuario una licencia personal, no exclusiva, intransferible, revocable y limitada para acceder y usar la Aplicación únicamente para fines personales y no comerciales, de acuerdo con estos Términos.</p>
<p>Queda expresamente prohibida la reproducción, distribución, comunicación pública, transformación, o cualquier otra forma de explotación de los contenidos de la Aplicación sin autorización escrita previa de HORISCHNIK SL.</p>
<h2>8. CONTENIDOS GENERADOS POR EL USUARIO</h2>
<p>Los datos y contenidos que el Usuario introduce en la Aplicación (respuestas a test, mensajes al asistente, información de perfil) son de su propiedad. Al introducirlos, el Usuario otorga a HORISCHNIK SL una licencia limitada para procesarlos con el único fin de prestar el servicio contratado.</p>
<p>HORISCHNIK SL no utiliza el contenido individual de las conversaciones con el asistente para entrenar modelos de inteligencia artificial propios ni para fines publicitarios.</p>
<h2>9. EXCLUSIÓN DE GARANTÍAS Y LIMITACIÓN DE RESPONSABILIDAD</h2>
<p>En la máxima medida permitida por la legislación aplicable:</p>
<p>La Aplicación se proporciona &quot;tal cual&quot; y &quot;según disponibilidad&quot;, sin garantías de ningún tipo, expresas o implícitas.</p>
<p>HORISCHNIK SL no garantiza que la Aplicación sea libre de errores, interrupciones o que los resultados de su uso sean precisos o fiables.</p>
<p>HORISCHNIK SL no será responsable por daños indirectos, incidentales, especiales, consecuentes o punitivos derivados del uso o imposibilidad de uso de la Aplicación.</p>
<p>La responsabilidad total de HORISCHNIK SL frente al Usuario, en cualquier caso, se limitará al importe pagado por el Usuario en los últimos 12 meses.</p>
<p>Nada en estos Términos excluirá o limitará la responsabilidad de HORISCHNIK SL por muerte o lesiones personales causadas por negligencia, fraude o dolo, ni ninguna otra responsabilidad que no pueda excluirse conforme a la legislación española o de la UE.</p>
<h2>10. MODIFICACIONES DEL SERVICIO Y LOS TÉRMINOS</h2>
<p>HORISCHNIK SL se reserva el derecho de modificar, suspender o interrumpir cualquier aspecto del servicio en cualquier momento. Los cambios materiales en estos Términos serán notificados al Usuario con al menos 30 días de antelación mediante notificación en la Aplicación o correo electrónico.</p>
<p>El uso continuado de la Aplicación tras la entrada en vigor de los nuevos Términos constituirá la aceptación de los mismos. Si el Usuario no acepta los nuevos Términos, deberá cancelar su cuenta antes de la fecha de entrada en vigor.</p>
<h2>11. SUSPENSIÓN Y CANCELACIÓN DE CUENTA</h2>
<h2>11.1 Cancelación por el Usuario</h2>
<p>El Usuario puede cancelar su cuenta en cualquier momento desde Ajustes → Perfil → Eliminar cuenta dentro de la Aplicación, o enviando una solicitud a info@humanapp.es. La cancelación de la suscripción se gestiona a través de la plataforma de compra (App Store o Google Play).</p>
<h2>11.2 Suspensión por HORISCHNIK SL</h2>
<p>HORISCHNIK SL podrá suspender o cancelar el acceso del Usuario a la Aplicación, con o sin previo aviso, si el Usuario incumple estos Términos, comete fraude, abusa del servicio o por decisión judicial o requerimiento de autoridad competente.</p>
<h2>12. LEY APLICABLE Y JURISDICCIÓN</h2>
<p>Los presentes Términos se rigen por la legislación española. Para la resolución de cualquier controversia derivada de la interpretación, cumplimiento o ejecución de estos Términos, las partes, con renuncia a cualquier otro fuero que pudiera corresponderles, se someten a los Juzgados y Tribunales de la ciudad de Madrid.</p>
<p>Sin perjuicio de lo anterior, si el Usuario tiene la condición de consumidor conforme a la normativa de la UE, podrá acudir a los tribunales competentes según su lugar de residencia habitual. La Comisión Europea pone a disposición una plataforma de resolución de litigios en línea: https://ec.europa.eu/consumers/odr/</p>
<h2>13. CONTACTO</h2>
<h2>HORISCHNIK SL</h2>
<p>Calle de Alfonso XII, 62, 2ª planta, 28014, Madrid, España</p>
<p>Correo electrónico: info@humanapp.es</p>
<p>Aplicación: Human App → Ajustes → Contacto</p>
<div class="foot">
  HORISCHNIK SL · Calle de Alfonso XII, 62, 2ª planta, 28014 Madrid · info@humanapp.es<br>
  <a href="/terminos">Términos</a> · <a href="/privacidad">Privacidad</a> · <a href="/eula">EULA</a>
</div>
</div>
</body>
</html>
`
const LEGAL_PRIVACIDAD = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Política de Privacidad · Human App</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:#000; color:#e8e8ea; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; line-height:1.6; }
  .wrap { max-width:760px; margin:0 auto; padding:48px 22px 80px; }
  .brand { font-size:13px; letter-spacing:6px; text-transform:uppercase; color:#3B82F6; font-weight:600; margin-bottom:28px; }
  h1 { font-size:26px; font-weight:700; line-height:1.2; margin:0 0 6px; }
  h2 { font-size:16px; font-weight:700; color:#fff; margin:30px 0 8px; }
  p { margin:0 0 12px; color:#c7c7cc; font-size:15px; }
  .upd { color:#777; font-size:13px; margin-bottom:8px; }
  a { color:#3B82F6; }
  .foot { margin-top:48px; padding-top:20px; border-top:1px solid #1c1c1c; color:#666; font-size:12px; }
  .foot a { color:#888; }
</style>
</head>
<body>
<div class="wrap">
<div class="brand">HUMAN</div>
<h1>Política de Privacidad</h1>
<p class="upd">Última actualización: 28 de mayo de 2026</p>
<h2>1. RESPONSABLE DEL TRATAMIENTO</h2>
<p>En cumplimiento del Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016 (RGPD), y de la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), se informa que el responsable del tratamiento de los datos personales recabados a través de la aplicación móvil Human App es:</p>
<p>Denominación social: HORISCHNIK SL</p>
<p>Domicilio social: Calle de Alfonso XII, 62, 2ª planta, 28014, Madrid, España</p>
<p>Correo electrónico de contacto: info@humanapp.es</p>
<p>Actividad: Desarrollo y comercialización de aplicaciones de tecnología de salud y rendimiento personal.</p>
<h2>2. DATOS PERSONALES QUE RECABAMOS</h2>
<h2>2.1 Datos de registro y cuenta</h2>
<p>Nombre y apellidos</p>
<p>Dirección de correo electrónico</p>
<p>Contraseña (almacenada en formato cifrado, nunca en texto plano)</p>
<p>Fecha de registro y última sesión activa</p>
<h2>2.2 Datos del perfil de salud y rendimiento</h2>
<p>Durante el proceso de incorporación (onboarding) y uso continuado de la aplicación, recabamos datos relativos a tu salud y bienestar físico. Estos datos constituyen datos de categoría especial conforme al artículo 9 del RGPD y requieren tu consentimiento explícito:</p>
<p>Edad y sexo biológico</p>
<p>Tipo de identidad personal y objetivos de rendimiento</p>
<p>Síntomas de salud reportados por el usuario</p>
<p>Calidad y horas de sueño (test diario)</p>
<p>Nivel y pico de estrés percibido (test diario)</p>
<p>Calidad nutricional y número de comidas (test diario)</p>
<p>Intensidad y duración de actividad deportiva (test diario)</p>
<h2>2.3 Datos de interacción con el asistente de IA</h2>
<p>Mensajes de texto enviados al asistente virtual (Jarvis)</p>
<p>Respuestas generadas por el sistema de inteligencia artificial</p>
<p>Historial de conversaciones vinculado a tu cuenta</p>
<h2>2.4 Datos técnicos</h2>
<p>Identificadores de dispositivo y sistema operativo</p>
<p>Versión de la aplicación instalada</p>
<p>Datos de uso y navegación dentro de la aplicación (pantallas visitadas, funcionalidades utilizadas)</p>
<p>Dirección IP y datos de conexión</p>
<h2>3. FINALIDAD Y BASE JURÍDICA DEL TRATAMIENTO</h2>
<p>Tratamos tus datos personales para las siguientes finalidades:</p>
<h2>3.1 Prestación del servicio contratado</h2>
<p>Base jurídica: Ejecución del contrato (Art. 6.1.b RGPD). Tratamos tus datos para crear y gestionar tu cuenta, personalizar el asistente de IA según tu perfil, generar análisis de recuperación y rendimiento, y proporcionarte el plan diario personalizado.</p>
<h2>3.2 Tratamiento de datos de salud</h2>
<p>Base jurídica: Consentimiento explícito del interesado (Art. 9.2.a RGPD). Los datos relativos a tu sueño, estrés, nutrición y actividad física son datos de categoría especial. Únicamente los tratamos con tu consentimiento expreso, otorgado en el momento del registro y que puedes revocar en cualquier momento.</p>
<h2>3.3 Gestión de suscripciones y pagos</h2>
<p>Base jurídica: Ejecución del contrato (Art. 6.1.b RGPD). Tratamos los datos necesarios para gestionar tu suscripción (mensual a 9,99 € o anual a 29,99 €), procesar pagos a través de Apple App Store o Google Play Store, y emitir facturas o justificantes de pago.</p>
<h2>3.4 Mejora del servicio e investigación</h2>
<p>Base jurídica: Interés legítimo (Art. 6.1.f RGPD). Utilizamos datos anonimizados y agregados para mejorar los algoritmos de recomendación, la experiencia de usuario y el rendimiento técnico de la aplicación. Nunca utilizamos datos identificables para esta finalidad.</p>
<h2>3.5 Comunicaciones comerciales</h2>
<p>Base jurídica: Consentimiento (Art. 6.1.a RGPD). Si has aceptado recibir comunicaciones, podremos enviarte información sobre nuevas funcionalidades, consejos de rendimiento y promociones. Puedes retirar este consentimiento en cualquier momento desde los ajustes de la aplicación.</p>
<h2>3.6 Cumplimiento de obligaciones legales</h2>
<p>Base jurídica: Obligación legal (Art. 6.1.c RGPD). Conservamos determinados datos para cumplir con obligaciones fiscales, mercantiles y de otro tipo impuestas por la legislación española y europea.</p>
<h2>4. DESTINATARIOS Y TRANSFERENCIAS INTERNACIONALES</h2>
<p>Tus datos pueden ser comunicados a los siguientes encargados del tratamiento, con los que hemos suscrito los contratos de tratamiento de datos exigidos por el RGPD:</p>
<h2>4.1 Encargados de tratamiento en la UE</h2>
<p>Supabase Inc. (almacenamiento de base de datos) — Infraestructura alojada en EU-West (Irlanda), dentro del Espacio Económico Europeo.</p>
<h2>4.2 Transferencias internacionales a terceros países</h2>
<p>Los siguientes proveedores están establecidos en Estados Unidos. Las transferencias se amparan en las Cláusulas Contractuales Tipo adoptadas por la Comisión Europea o en el mecanismo EU-US Data Privacy Framework, según corresponda:</p>
<p>Anthropic PBC (proveedor de la API de inteligencia artificial Claude) — Los mensajes del asistente son procesados en servidores de Anthropic para generar respuestas. Anthropic aplica políticas de privacidad y seguridad conformes con los estándares internacionales.</p>
<p>Railway Inc. (alojamiento del servidor backend) — Gestiona las peticiones técnicas entre la aplicación y la base de datos.</p>
<p>Para cualquier información sobre las garantías aplicadas a las transferencias internacionales, puedes contactarnos en: info@humanapp.es</p>
<h2>4.3 Apple Inc. y Google LLC</h2>
<p>Las compras y suscripciones realizadas a través de App Store (Apple) o Google Play (Google) son procesadas directamente por dichas plataformas, quienes actúan como responsables independientes del tratamiento de los datos de pago. Human App no tiene acceso a tus datos bancarios o de tarjeta de crédito.</p>
<h2>5. PLAZO DE CONSERVACIÓN DE LOS DATOS</h2>
<p>Datos de cuenta y perfil: mientras mantengas una cuenta activa, y durante 5 años adicionales tras la baja, salvo que ejercites el derecho de supresión.</p>
<p>Datos de salud (categoría especial): durante la vigencia del contrato. Podrás solicitar su eliminación en cualquier momento sin que ello afecte a los datos no sensibles de tu cuenta.</p>
<p>Historial de conversaciones con Jarvis: durante 12 meses desde su generación, renovable si la cuenta permanece activa.</p>
<p>Datos de facturación: 6 años conforme a la Ley General Tributaria.</p>
<p>Logs técnicos y de acceso: máximo 12 meses.</p>
<p>Transcurridos los plazos indicados, los datos serán eliminados o anonimizados de forma segura.</p>
<h2>6. DERECHOS DE LOS INTERESADOS</h2>
<p>De acuerdo con el RGPD y la LOPDGDD, tienes derecho a:</p>
<p>Acceso: obtener confirmación de si tratamos tus datos y acceder a los mismos.</p>
<p>Rectificación: solicitar la corrección de datos inexactos o incompletos.</p>
<p>Supresión (&quot;derecho al olvido&quot;): solicitar la eliminación de tus datos cuando, entre otros casos, ya no sean necesarios para los fines que motivaron su recogida.</p>
<p>Limitación del tratamiento: solicitar la suspensión del tratamiento en determinadas circunstancias.</p>
<p>Portabilidad: recibir tus datos en formato estructurado, de uso común y lectura mecánica, y transmitirlos a otro responsable.</p>
<p>Oposición: oponerte al tratamiento de tus datos, incluido el tratamiento para fines de marketing directo.</p>
<p>Retirada del consentimiento: en cualquier momento, sin que ello afecte a la licitud del tratamiento previo al consentimiento.</p>
<p>No ser objeto de decisiones automatizadas: no ser objeto de decisiones basadas únicamente en el tratamiento automatizado, incluida la elaboración de perfiles, que produzcan efectos jurídicos o te afecten significativamente.</p>
<p>Para ejercer cualquiera de estos derechos, puedes hacerlo a través de:</p>
<p>Correo electrónico: info@humanapp.es (indicando &quot;Ejercicio de derechos RGPD&quot; en el asunto)</p>
<p>Sección &quot;Privacidad&quot; en los ajustes de la aplicación</p>
<p>Responderemos en un plazo máximo de 30 días naturales. Si considerás que el tratamiento de tus datos vulnera la normativa, tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD), www.aepd.es.</p>
<h2>7. ELIMINACIÓN DE CUENTA Y DATOS</h2>
<p>Puedes solicitar la eliminación completa de tu cuenta y todos tus datos personales en cualquier momento a través de:</p>
<p>La opción &quot;Eliminar cuenta&quot; disponible en Ajustes → Perfil → Privacidad dentro de la aplicación.</p>
<p>Enviando una solicitud a info@humanapp.es</p>
<p>La eliminación se procesará en un plazo máximo de 30 días. Los datos de facturación se conservarán durante el período legalmente exigido (6 años) aunque se procederá a la eliminación del resto de datos personales.</p>
<h2>8. MENORES DE EDAD</h2>
<p>Human App está dirigida a usuarios de 16 años o más. No recabamos conscientemente datos personales de menores de 16 años. Si eres padre, madre o tutor legal y crees que tu hijo/a menor de 16 años ha proporcionado datos personales a través de nuestra aplicación, te rogamos nos contactes de inmediato en info@humanapp.es para proceder a su eliminación.</p>
<p>Para usuarios de entre 16 y 18 años, recomendamos que informen a sus padres o tutores legales sobre el uso de la aplicación y el tratamiento de sus datos de salud.</p>
<h2>9. SEGURIDAD DE LOS DATOS</h2>
<p>HORISCHNIK SL aplica medidas técnicas y organizativas adecuadas para garantizar un nivel de seguridad apropiado al riesgo, incluyendo:</p>
<p>Cifrado de contraseñas mediante algoritmos de hashing seguros (bcrypt).</p>
<p>Transmisión de datos mediante protocolos seguros (HTTPS/TLS).</p>
<p>Acceso restringido a datos de salud mediante políticas de Row Level Security (RLS) en la base de datos.</p>
<p>Revisiones periódicas de seguridad de la infraestructura.</p>
<p>Formación del personal en materia de protección de datos.</p>
<p>En caso de producirse una violación de seguridad que pueda suponer un alto riesgo para tus derechos y libertades, te notificaremos sin dilación indebida, conforme a lo establecido en el Art. 34 del RGPD.</p>
<h2>10. COOKIES Y TECNOLOGÍAS SIMILARES</h2>
<p>Human App es una aplicación móvil nativa y no utiliza cookies de seguimiento en el sentido tradicional. Podemos utilizar identificadores técnicos de sesión estrictamente necesarios para el funcionamiento de la aplicación. No realizamos seguimiento publicitario ni compartimos datos de comportamiento con redes de publicidad.</p>
<h2>11. MODIFICACIONES DE ESTA POLÍTICA</h2>
<p>Nos reservamos el derecho de modificar esta Política de Privacidad para adaptarla a cambios legislativos, jurisprudenciales o de nuestros servicios. Cualquier cambio relevante será notificado con al menos 30 días de antelación a través de la aplicación o por correo electrónico. El uso continuado de Human App tras la notificación implicará la aceptación de la política actualizada.</p>
<h2>12. CONTACTO</h2>
<p>Para cualquier consulta sobre esta Política de Privacidad o el tratamiento de tus datos personales:</p>
<h2>HORISCHNIK SL</h2>
<p>Calle de Alfonso XII, 62, 2ª planta, 28014, Madrid, España</p>
<p>Correo electrónico: info@humanapp.es</p>
<p>Aplicación: Human App → Ajustes → Contacto</p>
<div class="foot">
  HORISCHNIK SL · Calle de Alfonso XII, 62, 2ª planta, 28014 Madrid · info@humanapp.es<br>
  <a href="/terminos">Términos</a> · <a href="/privacidad">Privacidad</a> · <a href="/eula">EULA</a>
</div>
</div>
</body>
</html>
`
const LEGAL_EULA = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Acuerdo de Licencia de Usuario Final (EULA) · Human App</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:#000; color:#e8e8ea; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; line-height:1.6; }
  .wrap { max-width:760px; margin:0 auto; padding:48px 22px 80px; }
  .brand { font-size:13px; letter-spacing:6px; text-transform:uppercase; color:#3B82F6; font-weight:600; margin-bottom:28px; }
  h1 { font-size:26px; font-weight:700; line-height:1.2; margin:0 0 6px; }
  h2 { font-size:16px; font-weight:700; color:#fff; margin:30px 0 8px; }
  p { margin:0 0 12px; color:#c7c7cc; font-size:15px; }
  .upd { color:#777; font-size:13px; margin-bottom:8px; }
  a { color:#3B82F6; }
  .foot { margin-top:48px; padding-top:20px; border-top:1px solid #1c1c1c; color:#666; font-size:12px; }
  .foot a { color:#888; }
</style>
</head>
<body>
<div class="wrap">
<div class="brand">HUMAN</div>
<h1>Acuerdo de Licencia de Usuario Final (EULA)</h1>
<p class="upd">Última actualización: 28 de mayo de 2026</p>
<p>IMPORTANTE: LEA ESTE ACUERDO DETENIDAMENTE ANTES DE DESCARGAR, INSTALAR O UTILIZAR HUMAN APP. AL HACER CLIC EN &quot;ACEPTAR&quot;, INSTALAR O USAR LA APLICACIÓN, USTED ACEPTA QUEDAR VINCULADO POR ESTE ACUERDO. SI NO ACEPTA ESTOS TÉRMINOS, NO DESCARGUE NI USE LA APLICACIÓN.</p>
<h2>1. PARTES DEL ACUERDO</h2>
<p>Este Acuerdo de Licencia de Usuario Final (en adelante, &quot;EULA&quot; o &quot;Acuerdo&quot;) es un contrato legal entre usted (en adelante, &quot;el Licenciatario&quot; o &quot;el Usuario&quot;) y HORISCHNIK SL, con domicilio en Calle de Alfonso XII, 62, 2ª planta, 28014, Madrid, España (en adelante, &quot;el Licenciante&quot; o &quot;HORISCHNIK SL&quot;), para el uso de la aplicación móvil Human App y cualquier actualización, complemento o servicio vinculado (en adelante, conjuntamente, &quot;la Aplicación&quot;).</p>
<h2>2. CONCESIÓN DE LICENCIA</h2>
<h2>2.1 Licencia limitada</h2>
<p>Sujeto a los términos y condiciones de este Acuerdo, HORISCHNIK SL le otorga una licencia personal, no exclusiva, no transferible, no sublicenciable, revocable y limitada para:</p>
<p>Descargar e instalar una copia de la Aplicación en un dispositivo móvil de su propiedad o bajo su control.</p>
<p>Acceder y usar la Aplicación exclusivamente para sus fines personales y no comerciales.</p>
<h2>2.2 Restricciones de la licencia</h2>
<p>Usted no podrá, directa ni indirectamente:</p>
<p>Copiar, modificar, traducir, adaptar, fusionar, crear trabajos derivados de la Aplicación.</p>
<p>Distribuir, sublicenciar, arrendar, alquilar, prestar, revender o transferir la Aplicación o los derechos sobre la misma a terceros.</p>
<p>Realizar ingeniería inversa, descompilar, desensamblar o intentar obtener el código fuente de la Aplicación, salvo que la legislación aplicable lo permita expresamente con independencia de esta restricción.</p>
<p>Eliminar, alterar u ocultar los avisos de propiedad intelectual u otros avisos legales que figuren en la Aplicación.</p>
<p>Utilizar la Aplicación de cualquier manera que infrinja la legislación aplicable o los derechos de terceros.</p>
<p>Usar la Aplicación para fines comerciales sin autorización escrita previa de HORISCHNIK SL.</p>
<h2>3. PROPIEDAD INTELECTUAL</h2>
<p>La Aplicación está protegida por las leyes de propiedad intelectual, derechos de autor, marcas comerciales y otros derechos de propiedad intelectual e industrial de España, la Unión Europea y los tratados internacionales aplicables. HORISCHNIK SL (o sus licenciantes) son y seguirán siendo los propietarios exclusivos de todos los derechos, títulos e intereses sobre la Aplicación y todos los derechos de propiedad intelectual relacionados.</p>
<p>Este EULA no le transmite ningún derecho de propiedad sobre la Aplicación. Únicamente adquiere una licencia de uso limitada conforme a lo expresado en la Cláusula 2.</p>
<h2>4. ACTUALIZACIONES Y NUEVAS VERSIONES</h2>
<p>HORISCHNIK SL podrá, a su discreción, desarrollar y poner a disposición actualizaciones, parches, correcciones de errores o nuevas versiones de la Aplicación. Dichas actualizaciones pueden ser automáticas o requerir acción por parte del Usuario según lo establecido por la plataforma de distribución (App Store o Google Play).</p>
<p>Las actualizaciones estarán sujetas a este mismo EULA salvo que vayan acompañadas de un acuerdo de licencia separado, en cuyo caso prevalecerán los términos de dicho acuerdo.</p>
<p>HORISCHNIK SL no tiene obligación de mantener versiones anteriores de la Aplicación ni de proporcionar soporte técnico para versiones desactualizadas.</p>
<h2>5. SERVICIOS DE TERCEROS Y TIENDAS DE APLICACIONES</h2>
<h2>5.1 Apple App Store</h2>
<p>Si ha obtenido la Aplicación a través de Apple App Store, se aplican las siguientes condiciones adicionales:</p>
<p>Este EULA se celebra entre usted y HORISCHNIK SL, no con Apple Inc. Apple no es responsable de la Aplicación ni de su contenido.</p>
<p>La licencia sobre la Aplicación se limita al uso en cualquier dispositivo Apple de su propiedad o bajo su control, en los términos establecidos por las Reglas de Uso de los Términos de Servicio de la App Store.</p>
<p>Apple no tiene ninguna obligación de proporcionar servicios de mantenimiento y soporte técnico respecto a la Aplicación.</p>
<p>En caso de que la Aplicación no cumpla alguna garantía aplicable, puede notificárselo a Apple y Apple le reembolsará el precio de compra de la Aplicación (si lo hubiere). Apple no tiene ninguna otra obligación de garantía respecto a la Aplicación.</p>
<p>Apple no es responsable de ninguna reclamación del usuario final o de terceros relacionada con la Aplicación o con el uso de la misma.</p>
<p>En caso de reclamación de un tercero por infracción de derechos de propiedad intelectual, HORISCHNIK SL, no Apple, será el único responsable de la investigación, defensa, resolución y exención de dicha reclamación.</p>
<p>Apple y sus subsidiarias son terceros beneficiarios de este EULA y, tras su aceptación por usted, Apple tendrá derecho a hacer cumplir este EULA frente a usted como tercero beneficiario.</p>
<h2>5.2 Servicios de terceros integrados</h2>
<p>La Aplicación utiliza servicios de terceros para su funcionamiento. El uso de dichos servicios está sujeto a sus respectivos términos:</p>
<p>Anthropic (API de IA Claude): los mensajes enviados al asistente son procesados por Anthropic. Consulte la política de uso de Anthropic en anthropic.com.</p>
<p>Supabase: almacenamiento de datos conforme a las condiciones de servicio de Supabase (supabase.com).</p>
<p>Railway: infraestructura de backend conforme a las condiciones de Railway (railway.app).</p>
<h2>6. DATOS PERSONALES Y PRIVACIDAD</h2>
<p>El tratamiento de sus datos personales en el contexto de este EULA se rige por la Política de Privacidad de Human App, disponible en la Aplicación y en la página de la tienda de aplicaciones correspondiente. La Política de Privacidad forma parte integrante de este Acuerdo.</p>
<p>Al aceptar este EULA, usted consiente expresamente el tratamiento de sus datos personales, incluidos los datos de salud (categoría especial), conforme a lo establecido en la Política de Privacidad.</p>
<h2>7. EXCLUSIÓN DE GARANTÍAS</h2>
<p>LA APLICACIÓN SE PROPORCIONA &quot;TAL CUAL&quot; Y &quot;SEGÚN DISPONIBILIDAD&quot;, SIN GARANTÍAS DE NINGÚN TIPO, EXPRESAS, IMPLÍCITAS O ESTATUTARIAS. EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY APLICABLE, HORISCHNIK SL RENUNCIA EXPRESAMENTE A TODAS LAS GARANTÍAS, INCLUYENDO, ENTRE OTRAS, LAS GARANTÍAS IMPLÍCITAS DE COMERCIABILIDAD, IDONEIDAD PARA UN FIN DETERMINADO, TÍTULO Y NO INFRACCIÓN.</p>
<p>HORISCHNIK SL no garantiza que: (i) la Aplicación cumplirá sus requisitos específicos; (ii) la Aplicación funcionará de forma ininterrumpida, puntual, segura o libre de errores; (iii) los resultados que se puedan obtener del uso de la Aplicación serán precisos o fiables.</p>
<h2>8. LIMITACIÓN DE RESPONSABILIDAD</h2>
<p>EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEGISLACIÓN APLICABLE, HORISCHNIK SL Y SUS DIRECTIVOS, EMPLEADOS, AGENTES, SOCIOS Y LICENCIANTES NO SERÁN RESPONSABLES DE NINGÚN DAÑO INDIRECTO, INCIDENTAL, ESPECIAL, CONSECUENTE O PUNITIVO, NI DE NINGUNA PÉRDIDA DE BENEFICIOS O INGRESOS, PÉRDIDA DE DATOS, PÉRDIDA DE REPUTACIÓN U OTRAS PÉRDIDAS INTANGIBLES, DERIVADAS DE O RELACIONADAS CON EL USO O LA IMPOSIBILIDAD DE USO DE LA APLICACIÓN.</p>
<p>EN NINGÚN CASO LA RESPONSABILIDAD TOTAL DE HORISCHNIK SL FRENTE AL USUARIO SUPERARÁ EL MAYOR DE LOS SIGUIENTES IMPORTES: (I) EL IMPORTE PAGADO POR EL USUARIO EN LOS DOCE MESES ANTERIORES AL HECHO QUE ORIGINA LA RESPONSABILIDAD; O (II) CINCUENTA EUROS (50 €).</p>
<p>Nada en este EULA excluirá o limitará la responsabilidad de HORISCHNIK SL por muerte o lesiones personales causadas por negligencia, fraude, dolo o cualquier otra responsabilidad que no pueda excluirse conforme a la legislación española y de la Unión Europea.</p>
<h2>9. INDEMNIZACIÓN</h2>
<p>El Usuario se compromete a indemnizar, defender y eximir de responsabilidad a HORISCHNIK SL y a sus directivos, empleados, agentes y socios de cualquier reclamación, daño, obligación, pérdida, responsabilidad, coste o deuda, y gasto (incluidos los honorarios razonables de abogados) que surja de: (i) su uso de la Aplicación y acceso a la misma; (ii) su incumplimiento de cualquier condición de este EULA; (iii) su infracción de cualquier derecho de terceros, incluidos, sin limitación, los derechos de autor, de propiedad o de privacidad.</p>
<h2>10. VIGENCIA Y TERMINACIÓN</h2>
<p>Este EULA entrará en vigor en el momento de su aceptación y permanecerá vigente mientras el Usuario utilice la Aplicación.</p>
<p>Este Acuerdo terminará automáticamente si el Usuario incumple cualquiera de sus términos. HORISCHNIK SL podrá también terminar este Acuerdo en cualquier momento, con o sin causa, previa notificación al Usuario.</p>
<p>A la terminación de este EULA: (i) todos los derechos concedidos al Usuario en virtud de este Acuerdo cesarán inmediatamente; (ii) el Usuario deberá cesar todo uso de la Aplicación y eliminarla de sus dispositivos; (iii) las cláusulas que por su naturaleza deban sobrevivir a la terminación (propiedad intelectual, limitación de responsabilidad, indemnización, ley aplicable) continuarán en vigor.</p>
<h2>11. DISPOSICIONES GENERALES</h2>
<h2>11.1 Ley aplicable y jurisdicción</h2>
<p>Este EULA se rige por el derecho español. Para la resolución de cualquier controversia, las partes se someten a los juzgados y tribunales de Madrid, sin perjuicio de los derechos que como consumidor pudieran corresponder al Usuario conforme a la normativa de la Unión Europea.</p>
<h2>11.2 Divisibilidad</h2>
<p>Si alguna disposición de este EULA fuera declarada inválida o inaplicable por un tribunal competente, dicha disposición será modificada en la medida mínima necesaria para hacerla válida y ejecutable, y las disposiciones restantes seguirán en pleno vigor y efecto.</p>
<h2>11.3 Acuerdo íntegro</h2>
<p>Este EULA, junto con la Política de Privacidad y los Términos y Condiciones de Uso de Human App, constituye el acuerdo íntegro entre el Usuario y HORISCHNIK SL en relación con la Aplicación y sustituye a todos los acuerdos anteriores o contemporáneos, orales o escritos, entre las partes sobre el objeto del mismo.</p>
<h2>11.4 Modificaciones</h2>
<p>HORISCHNIK SL se reserva el derecho de modificar este EULA en cualquier momento. Las modificaciones serán notificadas al Usuario con al menos 30 días de antelación mediante notificación en la Aplicación o por correo electrónico. El uso continuado de la Aplicación tras la entrada en vigor de la modificación implica la aceptación de la misma.</p>
<h2>11.5 Renuncia</h2>
<p>La no ejercitación o el retraso en el ejercicio por parte de HORISCHNIK SL de cualquier derecho o acción derivada de este EULA no constituirá una renuncia a dicho derecho o acción ni impedirá su ejercicio posterior.</p>
<h2>12. CONTACTO</h2>
<h2>HORISCHNIK SL</h2>
<p>Calle de Alfonso XII, 62, 2ª planta, 28014, Madrid, España</p>
<p>Correo electrónico: info@humanapp.es</p>
<div class="foot">
  HORISCHNIK SL · Calle de Alfonso XII, 62, 2ª planta, 28014 Madrid · info@humanapp.es<br>
  <a href="/terminos">Términos</a> · <a href="/privacidad">Privacidad</a> · <a href="/eula">EULA</a>
</div>
</div>
</body>
</html>
`
const LEGAL_SOPORTE = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Soporte · Human App</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:#000; color:#e8e8ea; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; line-height:1.6; }
  .wrap { max-width:760px; margin:0 auto; padding:48px 22px 80px; }
  .brand { font-size:13px; letter-spacing:6px; text-transform:uppercase; color:#3B82F6; font-weight:600; margin-bottom:28px; }
  h1 { font-size:26px; font-weight:700; line-height:1.2; margin:0 0 6px; }
  h2 { font-size:16px; font-weight:700; color:#fff; margin:30px 0 8px; }
  p { margin:0 0 12px; color:#c7c7cc; font-size:15px; }
  ul { color:#c7c7cc; font-size:15px; padding-left:20px; }
  li { margin:0 0 8px; }
  a { color:#3B82F6; }
  .card { background:#0d0d0f; border:1px solid #1c1c1c; border-radius:14px; padding:20px 22px; margin:18px 0; }
  .mail { font-size:18px; font-weight:700; color:#fff; }
  .foot { margin-top:48px; padding-top:20px; border-top:1px solid #1c1c1c; color:#666; font-size:12px; }
  .foot a { color:#888; }
</style>
</head>
<body>
<div class="wrap">
<div class="brand">HUMAN</div>
<h1>Soporte</h1>
<p>¿Necesitas ayuda con Human App? Estamos para ayudarte. Escríbenos y te respondemos lo antes posible.</p>

<div class="card">
<p>Correo de soporte</p>
<p class="mail"><a href="mailto:info@humanapp.es">info@humanapp.es</a></p>
<p>Tiempo de respuesta habitual: 24–48 h laborables.</p>
</div>

<h2>Preguntas frecuentes</h2>

<h2>¿Cómo funciona la suscripción?</h2>
<p>Human ofrece una suscripción Premium: 9,99 €/mes o 29,99 €/año. El pago se gestiona a través de tu cuenta de Apple ID y se renueva automáticamente salvo que la canceles al menos 24 h antes del fin del periodo.</p>

<h2>¿Cómo gestiono o cancelo mi suscripción?</h2>
<p>Desde la app, en Perfil → Suscripción, o directamente en los Ajustes de tu cuenta de Apple ID (Ajustes → tu nombre → Suscripciones). También puedes cancelar la prueba gratuita desde ahí antes de que termine.</p>

<h2>¿Cómo elimino mi cuenta o mis datos?</h2>
<p>Desde la app, en Perfil → Eliminar cuenta. También puedes solicitar la eliminación de tus datos escribiendo a <a href="mailto:info@humanapp.es">info@humanapp.es</a>.</p>

<h2>¿Human sustituye el consejo médico?</h2>
<p>No. Human es una herramienta de seguimiento de bienestar y rendimiento. No es un producto sanitario ni sustituye el diagnóstico, consejo o tratamiento de un profesional sanitario cualificado.</p>

<h2>Documentos legales</h2>
<ul>
<li><a href="/terminos">Términos y Condiciones</a></li>
<li><a href="/privacidad">Política de Privacidad</a></li>
<li><a href="/eula">EULA</a></li>
</ul>

<div class="foot">
  HORISCHNIK SL · Calle de Alfonso XII, 62, 2ª planta, 28014 Madrid · info@humanapp.es<br>
  <a href="/terminos">Términos</a> · <a href="/privacidad">Privacidad</a> · <a href="/eula">EULA</a>
</div>
</div>
</body>
</html>
`
const _legalSend = (c) => (req, res) => { res.set('Cache-Control','public, max-age=3600'); res.type('html').send(c) }
app.get('/terminos',   _legalSend(LEGAL_TERMINOS))
app.get('/privacidad', _legalSend(LEGAL_PRIVACIDAD))
app.get('/eula',       _legalSend(LEGAL_EULA))
app.get('/soporte',    _legalSend(LEGAL_SOPORTE))


// ─────────────────────────────────────────
// MIDDLEWARE: requireAuth
// Verifica el JWT del header Authorization: Bearer <token>
// y deja el user disponible en req.user y un cliente RLS en req.supabase
// ─────────────────────────────────────────
async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return res.status(401).json({ error: 'No autorizado' })

    // Validar token contra Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data?.user) return res.status(401).json({ error: 'Sesión inválida' })

    req.user = data.user
    // Cliente Supabase con el JWT del usuario → todas las queries respetan RLS
    req.supabase = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth:   { persistSession: false, autoRefreshToken: false }
    })
    next()
  } catch (err) {
    console.error('requireAuth error:', err.message)
    res.status(401).json({ error: 'No autorizado' })
  }
}

// ─────────────────────────────────────────
// POST /api/onboarding
// Guarda o actualiza el perfil del usuario autenticado
// ─────────────────────────────────────────
app.post('/api/onboarding', requireAuth, async (req, res) => {
  const {
    name, age, sex, identity, goal, symptoms, agentName,
    wake_time, sleep_time, stress_baseline, score_baseline, integrations
  } = req.body || {}

  // Validación blanda — el cliente debería ya enviar lo correcto, esto es defensa
  if (name && typeof name !== 'string')                   return res.status(400).json({ error: 'name debe ser string' })
  if (age != null && (typeof age !== 'number' || age < 13 || age > 120))
    return res.status(400).json({ error: 'age debe ser número entre 13 y 120' })
  if (sex && typeof sex !== 'string')                     return res.status(400).json({ error: 'sex debe ser string' })
  if (identity && typeof identity !== 'string')           return res.status(400).json({ error: 'identity debe ser string' })
  if (goal && typeof goal !== 'string')                   return res.status(400).json({ error: 'goal debe ser string' })
  if (symptoms && typeof symptoms !== 'object')           return res.status(400).json({ error: 'symptoms debe ser objeto' })
  if (agentName && typeof agentName !== 'string')         return res.status(400).json({ error: 'agentName debe ser string' })
  if (integrations && !Array.isArray(integrations))       return res.status(400).json({ error: 'integrations debe ser array' })

  try {
    const patch = {
      id: req.user.id,
      email: req.user.email,
      age, sex, identity, goal, symptoms,
      wake_time:        wake_time        || '07:00',
      sleep_time:       sleep_time       || '23:00',
      stress_baseline:  stress_baseline  || 3,
      score_baseline:   score_baseline   || 45,
      integrations:     integrations     || []
    }
    // agent_name: solo escribir si llega un valor real. Nunca pisar la elección
    // ya guardada con null/ausente (bug "elegí Nino, salió Jarvis").
    if (agentName && String(agentName).trim()) {
      patch.agent_name = String(agentName).trim().slice(0, 40)
    }
    // name: misma regla — solo escribir si llega un nombre real (nunca null ni
    // el placeholder "Usuario"), para no pisar el guardado (bug de la "B").
    if (name && String(name).trim() && String(name).trim().toLowerCase() !== 'usuario') {
      patch.name = String(name).trim().slice(0, 80)
    }
    const { error } = await req.supabase.from('profiles').upsert(patch)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    console.error('onboarding error:', err.message)
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// GET /api/user/me
// Devuelve perfil + últimos 30 tests + stats derivadas
// ─────────────────────────────────────────
app.get('/api/user/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id

    const { data: profile, error } = await req.supabase
      .from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) throw error

    const { data: tests } = await req.supabase
      .from('daily_tests').select('*').eq('user_id', userId)
      .order('date', { ascending: false }).limit(30)

    const testList = tests || []
    const lastTest = testList[0] || null

    let daysActive = 1
    if (profile?.created_at) {
      const created = new Date(profile.created_at)
      const diff = Date.now() - created.getTime()
      daysActive = Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1)
    }

    let streak = 0
    if (testList.length > 0) {
      const dateSet = new Set(testList.map(t => (t.date || '').slice(0, 10)))
      const today = new Date()
      for (let i = 0; i < 365; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        if (dateSet.has(key)) streak++
        else if (i > 0) break
      }
    }

    res.json({
      profile: profile || { id: userId, email: req.user.email },
      lastTest,
      tests: testList,
      stats: { daysActive, streak, totalTests: testList.length }
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// POST /api/daily-test
// Guarda el test del día y dispara plan en background
// ─────────────────────────────────────────
app.post('/api/daily-test', requireAuth, async (req, res) => {
  const {
    sleepQuality, sleepHours,
    stressLevel, stressPeak,
    nutritionQuality, mealsCount,
    sportIntensity, sportDuration
  } = req.body || {}

  // Validación tipos
  const validNum = (v) => v == null || (typeof v === 'number' && !Number.isNaN(v))
  const validStr = (v) => v == null || typeof v === 'string'
  if (!validNum(sleepQuality) || !validNum(sleepHours) ||
      !validNum(stressLevel) || !validNum(nutritionQuality) ||
      !validNum(mealsCount)  || !validNum(sportIntensity) ||
      !validNum(sportDuration)) {
    return res.status(400).json({ error: 'Campos numéricos del test inválidos' })
  }
  if (!validStr(stressPeak)) return res.status(400).json({ error: 'stressPeak debe ser string' })

  try {
    const userId = req.user.id

    const { data: savedTest, error } = await req.supabase
      .from('daily_tests')
      .upsert({
        user_id: userId,
        sleep_quality: sleepQuality, sleep_hours: sleepHours,
        stress_level: stressLevel, stress_peak: stressPeak,
        nutrition_quality: nutritionQuality, meals_count: mealsCount,
        sport_intensity: sportIntensity, sport_duration: sportDuration
      }, { onConflict: 'user_id,date' })
      .select().single()

    if (error) throw error

    // Plan en background (puede usar admin porque es proceso del servidor)
    generateAndSaveDailyPlan(userId, savedTest).catch(console.error)

    res.json({ ok: true, testId: savedTest?.id })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// GET /api/daily-plan/me
// ─────────────────────────────────────────
app.get('/api/daily-plan/me', requireAuth, async (req, res) => {
  try {
    const { data: test } = await req.supabase
      .from('daily_tests').select('daily_plan, date').eq('user_id', req.user.id)
      .order('date', { ascending: false }).limit(1).maybeSingle()

    res.json({ plan: test?.daily_plan || null, date: test?.date || null })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// DELETE /api/user/me
// Borra la cuenta del usuario autenticado.
// FK ON DELETE CASCADE elimina perfil/tests/mensajes.
// ─────────────────────────────────────────
app.delete('/api/user/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    // Borrado en cascada de datos públicos (defensa adicional aunque haya FK CASCADE)
    await supabaseAdmin.from('chat_messages').delete().eq('user_id', userId)
    await supabaseAdmin.from('daily_tests').delete().eq('user_id', userId)
    await supabaseAdmin.from('profiles').delete().eq('id', userId)
    // Borrar el usuario de auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    console.error('delete user error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// POST /api/chat
// Jarvis con las 3 capas de memoria. userId del JWT, no del body.
// ─────────────────────────────────────────
app.post('/api/chat', requireAuth, async (req, res) => {
  const { message, context: clientCtx } = req.body
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Mensaje vacío' })
  }

  const userId = req.user.id

  try {
    const { data: profile } = await req.supabase
      .from('profiles').select('*').eq('id', userId).maybeSingle()

    let { data: recentTests } = await req.supabase
      .from('daily_tests').select('*').eq('user_id', userId)
      .order('date', { ascending: false }).limit(30)

    // Fallback: si la DB no devuelve test pero el cliente sí lo tiene, lo usamos
    if ((!recentTests || recentTests.length === 0) && clientCtx?.today) {
      recentTests = [{
        date:              clientCtx.today.date || new Date().toISOString().slice(0,10),
        sleep_quality:     clientCtx.today.sleep_quality,
        sleep_hours:       clientCtx.today.sleep_hours,
        stress_level:      clientCtx.today.stress_level,
        stress_peak:       clientCtx.today.stress_peak,
        nutrition_quality: clientCtx.today.nutrition_quality,
        meals_count:       clientCtx.today.meals_count,
        sport_intensity:   clientCtx.today.sport_intensity,
        sport_duration:    clientCtx.today.sport_duration
      }]
    }

    const { data: chatHistory } = await req.supabase
      .from('chat_messages').select('role, content').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(8)

    const orderedHistory = (chatHistory || []).reverse()
    const systemPrompt = buildSystemPrompt(profile, recentTests || [], clientCtx)

    // Saneamos el historial para la API de Anthropic: la conversación DEBE
    // empezar por 'user' y alternar user/assistant. Como el par user+assistant
    // se guarda con el mismo created_at, el orden de lectura puede venir
    // descolocado (assistant primero, o dos del mismo rol seguidos), lo que
    // rompía la llamada con un 500. Aquí lo normalizamos siempre.
    const convo = []
    for (const m of orderedHistory) {
      if (m.role !== 'user' && m.role !== 'assistant') continue
      if (convo.length === 0 && m.role !== 'user') continue          // debe empezar en 'user'
      if (convo.length && convo[convo.length - 1].role === m.role) {
        convo[convo.length - 1] = { role: m.role, content: m.content } // colapsa consecutivos del mismo rol
      } else {
        convo.push({ role: m.role, content: m.content })
      }
    }
    if (convo.length && convo[convo.length - 1].role === 'user') convo.pop() // evita 2 'user' seguidos

    const messages = [
      ...convo,
      { role: 'user', content: message }
    ]

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages
    })

    const reply = response.content[0].text

    // Guardar el intercambio con cliente del usuario (RLS aplica)
    await req.supabase.from('chat_messages').insert([
      { user_id: userId, role: 'user',      content: message },
      { user_id: userId, role: 'assistant', content: reply   }
    ])

    // Memoria de Jarvis: background con admin (el cliente puede haber terminado)
    updateJarvisMemory(userId, profile, recentTests || [], message, reply).catch(console.error)

    res.json({ reply })
  } catch (err) {
    console.error('chat error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// HELPER: system prompt
// ─────────────────────────────────────────
function buildSystemPrompt(profile, recentTests, clientCtx) {
  const name         = profile?.name        || clientCtx?.profile?.name        || 'usuario'
  const agentName    = profile?.agent_name  || 'Jarvis'
  const identity     = profile?.identity    || clientCtx?.profile?.identity    || 'atleta'
  const goal         = profile?.goal        || clientCtx?.profile?.goal        || 'rendir mejor'
  const age          = (profile?.age || clientCtx?.profile?.age) ? `${profile?.age || clientCtx?.profile?.age} años` : ''
  const wakeTime     = profile?.wake_time   || clientCtx?.profile?.wake_time   || null
  const sleepTime    = profile?.sleep_time  || clientCtx?.profile?.sleep_time  || null
  const jarvisMemory = profile?.jarvis_memory || ''

  const toneByIdentity = identity === 'founder'
    ? 'recuperación, gestión de energía y foco mental como founder'
    : identity === 'atleta'
    ? 'recuperación atlética para sostener el rendimiento'
    : 'recuperación como base del rendimiento mental y físico'

  const trendsBlock = buildTrendsBlock(recentTests)
  const memoryBlock = jarvisMemory
    ? `\nLO QUE SÉ DE ${name.toUpperCase()} (memoria acumulada):\n${jarvisMemory}\n`
    : ''

  // Cuando el cliente nos da el body_battery calculado, lo incluimos explícito
  const todayCtx = clientCtx?.today || {}
  const bodyBattery = todayCtx.body_battery != null ? `${todayCtx.body_battery}%` : null
  const explicitTodayBlock = (bodyBattery || trendsBlock === '') && todayCtx.sleep_quality != null
    ? `\nESTADO DE HOY (datos del test diario que YA hizo):
- Body Battery: ${bodyBattery || 'calcular según los datos'}
- Sueño: ${todayCtx.sleep_quality}/5, ${todayCtx.sleep_hours}h
- Estrés: ${todayCtx.stress_level}/5${todayCtx.stress_peak ? ` (pico ${todayCtx.stress_peak})` : ''}
- Nutrición: ${todayCtx.nutrition_quality}/5, ${todayCtx.meals_count} comidas
- Deporte: ${todayCtx.sport_intensity}/5, ${todayCtx.sport_duration} min
- Rutina: dormir ${sleepTime || '23:00'} → despertar ${wakeTime || '07:00'}\n`
    : ''

  return `Eres ${agentName}, el agente personal de salud y rendimiento de ${name}${age ? ` (${age})` : ''}.

PERFIL:
- Identidad: ${identity}
- Objetivo: ${goal}
- Síntomas iniciales: ${JSON.stringify(profile?.symptoms || {})}
${memoryBlock}${trendsBlock}${explicitTodayBlock}
REGLAS CRÍTICAS:
- Tu especialidad es la RECUPERACIÓN para maximizar el rendimiento. NO prescribas entrenamiento, ejercicios, rutinas ni intensidades. Si te preguntan por entrenar, reconduce hacia cómo recuperarse mejor. El dato de deporte solo te sirve para calibrar cuánta recuperación necesita.
- TIENES los datos del usuario arriba (Body Battery, sueño, estrés, nutrición, deporte). USALOS SIEMPRE.
- NUNCA digas "no lo sé", "no tengo datos", "necesitaría más métricas", "datos cardíacos" o algo similar. Los datos del test diario YA TE LOS DAN arriba. Responde con esos.
- Si te preguntan "cómo dormí", responde con los datos de sueño que tienes (calidad X/5, X horas). Si te preguntan "estoy recuperado", responde con Body Battery + sueño + estrés.
- Métricas avanzadas que NO tienes (HRV, frecuencia cardíaca, fases reales): nunca las menciones como falta. Trabaja con lo que sí tienes.

CÓMO ACTUAR:
- Responde SIEMPRE en español, en 2-4 oraciones, directo y accionable.
- Cita números concretos del usuario (ej: "con tu 71% y sueño 4/5, sí, vas recuperado").
- Hábitos núcleo que recomiendas cuando encajen: luz solar 10 min al amanecer y 10 min al atardecer (ritmo circadiano), corte de luz azul 1 h antes de dormir, cena 3 h antes con triptófano, cafeína solo hasta 8 h antes de dormir, meditación/respiración y estiramientos.
- Si hay alertas (⚠️), priorízalas.
- Tono: ${toneByIdentity}.
- Trátalo como alguien que conoces bien, no como un chatbot genérico.`
}

function buildTrendsBlock(tests) {
  if (!tests || tests.length === 0) return ''

  const latest = tests[0]
  const count  = tests.length

  const avg = (key) => {
    const vals = tests.map(t => t[key]).filter(v => v != null)
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null
  }

  const last3      = tests.slice(0, 3)
  const poorSleep  = last3.length >= 3 && last3.every(t => t.sleep_quality <= 2)
  const highStress = last3.length >= 3 && last3.every(t => t.stress_level  >= 4)
  const poorNutr   = last3.length >= 3 && last3.every(t => t.nutrition_quality <= 2)
  const noSport    = last3.length >= 3 && last3.every(t => t.sport_intensity === 0 || t.sport_duration === 0)

  let block = `\nDATOS DE SALUD (últimos ${count} día${count > 1 ? 's' : ''}):\n`
  block += `- Hoy (${latest.date}): sueño ${latest.sleep_quality}/5 (${latest.sleep_hours}h), estrés ${latest.stress_level}/5, nutrición ${latest.nutrition_quality}/5, deporte ${latest.sport_intensity}/5 (${latest.sport_duration}min)\n`

  if (count >= 3) {
    block += `- Promedios ${count}d: sueño ${avg('sleep_quality')}/5 (${avg('sleep_hours')}h), estrés ${avg('stress_level')}/5, nutrición ${avg('nutrition_quality')}/5, deporte ${avg('sport_intensity')}/5\n`
  }

  if (poorSleep)  block += `⚠️ 3+ días seguidos con sueño de baja calidad.\n`
  if (highStress) block += `⚠️ 3+ días seguidos con estrés elevado.\n`
  if (poorNutr)   block += `⚠️ 3+ días seguidos con nutrición deficiente.\n`
  if (noSport)    block += `⚠️ 3+ días sin actividad deportiva.\n`

  return block
}

// ─────────────────────────────────────────
// BACKGROUND: actualizar memoria de Jarvis
// Usa admin porque corre tras devolver la respuesta
// ─────────────────────────────────────────
async function updateJarvisMemory(userId, profile, recentTests, userMessage, jarvisReply) {
  const currentMemory = profile?.jarvis_memory || ''
  const name          = profile?.name || 'el usuario'
  const trendsBlock   = buildTrendsBlock(recentTests)

  const prompt = `Eres el sistema de memoria de Jarvis, agente personal de ${name}.

MEMORIA ACTUAL:
${currentMemory || '(vacía — primera conversación)'}

DATOS DE SALUD RECIENTES:
${trendsBlock}

ÚLTIMA CONVERSACIÓN:
Usuario: ${userMessage}
Jarvis: ${jarvisReply}

Tu tarea: actualiza la memoria con cualquier insight nuevo, relevante y duradero sobre este usuario.
Incluye: patrones detectados, preferencias, bloqueos recurrentes, qué funciona, progreso, contexto personal importante.
NO incluyas: detalles triviales, lo que ya está en la memoria actual, datos temporales.

Si no hay nada nuevo relevante, devuelve la memoria actual sin cambios.

Devuelve SOLO el texto de la memoria actualizada (máximo 400 palabras), sin explicaciones ni formato extra.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    })

    const updatedMemory = response.content[0].text.trim()

    if (updatedMemory !== currentMemory) {
      await supabaseAdmin.from('profiles')
        .update({ jarvis_memory: updatedMemory })
        .eq('id', userId)
    }
  } catch (err) {
    console.error('Error actualizando memoria de Jarvis:', err.message)
  }
}

// ─────────────────────────────────────────
// BACKGROUND: generar plan diario tras el test
// Usa admin para que corra aunque el request del cliente ya haya respondido
// ─────────────────────────────────────────
async function generateAndSaveDailyPlan(userId, todayTest) {
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('*').eq('id', userId).maybeSingle()

  const { data: recentTests } = await supabaseAdmin
    .from('daily_tests').select('*').eq('user_id', userId)
    .order('date', { ascending: false }).limit(7)

  const name         = profile?.name       || 'usuario'
  const agentName    = profile?.agent_name || 'Jarvis'
  const identity     = profile?.identity   || 'atleta'
  const goal         = profile?.goal       || 'rendir mejor'
  const jarvisMemory = profile?.jarvis_memory || ''
  const trendsBlock  = buildTrendsBlock(recentTests || [])

  const prompt = `Eres ${agentName}, agente personal de ${name}.

PERFIL: ${identity} · Objetivo: ${goal}
${jarvisMemory ? `LO QUE SÉ DE ${name.toUpperCase()}:\n${jarvisMemory}\n` : ''}
${trendsBlock}
TEST DE HOY (${todayTest.date}):
- Sueño: ${todayTest.sleep_quality}/5 (${todayTest.sleep_hours}h)
- Estrés: ${todayTest.stress_level}/5 (peor en: ${todayTest.stress_peak || 'no especificado'})
- Nutrición: ${todayTest.nutrition_quality}/5 (${todayTest.meals_count} comidas)
- Deporte: ${todayTest.sport_intensity}/5 (${todayTest.sport_duration}min)

Genera el plan de RECUPERACIÓN de hoy para ${name}. Concreto y adaptado a cómo está hoy.

IMPORTANTE: ${agentName} es un agente de RECUPERACIÓN. NO prescribas entrenamiento, ejercicios, intensidades ni rutinas. El dato de deporte solo sirve para calibrar cuánta recuperación necesita (más carga ayer = más recuperación hoy). El fin de la recuperación es maximizar su rendimiento.

Estructura exacta (usa estos títulos):
ESTADO DE HOY: [1 frase que resuma cómo está y por qué]
FOCO PRINCIPAL: [la prioridad de RECUPERACIÓN del día según sus datos]
NUTRICIÓN: [2-3 recomendaciones de nutrición de recuperación. Recomienda casi siempre cenar al menos 3 h antes de dormir y priorizar alimentos ricos en triptófano (pavo, huevos, lácteos, plátano, avena, frutos secos), explicando que mejoran el sueño]
RECUPERACIÓN: [lo más importante para recuperarse hoy. Incluye casi siempre reducir o bloquear la luz azul (pantallas, LED) al menos 1 h antes de dormir (favorece la melatonina), y unos minutos de meditación/respiración y estiramientos para relajar el sistema nervioso]
RITMO CIRCADIANO: [recomienda exponerse a luz solar 10 min al amanecer (en los primeros 30-60 min tras despertar, en exterior y sin gafas de sol) y 10 min al atardecer con el sol bajo: anclan el reloj biológico, regulan el cortisol matinal y adelantan la melatonina nocturna]
MENSAJE DE JARVIS: [1 frase motivadora y personalizada, enfocada en recuperación]

Máximo 180 palabras en total. Directo, sin relleno. Nada de entrenamiento.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })

    const plan = response.content[0].text.trim()

    await supabaseAdmin.from('daily_tests')
      .update({ daily_plan: plan })
      .eq('id', todayTest.id)

  } catch (err) {
    console.error('Error generando plan diario:', err.message)
  }
}

// ─────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Human API corriendo en :${PORT}`))
