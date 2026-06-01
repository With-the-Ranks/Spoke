import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";

// Read directly from process.env — this module must be imported before config.js
// or any instrumented module (express, pg, http) so the SDK can monkey-patch them.
const {
  OTEL_ENABLED,
  OTEL_EXPORTER_OTLP_ENDPOINT,
  OTEL_SERVICE_NAME = "spoke",
  OTEL_SAMPLE_RATE = "0.1",
  DEPLOY_ENVIRONMENT = "development"
} = process.env;

if (OTEL_ENABLED === "true") {
  const sdk = new NodeSDK({
    serviceName: OTEL_SERVICE_NAME,
    traceExporter: new OTLPTraceExporter({
      url: OTEL_EXPORTER_OTLP_ENDPOINT
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs instrumentation is extremely noisy and not useful for tracing
        "@opentelemetry/instrumentation-fs": { enabled: false },
        // dns is also noisy — every pg connection triggers it
        "@opentelemetry/instrumentation-dns": { enabled: false },
        // stamp resource attributes on every span
        "@opentelemetry/instrumentation-http": {
          enabled: true
        }
      })
    ]
  });

  // NodeSDK respects OTEL_TRACES_SAMPLER / OTEL_TRACES_SAMPLER_ARG env vars,
  // but we also accept OTEL_SAMPLE_RATE as a convenience and map it here.
  process.env.OTEL_TRACES_SAMPLER = "traceidratio";
  process.env.OTEL_TRACES_SAMPLER_ARG = OTEL_SAMPLE_RATE;

  // OTEL_RESOURCE_ATTRIBUTES lets us attach environment without importing
  // @opentelemetry/semantic-conventions — the SDK reads this env var natively.
  if (!process.env.OTEL_RESOURCE_ATTRIBUTES) {
    process.env.OTEL_RESOURCE_ATTRIBUTES = `deployment.environment=${DEPLOY_ENVIRONMENT}`;
  }

  sdk.start();

  process.on("SIGTERM", () => {
    sdk.shutdown().catch(() => {});
  });
}
