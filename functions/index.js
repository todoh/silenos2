// index.js CORREGIDO Y FINAL

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const { defineString } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

// 1. Define el parámetro para el secreto.
const stripeSecretKey = defineString("STRIPE_SECRET_KEY");

// Inicializa Firebase Admin.
initializeApp();

// 2. Declara la variable 'stripe' aquí, pero no la inicialices todavía.
let stripe;

exports.otorgarAccesoVitalicio = onDocumentWritten("customers/{userId}/subscriptions/{subId}", async (event) => {
    // 3. INICIALIZA STRIPE AQUÍ DENTRO.
    // Esto asegura que .value() se llame en tiempo de ejecución.
    stripe = stripe || require("stripe")(stripeSecretKey.value());

    const docAntes = event.data.before.data();
    const docDespues = event.data.after.data();
    const userId = event.params.userId;
    const subId = event.params.subId;

    if ((!docAntes || docAntes.status !== "active") && docDespues.status === "active") {
      logger.log(`¡Primer pago exitoso para el usuario ${userId}! Otorgando acceso vitalicio.`);
      try {
        await getAuth().setCustomUserClaims(userId, {
          accesoVitalicio: true,
        });
        logger.log(`Custom Claim 'accesoVitalicio' asignado a ${userId}`);
        
        await stripe.subscriptions.cancel(subId);
        logger.log(`Suscripción ${subId} cancelada exitosamente después del primer pago.`);
        
      } catch (error) {
        logger.error("Ocurrió un error al procesar el acceso vitalicio:", error);
      }
      return null;
    }
    
    logger.log("El cambio en la suscripción no fue el primer pago, no se realizan acciones.");
    return null;
  });