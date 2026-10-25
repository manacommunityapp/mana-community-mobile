# n8n mobile AI webhook

This workflow exposes an authenticated n8n webhook as an app-facing AI assistant API. It accepts requests from any mobile module by including that page's module name and Expo Router path. The workflow returns a chat response and does not perform transactions or mutate account data.

## Import and configure

1. Import `workflows/mobile-ai-assistant-webhook.json`.
2. Configure the **Mobile Webhook** JWT Auth credential so it verifies the same signed-in API JWT used by the mobile app. Keep signing keys on the server; never embed an n8n API key or static webhook secret in the app.
3. Configure the **AI Assistant** node with an n8n Header Auth credential: header name `Authorization`, value `Bearer <your OpenAI API key>`.
4. Use HTTPS, activate the workflow, and configure the app's `EXPO_PUBLIC_N8N_AI_WEBHOOK_URL` with the production webhook URL.

The app's Axios client attaches its existing access token to absolute webhook requests. When the webhook URL is empty, the AI chat screen continues using the existing Spring Boot `/api/ai/chat` endpoint. If n8n is configured but unavailable, the existing app API remains the fallback.

## Mobile request

```json
{
  "module": "wellness",
  "route": "/wellness/food-journal",
  "action": "assistant.chat",
  "message": "Suggest a balanced dinner",
  "conversationId": 1730000000000,
  "history": [
    { "role": "user", "content": "I prefer vegetarian meals" },
    { "role": "assistant", "content": "Understood." }
  ],
  "context": {
    "selectedTab": "journal"
  }
}
```

`history` is optional and limited to the latest 12 user/assistant turns. `context` is optional and capped at 8,000 serialized characters. Avoid including sensitive records unless the feature requires them and the user has consented.

## Mobile response

```json
{
  "reply": "Here are a few balanced vegetarian dinner ideas...",
  "conversationId": 1730000000000,
  "timestamp": "2026-10-23T12:00:00.000Z"
}
```

The shared client integration is in `services/n8nWorkflowService.ts`; the existing AI chat uses it when the webhook URL is configured. Other module pages can call the same service with their own `module`, `route`, `action`, and limited `context`.
