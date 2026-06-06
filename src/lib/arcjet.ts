import arcjet, { shield, detectBot, tokenBucket } from "@arcjet/next";

if (!process.env.ARCJET_KEY) {
  console.warn("ARCJET_KEY environment variable is not defined. Using local fallback.");
}

// Initializing the Arcjet security client
export const aj = arcjet({
  key: process.env.ARCJET_KEY || "ajkey_mock_local_dev_key",
  rules: [
    // Shield protects against common web application attacks (SQLi, XSS, etc.)
    shield({ 
      mode: "LIVE" 
    }),
    // Detect Bot blocks automated scrapers, crawlers, and spam agents
    detectBot({ 
      mode: "LIVE", 
      allow: [] // Blocks all automated traffic by default
    }),
    // Token Bucket enforces rate limiting across application requests
    tokenBucket({
      mode: "LIVE",
      refillRate: 5,
      interval: "10s",
      capacity: 10,
    }),
  ],
});
