const boundedString = (maxLength: number, minLength = 1) => ({
  type: "string" as const,
  minLength,
  maxLength,
});

export const mutationSchemas = {
  register: {
    type: "object",
    additionalProperties: false,
    required: ["handle", "displayName", "password", "locale"],
    properties: {
      handle: boundedString(30, 3),
      displayName: boundedString(50, 2),
      password: boundedString(256, 12),
      locale: { type: "string", enum: ["en", "zh"] },
    },
  },
  login: {
    type: "object",
    additionalProperties: false,
    required: ["handle", "password"],
    properties: {
      handle: boundedString(80),
      password: boundedString(256, 8),
    },
  },
  accountProfile: {
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: {
      displayName: boundedString(50, 2),
      locale: { type: "string", enum: ["en", "zh"] },
    },
  },
  passwordChange: {
    type: "object",
    additionalProperties: false,
    required: ["currentPassword", "newPassword"],
    properties: {
      currentPassword: boundedString(256, 8),
      newPassword: boundedString(256, 12),
    },
  },
  creatorApplication: {
    type: "object",
    additionalProperties: false,
    required: ["category", "bio", "scheduleText", "motivation"],
    properties: {
      category: boundedString(60, 2),
      bio: boundedString(500, 20),
      scheduleText: boundedString(160, 4),
      motivation: boundedString(800, 20),
    },
  },
  creatorApplicationDecision: {
    type: "object",
    additionalProperties: false,
    required: ["decision", "reason"],
    properties: {
      decision: { type: "string", enum: ["approved", "rejected"] },
      reason: boundedString(500, 2),
    },
  },
  report: {
    type: "object",
    additionalProperties: false,
    required: ["reason"],
    properties: {
      reason: boundedString(120),
      details: boundedString(500, 0),
    },
  },
  idempotentPurchase: {
    type: "object",
    additionalProperties: false,
    required: ["idempotencyKey"],
    properties: { idempotencyKey: boundedString(160) },
  },
  giftPurchase: {
    type: "object",
    additionalProperties: false,
    required: ["giftId", "idempotencyKey"],
    properties: {
      giftId: boundedString(80),
      idempotencyKey: boundedString(160),
      quantity: { type: "integer", minimum: 1, maximum: 100 },
      confirmedHighValue: { type: "boolean" },
    },
  },
  testCreditOrder: {
    type: "object",
    additionalProperties: false,
    required: ["amount", "idempotencyKey"],
    properties: {
      amount: { type: "integer", enum: [100, 500, 1000, 5000] },
      idempotencyKey: boundedString(160),
    },
  },
  createRoomAction: {
    type: "object",
    additionalProperties: false,
    required: ["title", "coinCost"],
    properties: {
      title: boundedString(80),
      coinCost: { type: "integer", minimum: 1, maximum: 1_000_000 },
      durationLabel: boundedString(60, 0),
    },
  },
  updateRoomAction: {
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: {
      title: boundedString(80),
      coinCost: { type: "integer", minimum: 1, maximum: 1_000_000 },
      durationLabel: {
        anyOf: [boundedString(60, 0), { type: "null" as const }],
      },
      isActive: { type: "boolean" },
      displayOrder: { type: "integer", minimum: 0, maximum: 10_000 },
    },
  },
  reportReview: {
    type: "object",
    additionalProperties: false,
    required: ["status"],
    properties: { status: { type: "string", enum: ["reviewed", "dismissed"] } },
  },
} as const;
